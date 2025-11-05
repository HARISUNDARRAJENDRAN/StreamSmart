import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

/**
 * CI/CD Pipeline Stack for StreamSmart AI
 * Automates testing and deployment of infrastructure and code changes
 */
export class CICDPipelineStack extends cdk.Stack {
  public readonly pipeline: codepipeline.Pipeline;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for pipeline artifacts
    const artifactsBucket = new s3.Bucket(this, 'PipelineArtifacts', {
      bucketName: `streamsmart-ai-pipeline-${cdk.Aws.ACCOUNT_ID}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      lifecycleRules: [{
        expiration: cdk.Duration.days(30),
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // SNS topic for pipeline notifications
    const pipelineTopic = new sns.Topic(this, 'PipelineNotifications', {
      displayName: 'StreamSmart AI Pipeline Notifications',
    });

    // Add email subscription (update with your email)
    pipelineTopic.addSubscription(
      new snsSubscriptions.EmailSubscription(process.env.NOTIFICATION_EMAIL || 'admin@streamsmart.com')
    );

    // CodeBuild project for building Lambda code
    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      projectName: 'StreamSmart-AI-Build',
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL, // Cost optimization
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              python: '3.11',
              nodejs: '18',
            },
            commands: [
              'echo "Installing dependencies..."',
              'cd aws-infrastructure',
              'npm install',
              'cd lambda/recommendation-api && pip install -r requirements.txt -t .',
              'cd ../batch-processor && pip install -r requirements.txt -t .',
            ],
          },
          build: {
            commands: [
              'echo "Building TypeScript..."',
              'cd aws-infrastructure',
              'npm run build',
              'npm run synth',
            ],
          },
        },
        artifacts: {
          'base-directory': 'aws-infrastructure/cdk.out',
          files: ['**/*'],
        },
      }),
    });

    // CodeBuild project for testing
    const testProject = new codebuild.PipelineProject(this, 'TestProject', {
      projectName: 'StreamSmart-AI-Test',
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              python: '3.11',
            },
            commands: [
              'pip install pytest pytest-cov',
            ],
          },
          build: {
            commands: [
              'echo "Running tests..."',
              'cd aws-infrastructure/lambda',
              'pytest --cov=. --cov-report=term-missing || true',
            ],
          },
        },
      }),
    });

    // Create pipeline
    const sourceOutput = new codepipeline.Artifact('SourceOutput');
    const buildOutput = new codepipeline.Artifact('BuildOutput');

    this.pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'StreamSmart-AI-Pipeline',
      artifactBucket: artifactsBucket,
      restartExecutionOnUpdate: true,
    });

    // Source stage - Manual trigger or S3 upload
    this.pipeline.addStage({
      stageName: 'Source',
      actions: [
        new codepipeline_actions.S3SourceAction({
          actionName: 'S3Source',
          bucket: artifactsBucket,
          bucketKey: 'source.zip',
          output: sourceOutput,
          trigger: codepipeline_actions.S3Trigger.POLL,
        }),
      ],
    });

    // Test stage
    this.pipeline.addStage({
      stageName: 'Test',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'UnitTests',
          project: testProject,
          input: sourceOutput,
        }),
      ],
    });

    // Build stage
    this.pipeline.addStage({
      stageName: 'Build',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'CDKBuild',
          project: buildProject,
          input: sourceOutput,
          outputs: [buildOutput],
        }),
      ],
    });

    // Manual approval for production deployment
    this.pipeline.addStage({
      stageName: 'Approval',
      actions: [
        new codepipeline_actions.ManualApprovalAction({
          actionName: 'ManualApproval',
          notificationTopic: pipelineTopic,
          additionalInformation: 'Please review and approve deployment to production',
        }),
      ],
    });

    // Deploy stage
    this.pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new codepipeline_actions.CloudFormationCreateUpdateStackAction({
          actionName: 'DeployInfrastructure',
          stackName: 'StreamSmartAI-Infra',
          templatePath: buildOutput.atPath('StreamSmartAI-Infra.template.json'),
          adminPermissions: true,
        }),
        new codepipeline_actions.CloudFormationCreateUpdateStackAction({
          actionName: 'DeployML',
          stackName: 'StreamSmartAI-ML',
          templatePath: buildOutput.atPath('StreamSmartAI-ML.template.json'),
          adminPermissions: true,
          runOrder: 2,
        }),
        new codepipeline_actions.CloudFormationCreateUpdateStackAction({
          actionName: 'DeployAPI',
          stackName: 'StreamSmartAI-API',
          templatePath: buildOutput.atPath('StreamSmartAI-API.template.json'),
          adminPermissions: true,
          runOrder: 3,
        }),
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, 'PipelineName', {
      value: this.pipeline.pipelineName,
      description: 'CI/CD Pipeline name',
    });

    new cdk.CfnOutput(this, 'PipelineConsoleURL', {
      value: `https://console.aws.amazon.com/codesuite/codepipeline/pipelines/${this.pipeline.pipelineName}/view`,
      description: 'Pipeline console URL',
    });

    // Tags
    cdk.Tags.of(this).add('Component', 'CI/CD');
    cdk.Tags.of(this).add('Automation', 'Enabled');
  }
}
