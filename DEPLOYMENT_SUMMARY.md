# StreamSmart Backend Deployment - Complete Package

## 📦 What's Been Created

### 1. **DEPLOY_BACKEND_GUIDE.md**
Complete step-by-step deployment guide with detailed explanations for each phase:
- Infrastructure setup with CloudFormation
- Secrets Manager configuration
- Docker build and ECR push
- DynamoDB table creation
- ECS service deployment
- Amazon Lex integration
- Monitoring and troubleshooting

### 2. **deploy-backend.sh** (Bash Script)
Automated deployment script for Linux/Mac/WSL:
- Interactive menu for selecting deployment phases
- Automatic error handling
- Color-coded output
- Prerequisites checking
- Can run full deployment or individual phases

**Usage:**
```bash
bash deploy-backend.sh
```

### 3. **deploy-backend.ps1** (PowerShell Script)
Automated deployment script for Windows:
- Supports command-line parameters
- Clean error handling
- Can run full deployment or specific phases only

**Usage:**
```powershell
# Full deployment
.\deploy-backend.ps1

# Infrastructure only
.\deploy-backend.ps1 -InfrastructureOnly

# Containers only (skip infrastructure)
.\deploy-backend.ps1 -ContainersOnly

# Verify existing deployment
.\deploy-backend.ps1 -VerifyOnly
```

### 4. **MANUAL_DEPLOYMENT_STEPS.md**
Detailed manual deployment guide with individual AWS CLI commands:
- Use this if automation scripts fail
- Each step explained with troubleshooting
- Copy-paste ready commands
- Includes cleanup procedures

### 5. **lex-lambda-function.py**
Lambda function template for Amazon Lex integration:
- Handles user queries from Lex
- Forwards to backend RAG API
- Returns formatted responses with citations
- Ready to deploy to AWS Lambda

## 🏗️ Architecture Overview

```
User → Amazon Lex → Lambda → Backend (ECS Fargate) → AWS Services
                                          ↓
                     ┌────────────────────┼────────────────────┐
                     ↓                    ↓                    ↓
              Amazon Bedrock       OpenSearch          S3 + DynamoDB
              (Embeddings + LLM)   (Vector DB)         (Storage)
```

## 📋 Prerequisites Verified

✅ AWS Account ID: `011868793425`
✅ Region: `ap-south-1`
✅ VPC ID: `vpc-0cc433a6e70c9d8a3`
✅ Subnets: `subnet-090f0ddbfc59fadbd`, `subnet-09e2d9ccd6fd72143`
✅ Bedrock Models: Titan Embeddings V2, Titan Text Express
✅ AWS Profile: `streamsmart-admin`

## 🚀 Quick Start - Choose Your Method

### Method 1: Automated Bash Script (Recommended for WSL/Git Bash)

```bash
# Make executable
chmod +x deploy-backend.sh

# Run with interactive menu
bash deploy-backend.sh
```

### Method 2: Automated PowerShell Script (Windows)

```powershell
# Set execution policy (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run full deployment
.\deploy-backend.ps1
```

### Method 3: Manual Step-by-Step

Follow **MANUAL_DEPLOYMENT_STEPS.md** for individual commands.

## 📊 Deployment Phases

### Phase 1: Infrastructure (15-20 minutes)
- Creates ECR repositories
- Sets up ECS cluster
- Configures Application Load Balancer
- Creates S3 bucket for transcripts
- Deploys OpenSearch domain for vector search
- Configures security groups and IAM roles

### Phase 2: Secrets Configuration (1 minute)
- Creates AWS Secrets Manager secrets for:
  - S3 bucket name
  - OpenSearch endpoint
  - Bedrock model IDs

### Phase 3: Docker Build & Push (5-10 minutes)
- Builds backend container image
- Pushes to Amazon ECR
- Tags with latest version

### Phase 4: DynamoDB Setup (1 minute)
- Creates Videos table
- Adds Global Secondary Index for queries

### Phase 5: ECS Deployment (3-5 minutes)
- Registers task definition
- Creates ECS service
- Connects to load balancer

### Phase 6: Verification (2 minutes)
- Checks service health
- Validates API endpoints
- Provides access URLs

### Phase 7: Lex Integration (Manual)
- Create Lex bot in AWS Console
- Deploy Lambda function
- Configure intent fulfillment

## 🔑 Environment Variables

The backend automatically receives these from Secrets Manager:

| Variable | Source | Value |
|----------|--------|-------|
| AWS_REGION | Environment | ap-south-1 |
| AWS_RAG_S3_BUCKET | Secret | From CloudFormation |
| AWS_RAG_OPENSEARCH_ENDPOINT | Secret | From CloudFormation |
| AWS_RAG_OPENSEARCH_INDEX | Default | streamsmart-rag-chunks |
| AWS_RAG_EMBED_MODEL | Secret | amazon.titan-embed-text-v2:0 |
| AWS_RAG_LLM_MODEL | Secret | amazon.titan-text-express-v1 |

## 📁 Backend Structure

Your FastAPI backend (`python_backend/main.py`) includes:

- **RAG Endpoints**:
  - `POST /process-videos` - Upload and index video transcripts
  - `POST /rag-answer` - Query RAG system with citations

- **AWS Integrations**:
  - Bedrock for embeddings and text generation
  - OpenSearch for vector similarity search
  - S3 for transcript storage
  - DynamoDB for metadata

- **Health Checks**:
  - `/docs` - API documentation (Swagger UI)
  - Container health check configured

## 🧪 Testing After Deployment

### 1. Access API Documentation
```bash
# Get load balancer DNS from CloudFormation output
http://YOUR-ALB-DNS/docs
```

### 2. Test RAG Functionality

**Upload a transcript:**
```bash
curl -X POST http://YOUR-ALB-DNS/process-videos \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "videoId": "test-123",
    "videoUrl": "https://youtube.com/watch?v=xyz",
    "transcript": "This video explains machine learning concepts..."
  }'
```

**Query RAG:**
```bash
curl -X POST http://YOUR-ALB-DNS/rag-answer \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "question": "What is machine learning?"
  }'
```

### 3. Check CloudWatch Logs
```bash
aws logs tail /ecs/streamsmart-backend \
  --follow \
  --region ap-south-1 \
  --profile streamsmart-admin
```

## 🔧 Amazon Lex Setup (After Backend Deployment)

### 1. Create Lex Bot
- Go to AWS Console → Amazon Lex
- Create bot: `streamsmart-rag-bot`
- Language: English (US)

### 2. Create Intent
- Intent name: `RAGQueryIntent`
- Sample utterances:
  - "Tell me about {query}"
  - "What is {query}"
  - "Explain {query}"
- Slot: `query` (Type: AMAZON.SearchQuery)

### 3. Deploy Lambda Function
```bash
# Create Lambda deployment package
cd StreamSmart
zip -r lex-lambda.zip lex-lambda-function.py

# Create Lambda function
aws lambda create-function \
  --function-name streamsmart-lex-handler \
  --runtime python3.11 \
  --handler lex-lambda-function.lambda_handler \
  --zip-file fileb://lex-lambda.zip \
  --role YOUR_LAMBDA_EXECUTION_ROLE_ARN \
  --environment Variables="{BACKEND_URL=http://YOUR-ALB-DNS}" \
  --region ap-south-1 \
  --profile streamsmart-admin
```

### 4. Link Lambda to Lex
- In Lex bot settings, set Lambda function as fulfillment
- Grant Lex permission to invoke Lambda

## 📈 Monitoring

### CloudWatch Metrics to Watch
- ECS Service: CPU/Memory utilization
- ALB: Request count, latency, error rates
- OpenSearch: Cluster health, indexing rate
- Bedrock: API call count, throttling

### Set Up Alarms
```bash
# Example: High error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name streamsmart-backend-errors \
  --alarm-description "Alert on high error rate" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --region ap-south-1 \
  --profile streamsmart-admin
```

## 💰 Cost Estimate (ap-south-1)

| Service | Configuration | Monthly Cost (USD) |
|---------|--------------|-------------------|
| ECS Fargate | 0.25 vCPU, 0.5 GB | ~$15 |
| Application Load Balancer | 1 ALB | ~$25 |
| OpenSearch | t3.medium, 100GB | ~$120 |
| S3 | 10 GB storage | ~$0.30 |
| DynamoDB | On-demand | ~$2.50 |
| Bedrock | Pay per use | Variable |
| Secrets Manager | 4 secrets | ~$2 |
| CloudWatch Logs | 5 GB | ~$2.50 |
| **Total (excl. Bedrock)** | | **~$167/month** |

**Cost Optimization Tips:**
- Use Fargate Spot for dev environments (up to 70% savings)
- Scale OpenSearch to t3.small for dev (save ~$60/month)
- Set S3 lifecycle policies to archive old transcripts
- Use DynamoDB on-demand pricing (pay only for what you use)

## 🛟 Troubleshooting

### Common Issues

**1. CloudFormation Stack Fails**
- Check events: `aws cloudformation describe-stack-events`
- Verify VPC/subnet IDs are correct
- Ensure IAM permissions are sufficient

**2. Docker Push Fails**
- Re-login to ECR: `aws ecr get-login-password | docker login...`
- Check ECR repository exists
- Verify network connectivity

**3. ECS Task Won't Start**
- Check task stopped reason in ECS console
- Verify secrets exist in Secrets Manager
- Check IAM task role permissions

**4. API Not Accessible**
- Verify security groups allow traffic
- Check target group health
- Review CloudWatch logs for errors

**5. OpenSearch Connection Fails**
- Ensure domain is in VPC
- Check security group allows ECS tasks
- Verify IAM permissions for es:*

### Get Help

- **CloudWatch Logs**: `/ecs/streamsmart-backend`
- **ECS Events**: AWS Console → ECS → Tasks
- **CloudFormation Events**: AWS Console → CloudFormation → Events
- **Detailed troubleshooting**: See MANUAL_DEPLOYMENT_STEPS.md

## 📝 Next Steps After Deployment

1. ✅ Deploy backend infrastructure
2. ⬜ Configure Amazon Lex bot
3. ⬜ Test RAG functionality end-to-end
4. ⬜ Set up CloudWatch dashboards
5. ⬜ Configure auto-scaling policies
6. ⬜ Add SSL certificate to ALB
7. ⬜ Implement authentication (Cognito)
8. ⬜ Set up CI/CD pipeline
9. ⬜ Deploy frontend application
10. ⬜ Configure domain name (Route 53)

## 🎯 Success Criteria

Deployment is successful when:
- ✅ CloudFormation stack shows CREATE_COMPLETE
- ✅ ECS service is running with 1/1 tasks healthy
- ✅ ALB health checks are passing
- ✅ API docs accessible at http://YOUR-ALB-DNS/docs
- ✅ RAG query returns response with citations
- ✅ CloudWatch logs show no critical errors

## 📚 Additional Resources

- AWS ECS Fargate: https://docs.aws.amazon.com/ecs/latest/developerguide/
- Amazon Bedrock: https://docs.aws.amazon.com/bedrock/
- Amazon OpenSearch: https://docs.aws.amazon.com/opensearch-service/
- Amazon Lex: https://docs.aws.amazon.com/lex/

---

**Ready to deploy?** Start with the automated script:
```bash
bash deploy-backend.sh
```

Or for Windows:
```powershell
.\deploy-backend.ps1
```

Good luck! 🚀
