"""
Setup AWS infrastructure for transcript storage
Creates DynamoDB table and S3 bucket
"""

import boto3
from botocore.exceptions import ClientError
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

AWS_REGION = "ap-south-2"
DYNAMODB_TABLE_NAME = "Transcripts"
S3_BUCKET_NAME = "streamsmart-transcripts-560271561936"

def create_dynamodb_table():
    """Create DynamoDB table for transcript metadata"""
    try:
        dynamodb = boto3.client('dynamodb', region_name=AWS_REGION)
        
        logger.info(f"Creating DynamoDB table: {DYNAMODB_TABLE_NAME}")
        
        response = dynamodb.create_table(
            TableName=DYNAMODB_TABLE_NAME,
            KeySchema=[
                {
                    'AttributeName': 'videoId',
                    'KeyType': 'HASH'  # Partition key
                }
            ],
            AttributeDefinitions=[
                {
                    'AttributeName': 'videoId',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'uploadedBy',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'uploadedAt',
                    'AttributeType': 'S'
                }
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'uploadedBy-uploadedAt-index',
                    'KeySchema': [
                        {
                            'AttributeName': 'uploadedBy',
                            'KeyType': 'HASH'
                        },
                        {
                            'AttributeName': 'uploadedAt',
                            'KeyType': 'RANGE'
                        }
                    ],
                    'Projection': {
                        'ProjectionType': 'ALL'
                    },
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                }
            ],
            BillingMode='PROVISIONED',
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            },
            Tags=[
                {
                    'Key': 'Project',
                    'Value': 'StreamSmart'
                },
                {
                    'Key': 'Purpose',
                    'Value': 'Transcript-Storage'
                }
            ]
        )
        
        logger.info(f"✅ DynamoDB table created: {DYNAMODB_TABLE_NAME}")
        logger.info(f"   ARN: {response['TableDescription']['TableArn']}")
        logger.info("   Waiting for table to become active...")
        
        # Wait for table to be active
        waiter = dynamodb.get_waiter('table_exists')
        waiter.wait(TableName=DYNAMODB_TABLE_NAME)
        
        logger.info("✅ Table is now active!")
        return True
        
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceInUseException':
            logger.info(f"ℹ️  Table {DYNAMODB_TABLE_NAME} already exists")
            return True
        else:
            logger.error(f"❌ Error creating DynamoDB table: {e}")
            return False
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        return False

def create_s3_bucket():
    """Create S3 bucket for transcript storage"""
    try:
        s3_client = boto3.client('s3', region_name=AWS_REGION)
        
        logger.info(f"Creating S3 bucket: {S3_BUCKET_NAME}")
        
        # Create bucket with location constraint
        s3_client.create_bucket(
            Bucket=S3_BUCKET_NAME,
            CreateBucketConfiguration={
                'LocationConstraint': AWS_REGION
            }
        )
        
        logger.info(f"✅ S3 bucket created: {S3_BUCKET_NAME}")
        
        # Add bucket tags
        s3_client.put_bucket_tagging(
            Bucket=S3_BUCKET_NAME,
            Tagging={
                'TagSet': [
                    {'Key': 'Project', 'Value': 'StreamSmart'},
                    {'Key': 'Purpose', 'Value': 'Transcript-Storage'}
                ]
            }
        )
        
        # Enable versioning (optional but recommended)
        s3_client.put_bucket_versioning(
            Bucket=S3_BUCKET_NAME,
            VersioningConfiguration={'Status': 'Enabled'}
        )
        logger.info("✅ Versioning enabled on bucket")
        
        # Add lifecycle policy to delete old versions after 30 days
        s3_client.put_bucket_lifecycle_configuration(
            Bucket=S3_BUCKET_NAME,
            LifecycleConfiguration={
                'Rules': [
                    {
                        'Id': 'DeleteOldVersions',
                        'Status': 'Enabled',
                        'NoncurrentVersionExpiration': {
                            'NoncurrentDays': 30
                        }
                    }
                ]
            }
        )
        logger.info("✅ Lifecycle policy added (delete old versions after 30 days)")
        
        # Add CORS policy for browser extension uploads
        s3_client.put_bucket_cors(
            Bucket=S3_BUCKET_NAME,
            CORSConfiguration={
                'CORSRules': [
                    {
                        'AllowedOrigins': ['*'],
                        'AllowedMethods': ['GET', 'PUT', 'POST', 'DELETE'],
                        'AllowedHeaders': ['*'],
                        'MaxAgeSeconds': 3000
                    }
                ]
            }
        )
        logger.info("✅ CORS policy added")
        
        return True
        
    except ClientError as e:
        if e.response['Error']['Code'] == 'BucketAlreadyOwnedByYou':
            logger.info(f"ℹ️  Bucket {S3_BUCKET_NAME} already exists and is owned by you")
            return True
        elif e.response['Error']['Code'] == 'BucketAlreadyExists':
            logger.error(f"❌ Bucket {S3_BUCKET_NAME} already exists but is owned by someone else")
            return False
        else:
            logger.error(f"❌ Error creating S3 bucket: {e}")
            return False
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        return False

def verify_infrastructure():
    """Verify that infrastructure is set up correctly"""
    try:
        logger.info("\n" + "="*50)
        logger.info("Verifying infrastructure...")
        logger.info("="*50 + "\n")
        
        # Check DynamoDB table
        dynamodb = boto3.client('dynamodb', region_name=AWS_REGION)
        try:
            response = dynamodb.describe_table(TableName=DYNAMODB_TABLE_NAME)
            status = response['Table']['TableStatus']
            logger.info(f"✅ DynamoDB Table: {DYNAMODB_TABLE_NAME} (Status: {status})")
            logger.info(f"   Items: Checking...")
            
            # Get item count
            table_resource = boto3.resource('dynamodb', region_name=AWS_REGION).Table(DYNAMODB_TABLE_NAME)
            item_count = table_resource.item_count
            logger.info(f"   Items: {item_count}")
        except ClientError:
            logger.error(f"❌ DynamoDB Table not found: {DYNAMODB_TABLE_NAME}")
            return False
        
        # Check S3 bucket
        s3_client = boto3.client('s3', region_name=AWS_REGION)
        try:
            s3_client.head_bucket(Bucket=S3_BUCKET_NAME)
            logger.info(f"✅ S3 Bucket: {S3_BUCKET_NAME}")
            
            # Get object count
            response = s3_client.list_objects_v2(Bucket=S3_BUCKET_NAME)
            object_count = response.get('KeyCount', 0)
            logger.info(f"   Objects: {object_count}")
        except ClientError:
            logger.error(f"❌ S3 Bucket not found: {S3_BUCKET_NAME}")
            return False
        
        logger.info("\n" + "="*50)
        logger.info("✅ Infrastructure verification complete!")
        logger.info("="*50)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Verification failed: {e}")
        return False

def main():
    """Main setup function"""
    logger.info("="*50)
    logger.info("StreamSmart Transcript Infrastructure Setup")
    logger.info("="*50 + "\n")
    
    logger.info(f"Region: {AWS_REGION}")
    logger.info(f"DynamoDB Table: {DYNAMODB_TABLE_NAME}")
    logger.info(f"S3 Bucket: {S3_BUCKET_NAME}\n")
    
    # Create DynamoDB table
    if not create_dynamodb_table():
        logger.error("Failed to create DynamoDB table")
        return False
    
    logger.info("")
    
    # Create S3 bucket
    if not create_s3_bucket():
        logger.error("Failed to create S3 bucket")
        return False
    
    logger.info("")
    
    # Verify infrastructure
    if not verify_infrastructure():
        logger.error("Infrastructure verification failed")
        return False
    
    logger.info("\n" + "="*50)
    logger.info("✅ Setup completed successfully!")
    logger.info("="*50)
    logger.info("\nYou can now:")
    logger.info("1. Start the backend server: python start_server.py")
    logger.info("2. Test transcript upload via API or browser extension")
    logger.info("3. Check transcripts in DynamoDB console or S3 bucket")
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
