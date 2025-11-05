import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';

interface SimpleApiStackProps extends cdk.StackProps {
  openSearchDomain: opensearch.IDomain;
  vpc: ec2.IVpc;
}

/**
 * Simplified API Stack - OpenSearch k-NN search only
 * No SageMaker needed - embeddings are pre-computed locally
 */
export class SimpleApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: SimpleApiStackProps) {
    super(scope, id, props);

    const { openSearchDomain, vpc } = props;

    // Lambda role
    const lambdaRole = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        OpenSearchAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['es:ESHttpGet', 'es:ESHttpPost'],
              resources: [`${openSearchDomain.domainArn}/*`],
            }),
          ],
        }),
      },
    });

    // Search Lambda (OpenSearch k-NN search with text fallback)
    const searchFunction = new lambda.Function(this, 'SearchFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset('lambda/recommendation-api'),
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        OPENSEARCH_ENDPOINT: openSearchDomain.domainEndpoint,
        OPENSEARCH_INDEX: 'streamsmart-ai-vectors',
      },
      role: lambdaRole,
    });

    // Health check
    const healthFunction = new lambda.Function(this, 'HealthFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromInline(`
import json
from datetime import datetime

def handler(event, context):
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'status': 'healthy',
            'service': 'streamsmart-ai-recommendations',
            'timestamp': datetime.utcnow().isoformat(),
            'mode': 'opensearch-only'
        })
    }
      `),
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(5),
      memorySize: 128,
    });

    // API Gateway
    this.api = new apigateway.RestApi(this, 'API', {
      restApiName: 'StreamSmart AI API (Simplified)',
      deployOptions: {
        stageName: 'prod',
        throttlingBurstLimit: 20,
        throttlingRateLimit: 10,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: [
          'http://localhost:3000',
          'http://localhost:3001',
          'https://*.vercel.app',
          'https://streamsmart.vercel.app',
          // Add your production domain here when deployed
        ],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    const apiV1 = this.api.root.addResource('api').addResource('v1');
    
    // Endpoints
    const recommendResource = apiV1.addResource('recommend');
    recommendResource.addMethod('POST', new apigateway.LambdaIntegration(searchFunction));

    const healthResource = apiV1.addResource('health');
    healthResource.addMethod('GET', new apigateway.LambdaIntegration(healthFunction));

    // Outputs
    new cdk.CfnOutput(this, 'APIEndpoint', {
      value: this.api.url,
      description: 'API endpoint',
      exportName: 'StreamSmartAI-API-Endpoint',
    });

    new cdk.CfnOutput(this, 'RecommendEndpoint', {
      value: `${this.api.url}api/v1/recommend`,
      description: 'Recommendation endpoint',
    });
  }
}
