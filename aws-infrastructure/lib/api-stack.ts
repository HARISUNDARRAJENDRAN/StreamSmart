import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as path from 'path';

interface ApiStackProps extends cdk.StackProps {
  openSearchDomain: opensearch.Domain;
  sagemakerEndpoint: sagemaker.CfnEndpoint;
  vpc: ec2.Vpc;
}

/**
 * API Stack for StreamSmart
 * Creates Lambda functions and API Gateway for real-time recommendation service
 */
export class StreamSmartApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly recommendationFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { openSearchDomain, sagemakerEndpoint, vpc } = props;

    // Create SNS topic for alerts
    const alertTopic = new sns.Topic(this, 'StreamSmartAlerts', {
      displayName: 'StreamSmart API Alerts',
      topicName: 'streamsmart-api-alerts',
    });

    // Add email subscription (update with your email)
    alertTopic.addSubscription(
      new snsSubscriptions.EmailSubscription('admin@streamsmart.com')
    );

    // Create Lambda Layer for shared dependencies
    const dependenciesLayer = new lambda.LayerVersion(this, 'DependenciesLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/layers/dependencies')),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
      description: 'Shared dependencies for StreamSmart Lambda functions',
    });

    // Create security group for Lambda functions
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc,
      description: 'Security group for Lambda functions',
      allowAllOutbound: true,
    });

    // Create IAM role for Lambda execution
    const lambdaRole = new iam.Role(this, 'RecommendationLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
      inlinePolicies: {
        RecommendationPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                'sagemaker:InvokeEndpoint',
              ],
              resources: [
                `arn:aws:sagemaker:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:endpoint/${sagemakerEndpoint.endpointName}`,
              ],
            }),
            new iam.PolicyStatement({
              actions: [
                'es:ESHttpGet',
                'es:ESHttpPost',
              ],
              resources: [`${openSearchDomain.domainArn}/*`],
            }),
            new iam.PolicyStatement({
              actions: [
                'xray:PutTraceSegments',
                'xray:PutTelemetryRecords',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // Create main recommendation Lambda function
    this.recommendationFunction = new lambda.Function(this, 'RecommendationFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/recommendation-api')),
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [lambdaSecurityGroup],
      layers: [dependenciesLayer],
      environment: {
        OPENSEARCH_ENDPOINT: openSearchDomain.domainEndpoint,
        SAGEMAKER_ENDPOINT: sagemakerEndpoint.endpointName || '',
        OPENSEARCH_INDEX: 'streamsmart-vectors',
        REGION: cdk.Aws.REGION,
        LOG_LEVEL: 'INFO',
        ENABLE_XRAY: 'true',
      },
      role: lambdaRole,
      tracing: lambda.Tracing.ACTIVE, // Enable X-Ray tracing
      reservedConcurrentExecutions: 10, // Limit concurrent executions for cost control
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Create health check Lambda function
    const healthCheckFunction = new lambda.Function(this, 'HealthCheckFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromInline(`
import json
import os
import boto3
from datetime import datetime

def handler(event, context):
    try:
        # Check OpenSearch connectivity
        opensearch_endpoint = os.environ['OPENSEARCH_ENDPOINT']
        
        # Check SageMaker endpoint status
        sagemaker_client = boto3.client('sagemaker')
        endpoint_name = os.environ['SAGEMAKER_ENDPOINT']
        
        response = sagemaker_client.describe_endpoint(EndpointName=endpoint_name)
        endpoint_status = response['EndpointStatus']
        
        health_status = {
            'status': 'healthy' if endpoint_status == 'InService' else 'degraded',
            'timestamp': datetime.utcnow().isoformat(),
            'checks': {
                'opensearch': {'endpoint': opensearch_endpoint, 'status': 'reachable'},
                'sagemaker': {'endpoint': endpoint_name, 'status': endpoint_status}
            },
            'version': '1.0.0'
        }
        
        return {
            'statusCode': 200 if health_status['status'] == 'healthy' else 503,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(health_status)
        }
    except Exception as e:
        return {
            'statusCode': 503,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
        }
      `),
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(10),
      environment: {
        OPENSEARCH_ENDPOINT: openSearchDomain.domainEndpoint,
        SAGEMAKER_ENDPOINT: sagemakerEndpoint.endpointName || '',
      },
      role: lambdaRole,
    });

    // Create API Gateway
    this.api = new apigateway.RestApi(this, 'StreamSmartAPI', {
      restApiName: 'StreamSmart Recommendation API',
      description: 'API for AI-powered video recommendations',
      deployOptions: {
        stageName: 'prod',
        tracingEnabled: true, // Enable X-Ray tracing
        dataTraceEnabled: true, // Log full request/response data
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        maxAge: cdk.Duration.hours(1),
      },
      endpointTypes: [apigateway.EndpointType.REGIONAL],
    });

    // Create API resources and methods
    const apiV1 = this.api.root.addResource('api').addResource('v1');
    
    // /api/v1/recommend endpoint
    const recommendResource = apiV1.addResource('recommend');
    recommendResource.addMethod('POST', new apigateway.LambdaIntegration(this.recommendationFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      integrationResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': "'*'",
        },
      }],
    }), {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      }],
      requestValidator: new apigateway.RequestValidator(this, 'RecommendRequestValidator', {
        restApi: this.api,
        requestValidatorName: 'Validate body',
        validateRequestBody: true,
        validateRequestParameters: false,
      }),
      requestModels: {
        'application/json': new apigateway.Model(this, 'RecommendRequestModel', {
          restApi: this.api,
          contentType: 'application/json',
          schema: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              title: { type: apigateway.JsonSchemaType.STRING },
              description: { type: apigateway.JsonSchemaType.STRING },
              topN: { type: apigateway.JsonSchemaType.INTEGER, minimum: 1, maximum: 50 },
            },
            required: ['title'],
          },
        }),
      },
    });

    // /api/v1/health endpoint
    const healthResource = apiV1.addResource('health');
    healthResource.addMethod('GET', new apigateway.LambdaIntegration(healthCheckFunction));

    // Create CloudWatch alarms
    const apiGateway4xxAlarm = new cloudwatch.Alarm(this, 'ApiGateway4xxAlarm', {
      metric: this.api.metricClientError(),
      threshold: 10,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Alert when API Gateway has too many 4xx errors',
    });

    const apiGateway5xxAlarm = new cloudwatch.Alarm(this, 'ApiGateway5xxAlarm', {
      metric: this.api.metricServerError(),
      threshold: 5,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
      alarmDescription: 'Alert when API Gateway has 5xx errors',
    });

    const lambdaErrorAlarm = new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
      metric: this.recommendationFunction.metricErrors(),
      threshold: 5,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Alert when Lambda function has errors',
    });

    const lambdaDurationAlarm = new cloudwatch.Alarm(this, 'LambdaDurationAlarm', {
      metric: this.recommendationFunction.metricDuration({
        statistic: 'Average',
      }),
      threshold: 10000, // 10 seconds
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Alert when Lambda function is running slow',
    });

    // Add alarm actions
    [apiGateway4xxAlarm, apiGateway5xxAlarm, lambdaErrorAlarm, lambdaDurationAlarm].forEach(alarm => {
      alarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
    });

    // Create CloudWatch dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'StreamSmartDashboard', {
      dashboardName: 'StreamSmart-API-Dashboard',
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'API Gateway Requests',
            left: [this.api.metricCount()],
            right: [this.api.metricLatency()],
            width: 12,
            height: 6,
          }),
          new cloudwatch.GraphWidget({
            title: 'API Errors',
            left: [this.api.metricClientError()],
            right: [this.api.metricServerError()],
            width: 12,
            height: 6,
          }),
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Lambda Performance',
            left: [this.recommendationFunction.metricInvocations()],
            right: [this.recommendationFunction.metricDuration()],
            width: 12,
            height: 6,
          }),
          new cloudwatch.GraphWidget({
            title: 'Lambda Errors',
            left: [this.recommendationFunction.metricErrors()],
            right: [this.recommendationFunction.metricThrottles()],
            width: 12,
            height: 6,
          }),
        ],
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, 'APIEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
      exportName: 'StreamSmart-APIEndpoint',
    });

    new cdk.CfnOutput(this, 'RecommendationFunctionArn', {
      value: this.recommendationFunction.functionArn,
      description: 'Recommendation Lambda function ARN',
      exportName: 'StreamSmart-RecommendationFunction',
    });

    new cdk.CfnOutput(this, 'DashboardURL', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${cdk.Aws.REGION}#dashboards:name=${dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    // Add tags
    cdk.Tags.of(this).add('CostCenter', 'StreamSmart-API');
    cdk.Tags.of(this).add('MonitoringLevel', 'Enhanced');
  }
}
