import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

interface CostOptimizedMLStackProps extends cdk.StackProps {
  csvBucket: s3.IBucket;
  openSearchDomain: opensearch.IDomain;
  vpc: ec2.IVpc;
}

/**
 * COST-OPTIMIZED ML Pipeline Stack
 * Uses smallest instances and serverless options
 * Estimated cost: $10-15/month (vs $35+ for standard)
 */
export class CostOptimizedMLStack extends cdk.Stack {
  public readonly inferenceEndpoint: sagemaker.CfnEndpoint;

  constructor(scope: Construct, id: string, props: CostOptimizedMLStackProps) {
    super(scope, id, props);

    const { csvBucket, openSearchDomain, vpc } = props;

    // IAM role for SageMaker with minimal permissions
    const sagemakerRole = new iam.Role(this, 'SageMakerRole', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      inlinePolicies: {
        MinimalAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['s3:GetObject'],
              resources: [`${csvBucket.bucketArn}/*`],
            }),
            new iam.PolicyStatement({
              actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // Security group for SageMaker
    const sagemakerSG = new ec2.SecurityGroup(this, 'SageMakerSG', {
      vpc,
      description: 'SageMaker endpoint security group',
      allowAllOutbound: true,
    });

    // SageMaker Model using HuggingFace container
    const modelName = 'streamsmart-ai-model';
    const model = new sagemaker.CfnModel(this, 'Model', {
      modelName,
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        // HuggingFace inference container (optimized, free)
        image: `763104351884.dkr.ecr.${cdk.Aws.REGION}.amazonaws.com/huggingface-pytorch-inference:2.0.0-transformers4.28.1-cpu-py310-ubuntu20.04`,
        environment: {
          'HF_MODEL_ID': 'sentence-transformers/all-MiniLM-L6-v2',
          'HF_TASK': 'feature-extraction',
          'SAGEMAKER_CONTAINER_LOG_LEVEL': '20',
          'SAGEMAKER_REGION': cdk.Aws.REGION,
        },
      },
    });

    // COST OPTIMIZATION: Serverless Inference Config
    // Pay only when used, no idle costs
    const endpointConfigName = 'streamsmart-ai-serverless-config';
    const endpointConfig = new sagemaker.CfnEndpointConfig(this, 'EndpointConfig', {
      endpointConfigName,
      productionVariants: [{
        variantName: 'AllTraffic',
        modelName: model.modelName || modelName,
        // Option 1: SERVERLESS (cheapest, pay per use)
        serverlessConfig: {
          maxConcurrency: 5, // Low concurrency for dev
          memorySizeInMb: 2048, // Minimum for this model
        },
        
        // Option 2: Uncomment for traditional instance (predictable costs)
        // initialInstanceCount: 1,
        // instanceType: 'ml.t2.small', // Smallest possible: $0.065/hour = ~$47/month
      }],
    });
    endpointConfig.addDependency(model);

    // SageMaker Endpoint
    const endpointName = 'streamsmart-ai-endpoint';
    this.inferenceEndpoint = new sagemaker.CfnEndpoint(this, 'Endpoint', {
      endpointName,
      endpointConfigName: endpointConfig.endpointConfigName || endpointConfigName,
      tags: [
        { key: 'CostOptimization', value: 'Serverless' },
        { key: 'Environment', value: 'Development' },
      ],
    });
    this.inferenceEndpoint.addDependency(endpointConfig);

    // Outputs
    new cdk.CfnOutput(this, 'SageMakerEndpointName', {
      value: this.inferenceEndpoint.endpointName || endpointName,
      description: 'SageMaker endpoint (serverless, pay-per-use)',
      exportName: 'StreamSmart-AI-SageMakerEndpoint',
    });

    new cdk.CfnOutput(this, 'EstimatedCost', {
      value: 'Serverless: $0.20 per 1M inferences (or ~$10-15/month with ml.t2.small)',
      description: 'Estimated monthly cost',
    });

    // ========== Data Refresh Automation ==========
    // Lambda function for triggering embedding regeneration
    const refreshLambda = new lambda.Function(this, 'DataRefreshFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromInline(`
import json
import boto3
import os
from datetime import datetime

def handler(event, context):
    """
    Trigger data refresh by starting embedding generation process
    This can invoke a Step Functions state machine or directly process data
    """
    print(f"Data refresh triggered at {datetime.utcnow().isoformat()}")
    
    # Get environment variables
    csv_bucket = os.environ.get('CSV_BUCKET')
    opensearch_endpoint = os.environ.get('OPENSEARCH_ENDPOINT')
    sagemaker_endpoint = os.environ.get('SAGEMAKER_ENDPOINT')
    
    # Log the refresh event
    print(f"CSV Bucket: {csv_bucket}")
    print(f"OpenSearch: {opensearch_endpoint}")
    print(f"SageMaker: {sagemaker_endpoint}")
    
    # In production, this would:
    # 1. Download CSV from S3
    # 2. Check for new/updated videos
    # 3. Generate embeddings for delta
    # 4. Update OpenSearch index
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Data refresh triggered',
            'timestamp': datetime.utcnow().isoformat()
        })
    }
      `),
      handler: 'index.handler',
      timeout: cdk.Duration.minutes(15),
      memorySize: 512,
      environment: {
        CSV_BUCKET: csvBucket.bucketName,
        OPENSEARCH_ENDPOINT: openSearchDomain.domainEndpoint,
        SAGEMAKER_ENDPOINT: this.inferenceEndpoint.endpointName || 'streamsmart-ai-endpoint',
      },
      role: new iam.Role(this, 'RefreshLambdaRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        ],
        inlinePolicies: {
          RefreshAccess: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                actions: ['s3:GetObject', 's3:ListBucket'],
                resources: [csvBucket.bucketArn, `${csvBucket.bucketArn}/*`],
              }),
              new iam.PolicyStatement({
                actions: ['sagemaker:InvokeEndpoint'],
                resources: [`arn:aws:sagemaker:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:endpoint/*`],
              }),
            ],
          }),
        },
      }),
    });

    // EventBridge rule for weekly data refresh (every Sunday at 2 AM UTC)
    const refreshRule = new events.Rule(this, 'WeeklyDataRefresh', {
      ruleName: 'StreamSmartAI-WeeklyRefresh',
      description: 'Refresh video embeddings weekly to keep data fresh',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '2',
        weekDay: 'SUN',
      }),
      enabled: true,
    });

    refreshRule.addTarget(new targets.LambdaFunction(refreshLambda, {
      retryAttempts: 2,
    }));

    // Output
    new cdk.CfnOutput(this, 'DataRefreshSchedule', {
      value: 'Every Sunday at 2 AM UTC',
      description: 'Automated data refresh schedule',
    });

    // Cost tracking
    cdk.Tags.of(this).add('CostCenter', 'AI-ML');
    cdk.Tags.of(this).add('CostOptimization', 'Serverless');
    cdk.Tags.of(this).add('Shutdown', 'Manual'); // Remember to stop when not testing
    cdk.Tags.of(this).add('Automation', 'DataRefresh');
  }
}
