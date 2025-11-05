import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as path from 'path';

interface MLPipelineStackProps extends cdk.StackProps {
  csvBucket: s3.Bucket;
  openSearchDomain: opensearch.Domain;
  vpc: ec2.Vpc;
}

/**
 * ML Pipeline Stack for StreamSmart
 * Creates SageMaker endpoints for real-time inference and batch processing jobs
 */
export class StreamSmartMLPipelineStack extends cdk.Stack {
  public readonly inferenceEndpoint: sagemaker.CfnEndpoint;
  public readonly processingJob: stepfunctions.StateMachine;

  constructor(scope: Construct, id: string, props: MLPipelineStackProps) {
    super(scope, id, props);

    const { csvBucket, openSearchDomain, vpc } = props;

    // Create IAM role for SageMaker execution
    const sagemakerRole = new iam.Role(this, 'SageMakerExecutionRole', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
      ],
      inlinePolicies: {
        StreamSmartAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:ListBucket',
              ],
              resources: [
                csvBucket.bucketArn,
                `${csvBucket.bucketArn}/*`,
              ],
            }),
            new iam.PolicyStatement({
              actions: [
                'es:ESHttpPost',
                'es:ESHttpPut',
                'es:ESHttpGet',
              ],
              resources: [`${openSearchDomain.domainArn}/*`],
            }),
            new iam.PolicyStatement({
              actions: [
                'ec2:CreateNetworkInterface',
                'ec2:DescribeNetworkInterfaces',
                'ec2:DeleteNetworkInterface',
                'ec2:DescribeSecurityGroups',
                'ec2:DescribeSubnets',
                'ec2:DescribeVpcs',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // Create ECR repository for custom container (if needed)
    const modelRepository = new ecr.Repository(this, 'ModelRepository', {
      repositoryName: 'streamsmart-sentence-transformer',
      lifecycleRules: [{
        maxImageCount: 5, // Keep only last 5 images
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create SageMaker Model
    // For sentence-transformers, we'll use a pre-built container from Hugging Face
    const modelName = 'streamsmart-sentence-transformer-model';
    const model = new sagemaker.CfnModel(this, 'SentenceTransformerModel', {
      modelName,
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        // Using HuggingFace inference container
        image: `763104351884.dkr.ecr.${cdk.Aws.REGION}.amazonaws.com/huggingface-pytorch-inference:2.0.0-transformers4.28.1-cpu-py310-ubuntu20.04`,
        modelDataUrl: `s3://${csvBucket.bucketName}/models/sentence-transformer-model.tar.gz`,
        environment: {
          'HF_MODEL_ID': 'sentence-transformers/all-MiniLM-L6-v2',
          'HF_TASK': 'feature-extraction',
          'SAGEMAKER_CONTAINER_LOG_LEVEL': '20',
          'SAGEMAKER_REGION': cdk.Aws.REGION,
        },
      },
      vpcConfig: {
        subnets: vpc.selectSubnets({
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }).subnetIds,
        securityGroupIds: [
          new ec2.SecurityGroup(this, 'SageMakerSecurityGroup', {
            vpc,
            description: 'Security group for SageMaker endpoints',
            allowAllOutbound: true,
          }).securityGroupId,
        ],
      },
    });

    // Create Endpoint Configuration
    const endpointConfigName = 'streamsmart-endpoint-config';
    const endpointConfig = new sagemaker.CfnEndpointConfig(this, 'EndpointConfig', {
      endpointConfigName,
      productionVariants: [{
        variantName: 'AllTraffic',
        modelName: model.modelName || modelName,
        initialInstanceCount: 1,
        instanceType: 'ml.t2.medium', // Start small, scale as needed
        initialVariantWeight: 1.0,
        // Enable auto-scaling for production
        // serverlessConfig: {
        //   maxConcurrency: 10,
        //   memorySizeInMb: 3072,
        // },
      }],
      dataCaptureConfig: {
        enableCapture: true,
        initialSamplingPercentage: 10, // Capture 10% of requests for monitoring
        destinationS3Uri: `s3://${csvBucket.bucketName}/sagemaker-data-capture/`,
        captureOptions: [
          { captureMode: 'Input' },
          { captureMode: 'Output' },
        ],
        captureContentTypeHeader: {
          jsonContentTypes: ['application/json'],
        },
      },
    });
    endpointConfig.addDependency(model);

    // Create SageMaker Endpoint for real-time inference
    const endpointName = 'streamsmart-inference-endpoint';
    this.inferenceEndpoint = new sagemaker.CfnEndpoint(this, 'InferenceEndpoint', {
      endpointName,
      endpointConfigName: endpointConfig.endpointConfigName || endpointConfigName,
    });
    this.inferenceEndpoint.addDependency(endpointConfig);

    // Create Lambda function for batch processing
    const batchProcessorFunction = new lambda.Function(this, 'BatchProcessor', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/batch-processor')),
      handler: 'index.handler',
      timeout: cdk.Duration.minutes(15),
      memorySize: 3008, // Maximum memory for better performance
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      environment: {
        CSV_BUCKET: csvBucket.bucketName,
        OPENSEARCH_ENDPOINT: openSearchDomain.domainEndpoint,
        SAGEMAKER_ENDPOINT: endpointName,
        OPENSEARCH_INDEX: 'streamsmart-vectors',
        BATCH_SIZE: '100',
      },
      role: new iam.Role(this, 'BatchProcessorRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
        ],
        inlinePolicies: {
          BatchProcessorPolicy: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                actions: [
                  's3:GetObject',
                  's3:ListBucket',
                ],
                resources: [
                  csvBucket.bucketArn,
                  `${csvBucket.bucketArn}/*`,
                ],
              }),
              new iam.PolicyStatement({
                actions: [
                  'sagemaker:InvokeEndpoint',
                ],
                resources: [
                  `arn:aws:sagemaker:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:endpoint/${endpointName}`,
                ],
              }),
              new iam.PolicyStatement({
                actions: [
                  'es:ESHttpPost',
                  'es:ESHttpPut',
                  'es:ESHttpDelete',
                ],
                resources: [`${openSearchDomain.domainArn}/*`],
              }),
            ],
          }),
        },
      }),
    });

    // Grant permissions
    csvBucket.grantRead(batchProcessorFunction);

    // Create Step Functions state machine for orchestrating batch processing
    const startProcessingTask = new sfnTasks.LambdaInvoke(this, 'StartBatchProcessing', {
      lambdaFunction: batchProcessorFunction,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const checkCompletionTask = new stepfunctions.Wait(this, 'WaitForProcessing', {
      time: stepfunctions.WaitTime.duration(cdk.Duration.minutes(1)),
    });

    const successState = new stepfunctions.Succeed(this, 'ProcessingComplete', {
      comment: 'Batch processing completed successfully',
    });

    const failureState = new stepfunctions.Fail(this, 'ProcessingFailed', {
      comment: 'Batch processing failed',
    });

    const definition = startProcessingTask
      .next(new stepfunctions.Choice(this, 'CheckStatus')
        .when(stepfunctions.Condition.stringEquals('$.status', 'SUCCESS'), successState)
        .when(stepfunctions.Condition.stringEquals('$.status', 'FAILED'), failureState)
        .otherwise(checkCompletionTask.next(startProcessingTask))
      );

    this.processingJob = new stepfunctions.StateMachine(this, 'BatchProcessingStateMachine', {
      definitionBody: stepfunctions.DefinitionBody.fromChainable(definition),
      timeout: cdk.Duration.hours(2),
      tracingEnabled: true,
      logs: {
        destination: new cdk.aws_logs.LogGroup(this, 'StateMachineLogGroup', {
          retention: cdk.aws_logs.RetentionDays.ONE_WEEK,
        }),
        level: stepfunctions.LogLevel.ALL,
      },
    });

    // Create EventBridge rule to trigger batch processing periodically
    const batchProcessingRule = new events.Rule(this, 'BatchProcessingSchedule', {
      schedule: events.Schedule.rate(cdk.Duration.days(1)), // Run daily
      description: 'Trigger batch processing for video embeddings',
    });

    batchProcessingRule.addTarget(new targets.SfnStateMachine(this.processingJob, {
      input: events.RuleTargetInput.fromObject({
        source: 'scheduled',
        timestamp: events.EventField.time,
      }),
    }));

    // Outputs
    new cdk.CfnOutput(this, 'SageMakerEndpointName', {
      value: this.inferenceEndpoint.endpointName || endpointName,
      description: 'SageMaker endpoint for real-time inference',
      exportName: 'StreamSmart-SageMakerEndpoint',
    });

    new cdk.CfnOutput(this, 'BatchProcessingStateMachineArn', {
      value: this.processingJob.stateMachineArn,
      description: 'Step Functions state machine for batch processing',
      exportName: 'StreamSmart-BatchProcessingStateMachine',
    });

    new cdk.CfnOutput(this, 'ModelRepositoryUri', {
      value: modelRepository.repositoryUri,
      description: 'ECR repository for ML models',
      exportName: 'StreamSmart-ModelRepository',
    });

    // Add tags
    cdk.Tags.of(this).add('CostCenter', 'StreamSmart-ML');
    cdk.Tags.of(this).add('MLFramework', 'SentenceTransformers');
  }
}
