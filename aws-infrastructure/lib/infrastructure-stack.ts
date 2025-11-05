import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';

/**
 * Core Infrastructure Stack for StreamSmart
 * Creates foundational AWS resources: S3, OpenSearch, VPC, and security components
 */
export class StreamSmartInfrastructureStack extends cdk.Stack {
  public readonly csvBucket: s3.Bucket;
  public readonly openSearchDomain: opensearch.Domain;
  public readonly vpc: ec2.Vpc;
  public readonly encryptionKey: kms.Key;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create KMS key for encryption at rest
    this.encryptionKey = new kms.Key(this, 'StreamSmartEncryptionKey', {
      description: 'KMS key for StreamSmart data encryption',
      enableKeyRotation: true,
      alias: 'streamsmart-encryption',
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Prevent accidental deletion
    });

    // Create VPC for secure networking
    this.vpc = new ec2.Vpc(this, 'StreamSmartVPC', {
      maxAzs: 2, // High availability across 2 AZs
      natGateways: 1, // Cost optimization: 1 NAT for dev, increase for prod
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // Add VPC endpoints for AWS services to reduce costs and improve security
    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    // Create S3 bucket for CSV data storage
    this.csvBucket = new s3.Bucket(this, 'StreamSmartCSVBucket', {
      bucketName: `streamsmart-csv-data-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.encryptionKey,
      versioned: true, // Enable versioning for data protection
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Prevent accidental deletion
      cors: [
        {
          allowedOrigins: ['*'], // Configure based on your frontend domain
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedHeaders: ['*'],
          maxAge: 3600,
        },
      ],
    });

    // Create security group for OpenSearch
    const openSearchSecurityGroup = new ec2.SecurityGroup(this, 'OpenSearchSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for OpenSearch domain',
      allowAllOutbound: false,
    });

    // Allow HTTPS access from within VPC
    openSearchSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
      'Allow HTTPS from VPC'
    );

    // Create OpenSearch domain for vector search
    this.openSearchDomain = new opensearch.Domain(this, 'StreamSmartOpenSearch', {
      version: opensearch.EngineVersion.OPENSEARCH_2_11, // Latest stable version with k-NN
      domainName: 'streamsmart-vectors',
      capacity: {
        // Start with minimal capacity for cost optimization
        // Scale up as needed based on load
        masterNodes: 0, // No dedicated master for small cluster
        masterNodeInstanceType: undefined,
        dataNodes: 2, // Minimum for high availability
        dataNodeInstanceType: 't3.small.search', // Cost-effective for development
        // For production, consider: 'r6g.large.search' or higher
      },
      ebs: {
        volumeSize: 20, // GB per node
        volumeType: ec2.EbsDeviceVolumeType.GP3, // Latest SSD type
        iops: 3000,
        throughput: 125, // MiB/s
      },
      nodeToNodeEncryption: true,
      encryptionAtRest: {
        enabled: true,
      },
      vpc: this.vpc,
      vpcSubnets: [{
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      }],
      securityGroups: [openSearchSecurityGroup],
      logging: {
        slowSearchLogEnabled: true,
        appLogEnabled: true,
        slowIndexLogEnabled: true,
      },
      fineGrainedAccessControl: {
        masterUserArn: new iam.ArnPrincipal(
          `arn:aws:iam::${cdk.Aws.ACCOUNT_ID}:root`
        ).arn,
      },
      // Enable UltraWarm for cost-effective storage of older data
      // Uncomment for production with large datasets
      // useUnsignedBasicAuth: false,
      // warmEnabled: true,
      // warmCount: 2,
      // warmInstanceType: 'ultrawarm1.medium.search',
    });

    // Configure OpenSearch access policy
    const openSearchAccessPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          principals: [new iam.AnyPrincipal()],
          actions: ['es:*'],
          resources: [
            this.openSearchDomain.domainArn,
            `${this.openSearchDomain.domainArn}/*`,
          ],
          conditions: {
            IpAddress: {
              'aws:SourceIp': [this.vpc.vpcCidrBlock],
            },
          },
        }),
      ],
    });

    // Apply the access policy to the domain
    const cfnDomain = this.openSearchDomain.node.defaultChild as opensearch.CfnDomain;
    cfnDomain.accessPolicies = openSearchAccessPolicy.toJSON();

    // Create CloudWatch Log Groups for monitoring
    new logs.LogGroup(this, 'StreamSmartAppLogs', {
      logGroupName: '/aws/streamsmart/application',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Output important resource information
    new cdk.CfnOutput(this, 'CSVBucketName', {
      value: this.csvBucket.bucketName,
      description: 'S3 bucket for CSV data storage',
      exportName: 'StreamSmart-CSVBucket',
    });

    new cdk.CfnOutput(this, 'OpenSearchDomainEndpoint', {
      value: this.openSearchDomain.domainEndpoint,
      description: 'OpenSearch domain endpoint for vector search',
      exportName: 'StreamSmart-OpenSearchEndpoint',
    });

    new cdk.CfnOutput(this, 'VPCId', {
      value: this.vpc.vpcId,
      description: 'VPC ID for StreamSmart infrastructure',
      exportName: 'StreamSmart-VPCId',
    });

    new cdk.CfnOutput(this, 'KMSKeyId', {
      value: this.encryptionKey.keyId,
      description: 'KMS key ID for encryption',
      exportName: 'StreamSmart-KMSKeyId',
    });

    // Add tags for cost tracking
    cdk.Tags.of(this).add('CostCenter', 'StreamSmart-Infrastructure');
    cdk.Tags.of(this).add('Owner', 'AI-Team');
    cdk.Tags.of(this).add('Environment', 'Production');
  }
}
