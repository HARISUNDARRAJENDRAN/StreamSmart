import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

/**
 * COST-OPTIMIZED Infrastructure Stack
 * Uses existing resources where possible to minimize costs
 */
export class CostOptimizedInfrastructureStack extends cdk.Stack {
  public readonly csvBucket: s3.IBucket;
  public readonly openSearchDomain: opensearch.IDomain;
  public readonly vpc: ec2.IVpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Use EXISTING OpenSearch domain (NO additional cost)
    const existingOpenSearchEndpoint = process.env.EXISTING_OPENSEARCH_ENDPOINT || 
      'search-streamsmart-search-h7nvtdclcuojbv243vua5cqlc4.ap-south-2.es.amazonaws.com';
    
    this.openSearchDomain = opensearch.Domain.fromDomainEndpoint(
      this,
      'ExistingOpenSearch',
      `https://${existingOpenSearchEndpoint}`
    );

    cdk.Tags.of(this.openSearchDomain).add('CostOptimization', 'UsingExisting');

    // Use EXISTING S3 bucket or create minimal one
    const existingBucketName = process.env.EXISTING_S3_BUCKET;
    
    if (existingBucketName) {
      // Use existing bucket (NO additional cost)
      this.csvBucket = s3.Bucket.fromBucketName(
        this,
        'ExistingCSVBucket',
        existingBucketName
      );
    } else {
      // Create new bucket with cost-optimized settings
      this.csvBucket = new s3.Bucket(this, 'CSVBucket', {
        bucketName: `streamsmart-ai-csv-${cdk.Aws.ACCOUNT_ID}`,
        encryption: s3.BucketEncryption.S3_MANAGED, // Free (vs KMS)
        versioned: false, // Saves storage costs
        lifecycleRules: [
          {
            id: 'DeleteOldVersions',
            expiration: cdk.Duration.days(90), // Auto-cleanup
            abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
          },
        ],
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.DESTROY, // Easy cleanup
        autoDeleteObjects: true,
      });
    }

    // Use DEFAULT VPC (NO additional cost for NAT Gateway, etc.)
    this.vpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', {
      isDefault: true,
    });

    cdk.Tags.of(this.vpc).add('CostOptimization', 'UsingDefault');

    // Outputs
    new cdk.CfnOutput(this, 'CSVBucketName', {
      value: this.csvBucket.bucketName,
      description: 'S3 bucket for CSV data',
      exportName: 'StreamSmart-AI-CSVBucket',
    });

    new cdk.CfnOutput(this, 'OpenSearchEndpoint', {
      value: existingOpenSearchEndpoint,
      description: 'OpenSearch domain endpoint (existing)',
      exportName: 'StreamSmart-AI-OpenSearchEndpoint',
    });

    new cdk.CfnOutput(this, 'VPCId', {
      value: this.vpc.vpcId,
      description: 'VPC ID (default VPC)',
      exportName: 'StreamSmart-AI-VPCId',
    });

    // Cost tracking tags
    cdk.Tags.of(this).add('Project', 'StreamSmart-AI');
    cdk.Tags.of(this).add('Environment', 'Development');
    cdk.Tags.of(this).add('CostCenter', 'AI-Recommendations');
    cdk.Tags.of(this).add('CostOptimization', 'Enabled');
  }
}
