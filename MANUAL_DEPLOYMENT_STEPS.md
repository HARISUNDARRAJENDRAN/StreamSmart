# Manual Deployment Steps - StreamSmart Backend

If automated scripts fail, follow these manual steps in order.

## Prerequisites Checklist
- [ ] AWS CLI installed and configured
- [ ] Docker installed and running
- [ ] AWS profile `streamsmart-admin` configured
- [ ] Windows PowerShell or WSL/Git Bash available

## Step-by-Step Manual Deployment

### 1. Set AWS Environment Variables

**PowerShell:**
```powershell
$env:AWS_PROFILE = "streamsmart-admin"
$env:AWS_REGION = "ap-south-1"
```

**Bash:**
```bash
export AWS_PROFILE=streamsmart-admin
export AWS_REGION=ap-south-1
```

### 2. Verify AWS Access

```bash
aws sts get-caller-identity --profile streamsmart-admin
# Should return: Account: 011868793425
```

### 3. Deploy Infrastructure with CloudFormation

```bash
aws cloudformation create-stack \
  --stack-name streamsmart-infrastructure \
  --template-body file://ecs-task-definitions/infrastructure-cloudformation.yaml \
  --parameters \
    ParameterKey=VpcId,ParameterValue=vpc-0cc433a6e70c9d8a3 \
    ParameterKey=SubnetIds,ParameterValue="subnet-090f0ddbfc59fadbd,subnet-09e2d9ccd6fd72143" \
  --capabilities CAPABILITY_IAM \
  --region ap-south-1 \
  --profile streamsmart-admin
```

**Monitor progress:**
```bash
# Check status
aws cloudformation describe-stacks \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'Stacks[0].StackStatus'

# Wait for completion (alternative to wait command)
# Keep running until status is CREATE_COMPLETE
```

**If CloudFormation fails, check events:**
```bash
aws cloudformation describe-stack-events \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --max-items 20
```

### 4. Get Stack Outputs

```bash
# Get all outputs
aws cloudformation describe-stacks \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'Stacks[0].Outputs'

# Save specific outputs
# S3 Bucket
aws cloudformation describe-stacks \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
  --output text

# OpenSearch Endpoint
aws cloudformation describe-stacks \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'Stacks[0].Outputs[?OutputKey==`OpenSearchEndpoint`].OutputValue' \
  --output text

# Backend ECR Repository
aws cloudformation describe-stacks \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'Stacks[0].Outputs[?OutputKey==`BackendECRRepository`].OutputValue' \
  --output text
```

### 5. Create Secrets in AWS Secrets Manager

Replace `YOUR_S3_BUCKET` and `YOUR_OPENSEARCH_ENDPOINT` with values from step 4:

```bash
# S3 Bucket Secret
aws secretsmanager create-secret \
  --name streamsmart/rag-s3-bucket \
  --secret-string "YOUR_S3_BUCKET" \
  --region ap-south-1 \
  --profile streamsmart-admin

# OpenSearch Endpoint Secret
aws secretsmanager create-secret \
  --name streamsmart/rag-opensearch-endpoint \
  --secret-string "YOUR_OPENSEARCH_ENDPOINT" \
  --region ap-south-1 \
  --profile streamsmart-admin

# Embedding Model Secret
aws secretsmanager create-secret \
  --name streamsmart/rag-embed-model \
  --secret-string "amazon.titan-embed-text-v2:0" \
  --region ap-south-1 \
  --profile streamsmart-admin

# LLM Model Secret
aws secretsmanager create-secret \
  --name streamsmart/rag-llm-model \
  --secret-string "amazon.titan-text-express-v1" \
  --region ap-south-1 \
  --profile streamsmart-admin
```

**If secrets already exist, update them:**
```bash
aws secretsmanager update-secret \
  --secret-id streamsmart/rag-s3-bucket \
  --secret-string "YOUR_S3_BUCKET" \
  --region ap-south-1 \
  --profile streamsmart-admin
```

### 6. Create DynamoDB Table

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
  --region ap-south-1 \
  --profile streamsmart-admin
```

**Add Global Secondary Index (wait for table to be ACTIVE first):**
```bash
# Check table status
aws dynamodb describe-table \
  --table-name Videos \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'Table.TableStatus'

# Add GSI (only after table is ACTIVE)
aws dynamodb update-table \
  --table-name Videos \
  --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=createdAt,AttributeType=N \
  --global-secondary-index-updates \
    '[{
      "Create": {
        "IndexName": "userId-createdAt-index",
        "KeySchema": [
          {"AttributeName": "userId", "KeyType": "HASH"},
          {"AttributeName": "createdAt", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }
    }]' \
  --region ap-south-1 \
  --profile streamsmart-admin
```

### 7. Build and Push Docker Image

```bash
# Login to ECR
aws ecr get-login-password \
  --region ap-south-1 \
  --profile streamsmart-admin | docker login \
  --username AWS \
  --password-stdin 011868793425.dkr.ecr.ap-south-1.amazonaws.com

# Get ECR repository URI from CloudFormation output
# Replace YOUR_ECR_URI below with the actual value
BACKEND_ECR="YOUR_ECR_URI"

# Navigate to backend directory
cd python_backend

# Build image
docker build -t streamsmart-backend:latest -f Dockerfile .

# Tag image
docker tag streamsmart-backend:latest $BACKEND_ECR:latest

# Push image
docker push $BACKEND_ECR:latest

# Return to project root
cd ..
```

### 8. Register ECS Task Definition

**Create updated task definition file:**

```powershell
# PowerShell
$content = Get-Content -Path "ecs-task-definitions\backend-task-definition.json" -Raw
$content = $content.Replace("ACCOUNT_ID", "011868793425")
$content = $content.Replace("REGION", "ap-south-1")
$content | Out-File -FilePath "backend-task-updated.json" -Encoding UTF8

# Register
aws ecs register-task-definition `
  --cli-input-json file://backend-task-updated.json `
  --region ap-south-1 `
  --profile streamsmart-admin
```

```bash
# Bash
sed 's/ACCOUNT_ID/011868793425/g; s/REGION/ap-south-1/g' \
  ecs-task-definitions/backend-task-definition.json > backend-task-updated.json

# Register
aws ecs register-task-definition \
  --cli-input-json file://backend-task-updated.json \
  --region ap-south-1 \
  --profile streamsmart-admin
```

### 9. Create ECS Service

**Get required resources:**

```bash
# Get Target Group ARN
BACKEND_TG=$(aws cloudformation describe-stacks \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'Stacks[0].Outputs[?OutputKey==`BackendTargetGroupArn`].OutputValue' \
  --output text)

# Get Security Group
BACKEND_SG=$(aws cloudformation describe-stacks \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'Stacks[0].Outputs[?OutputKey==`BackendSecurityGroup`].OutputValue' \
  --output text)

echo "Target Group: $BACKEND_TG"
echo "Security Group: $BACKEND_SG"
```

**Create service:**

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

### 10. Monitor Service Deployment

```bash
# Check service status
aws ecs describe-services \
  --cluster streamsmart-cluster \
  --services streamsmart-backend \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'services[0].{Status:status,DesiredCount:desiredCount,RunningCount:runningCount}'

# List tasks
aws ecs list-tasks \
  --cluster streamsmart-cluster \
  --service-name streamsmart-backend \
  --region ap-south-1 \
  --profile streamsmart-admin

# Check task details (replace TASK_ARN with actual ARN from list-tasks)
aws ecs describe-tasks \
  --cluster streamsmart-cluster \
  --tasks TASK_ARN \
  --region ap-south-1 \
  --profile streamsmart-admin
```

### 11. Get Load Balancer DNS and Test

```bash
# Get ALB DNS
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text)

echo "Load Balancer DNS: $ALB_DNS"
echo "API Documentation: http://$ALB_DNS/docs"

# Test endpoint
curl http://$ALB_DNS/docs
```

### 12. Check CloudWatch Logs

```bash
# View logs
aws logs tail /ecs/streamsmart-backend \
  --follow \
  --region ap-south-1 \
  --profile streamsmart-admin

# Get recent logs without streaming
aws logs tail /ecs/streamsmart-backend \
  --since 30m \
  --region ap-south-1 \
  --profile streamsmart-admin
```

## Troubleshooting

### Issue: CloudFormation Stack Creation Fails

1. Check stack events for errors:
```bash
aws cloudformation describe-stack-events \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin
```

2. Common issues:
   - **Insufficient permissions**: Ensure IAM user has CloudFormation, EC2, ECS, OpenSearch permissions
   - **VPC not found**: Verify VPC ID is correct
   - **Subnet issues**: Ensure subnets are in the correct VPC and availability zones
   - **Resource limits**: Check AWS service quotas

3. Delete failed stack and retry:
```bash
aws cloudformation delete-stack \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin
```

### Issue: ECS Task Fails to Start

1. Check task stopped reason:
```bash
aws ecs describe-tasks \
  --cluster streamsmart-cluster \
  --tasks TASK_ARN \
  --region ap-south-1 \
  --profile streamsmart-admin \
  --query 'tasks[0].stoppedReason'
```

2. Common issues:
   - **Cannot pull container image**: ECR permissions or image doesn't exist
   - **Secret access denied**: IAM task execution role missing secretsmanager permissions
   - **Health check failing**: Backend not responding on port 8000

### Issue: Backend API Not Accessible

1. Check target group health:
```bash
aws elbv2 describe-target-health \
  --target-group-arn $BACKEND_TG \
  --region ap-south-1 \
  --profile streamsmart-admin
```

2. Verify security groups allow traffic:
   - ALB security group: Allow 80/443 from internet
   - ECS security group: Allow 8000 from ALB security group

### Issue: OpenSearch Connection Fails

1. Check OpenSearch domain status:
```bash
aws opensearch describe-domain \
  --domain-name streamsmart-rag \
  --region ap-south-1 \
  --profile streamsmart-admin
```

2. Verify:
   - Domain is in ACTIVE state
   - VPC configuration allows access from ECS tasks
   - IAM role has es:* permissions

## Clean Up (If Needed)

To remove all resources:

```bash
# Delete ECS service
aws ecs delete-service \
  --cluster streamsmart-cluster \
  --service streamsmart-backend \
  --force \
  --region ap-south-1 \
  --profile streamsmart-admin

# Wait for service deletion
aws ecs wait services-inactive \
  --cluster streamsmart-cluster \
  --services streamsmart-backend \
  --region ap-south-1 \
  --profile streamsmart-admin

# Delete CloudFormation stack (this will delete most resources)
aws cloudformation delete-stack \
  --stack-name streamsmart-infrastructure \
  --region ap-south-1 \
  --profile streamsmart-admin

# Delete DynamoDB table
aws dynamodb delete-table \
  --table-name Videos \
  --region ap-south-1 \
  --profile streamsmart-admin

# Delete secrets
aws secretsmanager delete-secret \
  --secret-id streamsmart/rag-s3-bucket \
  --force-delete-without-recovery \
  --region ap-south-1 \
  --profile streamsmart-admin

# Repeat for other secrets...
```

## Next Steps After Successful Deployment

1. **Configure Amazon Lex**
   - Create bot with RAGQueryIntent
   - Deploy Lambda function from `lex-lambda-function.py`
   - Link Lambda as fulfillment handler

2. **Test RAG Functionality**
   - Upload test video transcript
   - Query via API or Lex bot
   - Verify citations and sources

3. **Set Up Monitoring**
   - Create CloudWatch dashboards
   - Configure alarms for errors and latency
   - Enable X-Ray tracing

4. **Production Hardening**
   - Add SSL certificate to ALB
   - Configure WAF rules
   - Set up backup policies
   - Enable auto-scaling

## Support

If you encounter issues not covered here, check:
- CloudWatch Logs: `/ecs/streamsmart-backend`
- CloudFormation Events in AWS Console
- ECS Task Logs in AWS Console
