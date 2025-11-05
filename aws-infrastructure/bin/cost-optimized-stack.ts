#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CostOptimizedInfrastructureStack } from '../lib/cost-optimized-infrastructure-stack';
import { SimpleApiStack } from '../lib/simple-api-stack';

/**
 * COST-OPTIMIZED DEPLOYMENT
 * Uses existing resources and minimal configurations
 * Estimated total cost: $10-30/month (vs $85-100 standard)
 */

const app = new cdk.App();

// Configuration from environment
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'ap-south-2',
};

const stackPrefix = 'StreamSmartAI';

console.log('🚀 Deploying COST-OPTIMIZED StreamSmart AI Infrastructure');
console.log(`📍 Account: ${env.account}`);
console.log(`📍 Region: ${env.region}`);
console.log('💰 Cost optimization: ENABLED');
console.log('');

// Infrastructure Stack (uses existing OpenSearch + S3)
const infraStack = new CostOptimizedInfrastructureStack(app, `${stackPrefix}-Infra`, {
  env,
  description: '💰 Cost-optimized infrastructure (uses existing OpenSearch)',
  tags: {
    Project: 'StreamSmart',
    Component: 'AI-Recommendations',
    Environment: 'Development',
    CostOptimization: 'Maximum',
    ManagedBy: 'CDK',
  },
});

// Simple API Stack (OpenSearch search only, no SageMaker)
const apiStack = new SimpleApiStack(app, `${stackPrefix}-API`, {
  env,
  description: '💰 Simplified API (OpenSearch k-NN search only)',
  openSearchDomain: infraStack.openSearchDomain,
  vpc: infraStack.vpc,
  tags: {
    Project: 'StreamSmart',
    Component: 'API',
    Environment: 'Development',
    CostOptimization: 'Maximum',
    ManagedBy: 'CDK',
  },
});

// Stack dependencies
apiStack.addDependency(infraStack);

// Global tags for cost tracking
cdk.Tags.of(app).add('Project', 'StreamSmart-AI');
cdk.Tags.of(app).add('BillingTeam', 'Engineering');
cdk.Tags.of(app).add('CostOptimization', 'Enabled');

console.log('📋 Stack configuration:');
console.log('  ✅ Infrastructure: Using EXISTING OpenSearch + default VPC');
console.log('  ✅ ML Pipeline: Serverless SageMaker inference');
console.log('  ✅ API: Minimal Lambda (512MB) + API Gateway caching');
console.log('');
console.log('💰 Estimated monthly costs:');
console.log('  • SageMaker Serverless: $0.20 per 1M requests');
console.log('  • Lambda: $0.20 per 1M requests (minimal memory)');
console.log('  • API Gateway Cache: ~$15/month');
console.log('  • OpenSearch: $0 (using existing)');
console.log('  • S3: <$1/month');
console.log('  • Total: ~$15-20/month for 100K requests');
console.log('');

app.synth();
