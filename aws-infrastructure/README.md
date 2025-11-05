# StreamSmart AWS AI Recommendation Infrastructure

Production-ready AWS infrastructure for AI-powered video recommendations using semantic search with SageMaker and OpenSearch.

## Architecture Overview

```
User Video → API Gateway → Lambda → SageMaker (Embeddings) → OpenSearch (k-NN Search) → Recommendations
```

### Components

1. **Infrastructure Stack** (`infrastructure-stack.ts`)
   - S3 bucket for CSV data storage
   - OpenSearch domain with k-NN plugin for vector search
   - VPC with public/private subnets
   - KMS encryption keys
   - CloudWatch log groups

2. **ML Pipeline Stack** (`ml-pipeline-stack.ts`)
   - SageMaker endpoint hosting sentence-transformers model
   - Batch processing Lambda for generating embeddings
   - Step Functions state machine for orchestration
   - EventBridge scheduled rules for periodic updates

3. **API Stack** (`api-stack.ts`)
   - Lambda function for real-time recommendations
   - API Gateway REST API with CORS
   - CloudWatch alarms and dashboards
   - SNS topics for alerts

## Prerequisites

- AWS CLI configured with credentials
- Node.js 18+ and npm
- Python 3.11+
- AWS CDK 2.100+
- At least 1GB free memory for local embedding generation

## Quick Start

### 1. Configure AWS Credentials

```powershell
# Already configured in your environment
aws configure list
```

Your current setup:
- **Profile**: Harisundar
- **Region**: ap-south-2 (Asia Pacific - Hyderabad)
- **Account**: 560271561936

### 2. Install Dependencies

```powershell
cd aws-infrastructure
npm install
```

### 3. Deploy Infrastructure

**Option A: Automated Setup (Recommended)**

```powershell
.\scripts\setup_infrastructure.ps1 -Profile Harisundar -Region ap-south-2
```

This will:
- Bootstrap CDK if needed
- Deploy all three stacks
- Upload CSV to S3
- Generate and upload embeddings to OpenSearch

**Option B: Manual Step-by-Step**

```powershell
# 1. Bootstrap CDK (one-time)
cdk bootstrap aws://560271561936/ap-south-2

# 2. Build project
npm run build

# 3. Review changes
cdk diff

# 4. Deploy all stacks
cdk deploy --all

# 5. Generate embeddings (after deployment)
cd scripts
pip install -r requirements.txt
python generate_embeddings.py `
    --csv-path ..\..\python_backend\educational_youtube_content.csv `
    --opensearch-endpoint $env:AWS_RAG_OPENSEARCH_ENDPOINT `
    --region ap-south-2 `
    --create-index
```

### 4. Update Frontend Configuration

After deployment, update your `.env` file:

```env
# Get these from CDK outputs
NEXT_PUBLIC_AI_RECOMMENDATION_API=https://xxxxx.execute-api.ap-south-2.amazonaws.com/prod/api/v1/recommend
NEXT_PUBLIC_AI_HEALTH_CHECK=https://xxxxx.execute-api.ap-south-2.amazonaws.com/prod/api/v1/health
```

## Using Existing Infrastructure

Your account already has:
- ✅ OpenSearch domain: `search-streamsmart-search-...`
- ✅ S3 bucket: `streamsmart-rag-documents-560271561936`

To use existing resources, modify the stacks:

### Option 1: Use Existing OpenSearch

In `infrastructure-stack.ts`, import existing domain instead of creating new:

```typescript
// Import existing OpenSearch domain
this.openSearchDomain = opensearch.Domain.fromDomainEndpoint(
  this,
  'ExistingOpenSearch',
  'search-streamsmart-search-h7nvtdclcuojbv243vua5cqlc4.ap-south-2.es.amazonaws.com'
);
```

### Option 2: Create New Index in Existing Domain

Modify `generate_embeddings.py` to use a different index name:

```bash
python generate_embeddings.py \
    --index-name streamsmart-ai-vectors \
    --opensearch-endpoint $AWS_RAG_OPENSEARCH_ENDPOINT
```

## API Usage

### Request Format

```bash
curl -X POST https://your-api-gateway-url/prod/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introduction to Python Programming",
    "description": "Learn Python basics for beginners",
    "topN": 10
  }'
```

### Response Format

```json
{
  "success": true,
  "recommendations": [
    {
      "video_id": "abc123",
      "title": "Python Tutorial for Absolute Beginners",
      "channelName": "Tech Academy",
      "thumbnailUrl": "https://...",
      "duration": "15:30",
      "genre": "coding-programming",
      "qualityScore": 0.92,
      "similarityScore": 0.87,
      "youtubeUrl": "https://youtube.com/watch?v=abc123"
    }
  ],
  "count": 10,
  "metadata": {
    "model": "sentence-transformers",
    "search_method": "knn"
  }
}
```

## Monitoring

### CloudWatch Dashboard

Access the auto-generated dashboard:
```
https://console.aws.amazon.com/cloudwatch/home?region=ap-south-2#dashboards:name=StreamSmart-API-Dashboard
```

Metrics monitored:
- API Gateway request count and latency
- Lambda invocations, errors, duration
- SageMaker endpoint invocations
- OpenSearch query performance

### Alarms

Configured alarms will send notifications via SNS when:
- API Gateway 4xx errors > 10 in 2 minutes
- API Gateway 5xx errors > 5 in 1 minute
- Lambda errors > 5 in 2 minutes
- Lambda duration > 10 seconds average

## Cost Estimation

### Development/Testing (Low Traffic)
- **SageMaker**: ml.t2.medium endpoint: ~$35/month
- **OpenSearch**: t3.small.search (2 nodes): ~$50/month
- **Lambda**: First 1M requests free, then $0.20 per 1M
- **API Gateway**: First 1M requests free, then $1 per 1M
- **S3**: Minimal (<$1/month)
- **Total**: ~$85-100/month

### Production (Moderate Traffic)
- **SageMaker**: ml.c5.xlarge or serverless: $150-300/month
- **OpenSearch**: r6g.large.search (3 nodes): $400-500/month
- **Lambda + API Gateway**: $50-100/month
- **Total**: $600-900/month

**Cost Optimization Tips:**
1. Use SageMaker Serverless Inference for low/variable traffic
2. Enable OpenSearch UltraWarm for older data
3. Set up auto-scaling for SageMaker endpoints
4. Use Lambda reserved concurrency limits
5. Implement caching in API Gateway

## Troubleshooting

### Deployment Issues

**Error: "Resource already exists"**
```powershell
# Destroy existing stacks first
cdk destroy --all
```

**Error: "VPC limit reached"**
```
Request VPC limit increase or use existing VPC
```

### Runtime Issues

**SageMaker endpoint not responding:**
```powershell
aws sagemaker describe-endpoint --endpoint-name streamsmart-inference-endpoint
```

**OpenSearch not reachable:**
```powershell
# Check security groups and VPC configuration
aws opensearch describe-domain --domain-name streamsmart-vectors
```

**Lambda timeout:**
- Increase timeout in `api-stack.ts`
- Check CloudWatch Logs for detailed errors

### Embedding Generation Issues

**Out of memory:**
```powershell
# Process in smaller batches
python generate_embeddings.py --batch-size 50
```

**Model download fails:**
```powershell
# Pre-download model
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"
```

## Development Workflow

### Testing Locally

```powershell
# Test Lambda function locally
cd lambda/recommendation-api
pip install -r requirements.txt
python -c "from index import handler; print(handler({'body': '{\"title\":\"Python tutorial\"}'}, None))"
```

### Updating the Model

1. Update model name in `ml-pipeline-stack.ts`
2. Update dimension in OpenSearch mapping
3. Redeploy ML stack: `cdk deploy StreamSmart-MLPipeline`
4. Regenerate embeddings

### Adding New Features

1. Modify Lambda code in `lambda/recommendation-api/`
2. Build: `npm run build`
3. Deploy: `cdk deploy StreamSmart-API`

## Maintenance

### Weekly Tasks
- Review CloudWatch metrics and alarms
- Check Lambda error logs
- Monitor costs in AWS Cost Explorer

### Monthly Tasks
- Update Python dependencies
- Review and optimize OpenSearch indices
- Analyze recommendation quality metrics

### Quarterly Tasks
- Regenerate embeddings with latest data
- Update ML model if better alternatives available
- Review and optimize AWS costs

## Security Best Practices

1. **Secrets Management**
   - Use AWS Secrets Manager for API keys
   - Rotate credentials regularly
   - Never commit credentials to git

2. **Network Security**
   - Keep Lambda and SageMaker in private subnets
   - Use VPC endpoints for AWS services
   - Configure security groups restrictively

3. **Data Protection**
   - Enable encryption at rest (KMS)
   - Enable encryption in transit (TLS)
   - Implement least-privilege IAM policies

4. **Monitoring**
   - Enable AWS CloudTrail for audit logs
   - Set up AWS GuardDuty for threat detection
   - Review access patterns regularly

## Support

For issues or questions:
1. Check CloudWatch Logs
2. Review this README
3. Check AWS documentation
4. Open an issue in the repository

## License

Copyright © 2025 StreamSmart. All rights reserved.
