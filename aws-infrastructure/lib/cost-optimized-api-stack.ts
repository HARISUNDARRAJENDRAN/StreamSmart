import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';

interface CostOptimizedApiStackProps extends cdk.StackProps {
  openSearchDomain: opensearch.IDomain;
  sagemakerEndpoint: sagemaker.CfnEndpoint;
  vpc: ec2.IVpc;
}

/**
 * COST-OPTIMIZED API Stack
 * Minimal Lambda resources, aggressive caching
 * Estimated cost: $1-2/month for low traffic
 */
export class CostOptimizedApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly recommendationFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: CostOptimizedApiStackProps) {
    super(scope, id, props);

    const { openSearchDomain, sagemakerEndpoint, vpc } = props;

    // IAM role with minimal permissions
    const lambdaRole = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        MinimalAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['sagemaker:InvokeEndpoint'],
              resources: [
                `arn:aws:sagemaker:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:endpoint/${sagemakerEndpoint.endpointName}`,
              ],
            }),
            new iam.PolicyStatement({
              actions: ['es:ESHttpGet', 'es:ESHttpPost'],
              resources: [`${openSearchDomain.domainArn}/*`],
            }),
          ],
        }),
      },
    });

    // Lambda function with MINIMAL resources
    this.recommendationFunction = new lambda.Function(this, 'RecommendFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/recommendation-api')),
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30), // Minimal timeout
      memorySize: 512, // Minimal memory (vs 1024 standard)
      environment: {
        OPENSEARCH_ENDPOINT: openSearchDomain.domainEndpoint.replace('https://', ''),
        SAGEMAKER_ENDPOINT: sagemakerEndpoint.endpointName || 'streamsmart-ai-endpoint',
        OPENSEARCH_INDEX: 'streamsmart-ai-vectors',
        REGION: cdk.Aws.REGION,
        LOG_LEVEL: 'WARNING', // Less logging = less CloudWatch costs
      },
      role: lambdaRole,
      reservedConcurrentExecutions: 5, // Limit concurrent runs
      logRetention: logs.RetentionDays.ONE_DAY, // Minimal log retention
    });

    // Health check Lambda (even lighter)
    const healthCheckFunction = new lambda.Function(this, 'HealthCheckFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromInline(`
import json
import os
from datetime import datetime

def handler(event, context):
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'status': 'healthy',
            'service': 'streamsmart-ai-recommendations',
            'timestamp': datetime.utcnow().isoformat(),
            'endpoint': os.environ.get('SAGEMAKER_ENDPOINT', 'unknown')
        })
    }
      `),
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(5),
      memorySize: 128, // Absolute minimum
      environment: {
        SAGEMAKER_ENDPOINT: sagemakerEndpoint.endpointName || 'streamsmart-ai-endpoint',
      },
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    // API Gateway with AGGRESSIVE CACHING (reduces Lambda invocations)
    this.api = new apigateway.RestApi(this, 'API', {
      restApiName: 'StreamSmart AI Recommendations',
      description: 'Cost-optimized AI recommendation API',
      deployOptions: {
        stageName: 'prod',
        cachingEnabled: true, // Enable caching to reduce costs
        cacheClusterSize: '0.5', // Smallest cache: $0.02/hour = ~$15/month
        cacheTtl: cdk.Duration.hours(1), // Cache for 1 hour
        cacheDataEncrypted: false, // Save costs
        throttlingBurstLimit: 20, // Low limits for dev
        throttlingRateLimit: 10,
        loggingLevel: apigateway.MethodLoggingLevel.ERROR, // Minimal logging
        dataTraceEnabled: false, // Save CloudWatch costs
        metricsEnabled: false, // Disable detailed metrics
      },
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:3000', 'http://localhost:3001'], // Only localhost for dev
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: cdk.Duration.hours(1),
      },
      endpointTypes: [apigateway.EndpointType.REGIONAL],
    });

    // API resources
    const apiV1 = this.api.root.addResource('api').addResource('v1');
    
    // Recommendation endpoint with caching
    const recommendResource = apiV1.addResource('recommend');
    recommendResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(this.recommendationFunction, {
        cacheKeyParameters: ['method.request.body'], // Cache by request body
        cacheNamespace: 'recommendations',
      }),
      {
        requestValidator: new apigateway.RequestValidator(this, 'RequestValidator', {
          restApi: this.api,
          validateRequestBody: true,
        }),
        requestModels: {
          'application/json': new apigateway.Model(this, 'RequestModel', {
            restApi: this.api,
            contentType: 'application/json',
            schema: {
              type: apigateway.JsonSchemaType.OBJECT,
              properties: {
                title: { type: apigateway.JsonSchemaType.STRING, minLength: 1 },
                description: { type: apigateway.JsonSchemaType.STRING },
                topN: { type: apigateway.JsonSchemaType.INTEGER, minimum: 1, maximum: 20 },
              },
              required: ['title'],
            },
          }),
        },
      }
    );

    // Health check endpoint (lightweight, no caching needed)
    const healthResource = apiV1.addResource('health');
    healthResource.addMethod('GET', new apigateway.LambdaIntegration(healthCheckFunction));

    // Outputs
    new cdk.CfnOutput(this, 'APIEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint with caching enabled',
      exportName: 'StreamSmart-AI-APIEndpoint',
    });

    new cdk.CfnOutput(this, 'RecommendationEndpoint', {
      value: `${this.api.url}api/v1/recommend`,
      description: 'Full recommendation endpoint URL',
    });

    new cdk.CfnOutput(this, 'HealthCheckEndpoint', {
      value: `${this.api.url}api/v1/health`,
      description: 'Health check endpoint',
    });

    new cdk.CfnOutput(this, 'EstimatedAPICost', {
      value: 'Lambda: ~$0.20/100K requests + Cache: ~$15/month',
      description: 'Estimated API cost',
    });

    // Cost tracking
    cdk.Tags.of(this).add('CostCenter', 'AI-API');
    cdk.Tags.of(this).add('CostOptimization', 'MaxCaching');
  }
}
