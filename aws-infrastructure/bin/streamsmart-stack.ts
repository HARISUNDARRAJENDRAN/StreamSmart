#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StreamSmartInfrastructureStack } from '../lib/infrastructure-stack';
import { StreamSmartMLPipelineStack } from '../lib/ml-pipeline-stack';
import { StreamSmartApiStack } from '../lib/api-stack';

const app = new cdk.App();

// Get configuration from environment or use defaults
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const stackPrefix = 'StreamSmart';

// Phase 1: Core Infrastructure (S3, OpenSearch, VPC, etc.)
const infrastructureStack = new StreamSmartInfrastructureStack(app, `${stackPrefix}-Infrastructure`, {
  env,
  description: 'StreamSmart core AWS infrastructure - S3, OpenSearch, VPC, and networking',
  tags: {
    Project: 'StreamSmart',
    Environment: 'Production',
    ManagedBy: 'CDK',
    Component: 'Infrastructure',
  },
});

// Phase 2: ML Pipeline (SageMaker, Batch Processing)
const mlPipelineStack = new StreamSmartMLPipelineStack(app, `${stackPrefix}-MLPipeline`, {
  env,
  description: 'StreamSmart ML pipeline - SageMaker endpoints and batch processing',
  csvBucket: infrastructureStack.csvBucket,
  openSearchDomain: infrastructureStack.openSearchDomain,
  vpc: infrastructureStack.vpc,
  tags: {
    Project: 'StreamSmart',
    Environment: 'Production',
    ManagedBy: 'CDK',
    Component: 'MLPipeline',
  },
});

// Phase 3: API Layer (Lambda, API Gateway)
const apiStack = new StreamSmartApiStack(app, `${stackPrefix}-API`, {
  env,
  description: 'StreamSmart API layer - Lambda functions and API Gateway',
  openSearchDomain: infrastructureStack.openSearchDomain,
  sagemakerEndpoint: mlPipelineStack.inferenceEndpoint,
  vpc: infrastructureStack.vpc,
  tags: {
    Project: 'StreamSmart',
    Environment: 'Production',
    ManagedBy: 'CDK',
    Component: 'API',
  },
});

// Add stack dependencies
mlPipelineStack.addDependency(infrastructureStack);
apiStack.addDependency(mlPipelineStack);

// Output important information
app.synth();
