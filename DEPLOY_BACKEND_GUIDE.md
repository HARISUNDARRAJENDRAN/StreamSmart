# StreamSmart Backend Deployment Guide

## Overview
Deploy StreamSmart RAG chatbot backend to AWS ECS Fargate with full integration of Bedrock, OpenSearch, S3, DynamoDB, and Lex.

## Prerequisites
- AWS CLI configured with profile: `streamsmart-admin`
- Docker installed
- AWS Account ID: `011868793425`
- Region: `ap-south-1`
- VPC ID: `vpc-0cc433a6e70c9d8a3`
- Subnets: `subnet-090f0ddbfc59fadbd`, `subnet-09e2d9ccd6fd72143`
- Bedrock models verified: `amazon.titan-embed-text-v2:0`, `amazon.titan-text-express-v1`

## Deployment Phases

### Phase 1: Infrastructure Setup (CloudFormation)

The infrastructure template will create:
- ECR repositories
- ECS cluster
- Application Load Balancer
- S3 bucket for transcripts
- OpenSearch domain for vector search
- Security groups
- IAM roles

**Deploy Infrastructure:**
```bash
aws cloudformation create-stack \
  --stack-name streamsmart-infrastructure \
  --template-body file://ecs-task-definitions/infrastructure-cloudformation.yaml \
  --parameters \
    ParameterKey=VpcId,ParameterValue=vpc-0cc433a6e70c9d8a3 \
    ParameterKey=SubnetIds,ParameterValue="subnet-090f0ddbfc59fadbd\,subnet-09e2d9ccd6fd72143" \
  --capabilities CAPABILITY_IAM \
  --region ap-south-1 \
  --profile streamsmart-admin
```

**Monitor Stack Creation:**
```bash
aws cloudformation describe-stacks \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'Stacks[0].StackStatus'
```

**Wait for COMPLETE status (15-20 minutes for OpenSearch):**
```bash
aws cloudformation wait stack-create-complete \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin
```

**Get Stack Outputs:**
```bash
aws cloudformation describe-stacks \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'Stacks[0].Outputs'
```

Save these outputs - you'll need them for secrets configuration:
- `S3BucketName`: Transcript storage bucket
- `OpenSearchEndpoint`: Vector database endpoint
- `BackendECRRepository`: Backend Docker repository
- `LoadBalancerDNS`: Public endpoint

### Phase 2: Configure Secrets Manager

Create secrets for RAG configuration:

```bash
# Get S3 bucket name from CloudFormation
S3_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
  --output text)

# Get OpenSearch endpoint from CloudFormation
OPENSEARCH_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'Stacks[0].Outputs[?OutputKey==`OpenSearchEndpoint`].OutputValue' \
  --output text)

# Create secrets
aws secretsmanager create-secret \
  --name streamsmart/rag-s3-bucket \
  --secret-string "$S3_BUCKET" \
  --region ap-south-1 \
  --profile streamsmart-admin

aws secretsmanager create-secret \
  --name streamsmart/rag-opensearch-endpoint \
  --secret-string "$OPENSEARCH_ENDPOINT" \
  --region ap-south-1 \
  --profile streamsmart-admin

aws secretsmanager create-secret \
  --name streamsmart/rag-embed-model \
  --secret-string "amazon.titan-embed-text-v2:0" \
  --region ap-south-1 \
  --profile streamsmart-admin

aws secretsmanager create-secret \
  --name streamsmart/rag-llm-model \
  --secret-string "amazon.titan-text-express-v1" \
  --region ap-south-1 \
  --profile streamsmart-admin
```

### Phase 3: Build and Push Docker Images

**Get ECR repository URI:**
```bash
BACKEND_ECR=$(aws cloudformation describe-stacks \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'Stacks[0].Outputs[?OutputKey==`BackendECRRepository`].OutputValue' \
  --output text)
```

**Login to ECR:**
```bash
aws ecr get-login-password \
  --region ap-south-1 \
  --profile streamsmart-admin | docker login \
  --username AWS \
  --password-stdin 011868793425.dkr.ecr.ap-south-1.amazonaws.com
```

**Build backend image:**
```bash
cd python_backend
docker build -t streamsmart-backend:latest -f Dockerfile .
```

**Tag and push:**
```bash
docker tag streamsmart-backend:latest $BACKEND_ECR:latest
docker push $BACKEND_ECR:latest
```

### Phase 4: Create DynamoDB Table

The backend uses DynamoDB for video metadata:

```bash
aws dynamodb create-table \
  --table-name Videos \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=videoId,AttributeType=S \
    AttributeName=createdAt,AttributeType=N \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=videoId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    '[{
      "IndexName": "userId-createdAt-index",
      "KeySchema": [
        {"AttributeName": "userId", "KeyType": "HASH"},
        {"AttributeName": "createdAt", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }]' \
  --region ap-south-1 \
  --profile streamsmart-admin
```

### Phase 5: Register ECS Task Definition

**Update task definition with actual values:**
```bash
# Create a temporary task definition file with updated values
sed "s/ACCOUNT_ID/011868793425/g; s/REGION/ap-south-1/g" \
  ecs-task-definitions/backend-task-definition.json > backend-task-updated.json

# Register the task definition
aws ecs register-task-definition \
  --cli-input-json file://backend-task-updated.json \
  --region ap-south-1 \
  --profile streamsmart-admin
```

### Phase 6: Create ECS Service

**Get resources from CloudFormation:**
```bash
# Get target group ARN
BACKEND_TG=$(aws cloudformation describe-stacks \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'Stacks[0].Outputs[?OutputKey==`BackendTargetGroupArn`].OutputValue' \
  --output text)

# Get security group
BACKEND_SG=$(aws cloudformation describe-stacks \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'Stacks[0].Outputs[?OutputKey==`BackendSecurityGroup`].OutputValue' \
  --output text)
```

**Create ECS service:**
```bash
aws ecs create-service \
  --cluster streamsmart-cluster \
  --service-name streamsmart-backend \
  --task-definition streamsmart-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-090f0ddbfc59fadbd,subnet-09e2d9ccd6fd72143],securityGroups=[$BACKEND_SG],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$BACKEND_TG,containerName=streamsmart-backend,containerPort=8000" \
  --region ap-south-1 \
  --profile streamsmart-admin
```

### Phase 7: Configure Amazon Lex

Amazon Lex will serve as the conversational interface layer.

**Create Lex Bot:**
1. Go to AWS Console → Amazon Lex
2. Create a new bot: `streamsmart-rag-bot`
3. Language: English (US)
4. Session timeout: 5 minutes

**Create Intent: `RAGQueryIntent`**
- Sample utterances:
  - "Tell me about {query}"
  - "What is {query}"
  - "Explain {query}"
  - "Search for {query}"
- Slot: `query` (Type: AMAZON.SearchQuery)

**Create Lambda fulfillment function:**
```python
# This Lambda will forward requests to your backend
import json
import boto3
import os

def lambda_handler(event, context):
    # Get query from Lex
    query = event['sessionState']['intent']['slots']['query']['value']['interpretedValue']
    
    # Call your backend API
    # You'll need to update this with your ALB endpoint
    backend_url = os.environ['BACKEND_URL']
    response = requests.post(f"{backend_url}/rag-answer", json={"question": query})
    
    return {
        'sessionState': {
            'dialogAction': {
                'type': 'Close'
            },
            'intent': {
                'name': event['sessionState']['intent']['name'],
                'state': 'Fulfilled'
            }
        },
        'messages': [
            {
                'contentType': 'PlainText',
                'content': response.json()['answer']
            }
        ]
    }
```

### Phase 8: Verify Deployment

**Check ECS service status:**
```bash
aws ecs describe-services \
  --cluster streamsmart-cluster \
  --services streamsmart-backend \
  --region ap-south-1 \
  --profile streamsmart-admin
```

**Get load balancer DNS:**
```bash
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text)

echo "Backend API: http://$ALB_DNS/docs"
```

**Test backend health:**
```bash
curl http://$ALB_DNS/docs
```

**Check CloudWatch Logs:**
```bash
aws logs tail /ecs/streamsmart-backend \
  --follow \
  --region ap-south-1 \
  --profile streamsmart-admin
```

### Phase 9: Test RAG Functionality

**Process a video (upload transcript to S3 and index):**
```bash
curl -X POST http://$ALB_DNS/process-videos \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "videoId": "test-video-123",
    "videoUrl": "https://youtube.com/watch?v=xyz",
    "transcript": "This is a test transcript about machine learning..."
  }'
```

**Query RAG:**
```bash
curl -X POST http://$ALB_DNS/rag-answer \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "question": "What is machine learning?"
  }'
```

## Environment Variables Required

The backend requires these environment variables (configured via Secrets Manager):
- `AWS_REGION`: ap-south-1
- `AWS_RAG_S3_BUCKET`: From CloudFormation
- `AWS_RAG_OPENSEARCH_ENDPOINT`: From CloudFormation
- `AWS_RAG_OPENSEARCH_INDEX`: streamsmart-rag-chunks (default)
- `AWS_RAG_EMBED_MODEL`: amazon.titan-embed-text-v2:0
- `AWS_RAG_LLM_MODEL`: amazon.titan-text-express-v1

## Monitoring

**CloudWatch Logs:**
- Backend: `/ecs/streamsmart-backend`

**Metrics to monitor:**
- ECS CPU/Memory utilization
- ALB request count and latency
- OpenSearch cluster health
- Bedrock API calls

## Troubleshooting

**If ECS service fails to start:**
```bash
# Check task logs
aws ecs describe-tasks \
  --cluster streamsmart-cluster \
  --tasks $(aws ecs list-tasks --cluster streamsmart-cluster --service-name streamsmart-backend --query 'taskArns[0]' --output text) \
  --region ap-south-1 \
  --profile streamsmart-admin
```

**If secrets are not accessible:**
- Verify IAM task role has `secretsmanager:GetSecretValue` permission
- Check secret ARNs in task definition match actual secrets

**If OpenSearch connection fails:**
- Verify security group allows inbound traffic from ECS tasks
- Check OpenSearch domain endpoint is correct
- Ensure IAM task role has OpenSearch permissions

## Cost Optimization

**Development environment:**
- Use FARGATE_SPOT for non-critical workloads
- Scale down to 0 tasks when not in use
- Use smaller OpenSearch instance (t3.small.search)

**Production environment:**
- Enable auto-scaling based on CPU/memory
- Use Reserved Capacity for predictable workloads
- Monitor and optimize Bedrock API calls

## Next Steps

1. **Complete Lex integration** - Create Lambda function for conversational interface
2. **Set up monitoring** - CloudWatch dashboards and alarms
3. **Configure CI/CD** - Automate deployments with GitHub Actions or CodePipeline
4. **Add authentication** - Integrate with Cognito or your auth system
5. **Enable HTTPS** - Add SSL certificate to ALB
6. **Production hardening** - Security groups, WAF, backup policies
