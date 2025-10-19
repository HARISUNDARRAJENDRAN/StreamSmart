# Cost Optimization Guide - StreamSmart Backend

## Current Cost Breakdown

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| ECS Fargate | 0.25 vCPU, 0.5 GB | ~$15 |
| Application Load Balancer | Standard | ~$25 |
| **OpenSearch** | **t3.medium, 100GB** | **~$120** ⚠️ |
| S3 | 10 GB | ~$0.30 |
| DynamoDB | On-demand | ~$2.50 |
| Secrets Manager | 4 secrets | ~$2 |
| CloudWatch Logs | 5 GB | ~$2.50 |
| **Total** | | **~$167/month** |

## 🎯 Optimization Strategies

### Strategy 1: Dev/Testing Environment (~$35-45/month)
**Savings: ~75% ($122/month saved)**

Perfect for development, testing, and low-traffic demos.

| Service | Optimized Config | Cost | Savings |
|---------|-----------------|------|---------|
| ECS Fargate | **Fargate Spot** (70% cheaper) | ~$5 | -$10 |
| ALB | Same (needed for HTTPS) | ~$25 | $0 |
| **OpenSearch** | **t3.small.search, 20GB** | **~$50** | **-$70** |
| S3 | Intelligent-Tiering | ~$0.20 | -$0.10 |
| DynamoDB | On-demand | ~$1 | -$1.50 |
| Secrets Manager | 4 secrets | ~$2 | $0 |
| CloudWatch | Reduced retention | ~$1 | -$1.50 |
| **Total** | | **~$84/month** | **-$83** |

**With stop when not in use: ~$35-45/month**

### Strategy 2: Serverless OpenSearch (~$85-95/month)
**Savings: ~50% ($72-82/month saved)**

Use OpenSearch Serverless - pay only for what you use.

| Service | Configuration | Est. Cost |
|---------|--------------|-----------|
| ECS Fargate | Spot instances | ~$5 |
| ALB | Standard | ~$25 |
| **OpenSearch Serverless** | **OCU-based billing** | **~$50-60** |
| Other services | Optimized | ~$5 |
| **Total** | | **~$85-95/month** |

### Strategy 3: Alternative Vector Database (~$50-70/month)
**Savings: ~60% ($97-117/month saved)**

Replace OpenSearch with cheaper vector database options.

#### Option A: Pinecone (Free tier available)
- Free tier: 1M vectors, 5 pods
- Paid: $70/month for 10M vectors
- **Total with free tier: ~$47/month**

#### Option B: PostgreSQL + pgvector on RDS
- RDS t4g.micro: ~$15/month
- Much cheaper than OpenSearch
- **Total: ~$57/month**

#### Option C: Redis with vector search (use existing ElastiCache)
- You already have ElastiCache Redis!
- Redis Stack supports vector similarity search
- **Additional cost: $0** (use existing instance)
- **Total: ~$47/month**

### Strategy 4: Minimal Production (~$110/month)
**Savings: ~35% ($57/month saved)**

Optimized but production-ready.

| Service | Configuration | Cost |
|---------|--------------|------|
| ECS Fargate | 0.25 vCPU, 0.5GB (on-demand) | ~$15 |
| ALB | Standard | ~$25 |
| OpenSearch | t3.small, 50GB, single-AZ | ~$60 |
| Other services | Standard | ~$10 |
| **Total** | | **~$110/month** |

## 🔧 Detailed Optimization Actions

### 1. OpenSearch Optimization (Biggest Impact)

#### A. Use Smaller Instance for Development
```bash
# Modify CloudFormation parameter
sed -i 's/t3.medium/t3.small.search/g' ecs-task-definitions/infrastructure-cloudformation.yaml

# Change storage
# In YAML: VolumeSize: 20 (instead of 100)
```

**Savings: ~$70/month**

#### B. Switch to OpenSearch Serverless

**Create serverless collection:**
```bash
aws opensearchserverless create-collection \
  --name streamsmart-rag \
  --type VECTORSEARCH \
  --region ap-south-1 \
  --profile streamsmart-admin
```

**Pros:**
- Pay only for indexing and search OCUs used
- Auto-scales based on demand
- No idle costs when not in use

**Cons:**
- Minimum 2 OCUs (~$25/month) when active
- Can be more expensive at scale

**Estimated cost:** $50-60/month for low-medium usage

#### C. Replace with Redis Vector Search (Best for your case)

Since you **already have ElastiCache Redis**, you can use it for vector search!

**Update backend code** to use Redis instead of OpenSearch:

```python
# Add to requirements.txt
redis[hiredis]>=5.0.1
redis-py-cluster>=2.1.3

# Use Redis vector search
# Redis supports HNSW indexing similar to OpenSearch
```

**Savings: ~$120/month** (OpenSearch completely eliminated)

### 2. ECS Fargate Optimization

#### A. Use Fargate Spot (Development)
```yaml
# In task definition or service creation
capacityProviderStrategy:
  - capacityProvider: FARGATE_SPOT
    weight: 1
    base: 0
```

**Savings: ~$10/month (70% off Fargate costs)**

#### B. Scale to Zero When Not in Use
```bash
# Stop service when not needed
aws ecs update-service \
  --cluster streamsmart-cluster \
  --service streamsmart-backend \
  --desired-count 0 \
  --region ap-south-1 \
  --profile streamsmart-admin

# Start when needed
aws ecs update-service \
  --cluster streamsmart-cluster \
  --service streamsmart-backend \
  --desired-count 1 \
  --region ap-south-1 \
  --profile streamsmart-admin
```

**Create start/stop scripts for convenience.**

### 3. ALB Optimization

ALB is needed for HTTPS and routing, but:

#### Development Alternative: API Gateway
Replace ALB with API Gateway HTTP API for dev:
- $1.00 per million requests
- No monthly charge
- Perfect for low-traffic dev/test

**Savings: ~$25/month for development**

**Note:** You'll need to adjust frontend URLs.

### 4. Storage & Logs Optimization

#### A. S3 Lifecycle Policies
```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket YOUR-S3-BUCKET \
  --lifecycle-configuration '{
    "Rules": [{
      "Id": "ArchiveOldTranscripts",
      "Status": "Enabled",
      "Transitions": [{
        "Days": 30,
        "StorageClass": "GLACIER_IR"
      }]
    }]
  }'
```

**Savings: ~$0.50/month**

#### B. CloudWatch Logs Retention
```bash
aws logs put-retention-policy \
  --log-group-name /ecs/streamsmart-backend \
  --retention-in-days 7 \
  --region ap-south-1 \
  --profile streamsmart-admin
```

**Savings: ~$1.50/month**

## 🏆 Recommended Configurations

### Configuration 1: Ultra-Low-Cost Dev ($35-50/month)
**Best for: Initial development and testing**

```yaml
Resources:
  - ECS Fargate Spot: $5
  - API Gateway (instead of ALB): $1
  - Redis Vector Search (existing): $0
  - S3 + DynamoDB + Logs: $5
  - Secrets Manager: $2
  Total: ~$13/month when running
  
  # Scale to zero when not using: ~$2/month
```

**Trade-offs:**
- No always-on availability
- Single instance (no HA)
- Limited search performance

### Configuration 2: Cost-Optimized Production ($90-110/month)
**Best for: Low-traffic production or pilot**

```yaml
Resources:
  - ECS Fargate (on-demand): $15
  - ALB: $25
  - OpenSearch t3.small (single-AZ): $60
  - S3 + DynamoDB: $5
  - CloudWatch + Secrets: $5
  Total: ~$110/month
```

**Trade-offs:**
- Single availability zone (lower HA)
- Smaller search index capacity
- Good for <1M vectors

### Configuration 3: Balanced Production ($130-150/month)
**Best for: Production with good performance**

```yaml
Resources:
  - ECS Fargate with auto-scaling: $20
  - ALB: $25
  - OpenSearch t3.small (multi-AZ): $90
  - S3 + DynamoDB: $5
  - CloudWatch + Secrets: $5
  Total: ~$145/month
```

## 💡 My Recommendation

### For Development & Testing (Start Here)
**Total: ~$50-60/month**

1. ✅ **Use existing Redis for vector search** (saves $120/month)
2. ✅ **Fargate Spot** (saves $10/month)
3. ✅ **Keep ALB** (needed for proper routing)
4. ✅ **Optimize CloudWatch retention** (saves $1.50/month)
5. ✅ **Scale to zero nights/weekends** (saves another $20/month)

**This gets you from $167 → ~$50-60/month (70% savings)**

### Transition to Production Later
When you need more scale:
- Add OpenSearch t3.small ($60/month)
- Switch to on-demand Fargate ($10/month more)
- Enable multi-AZ ($30/month more)

## 🚀 Implementation: Use Redis Vector Search

Let me create a modified deployment that uses your **existing ElastiCache Redis** instead of OpenSearch:

### Benefits:
- ✅ **Saves $120/month** (entire OpenSearch cost)
- ✅ Use infrastructure you already have
- ✅ Redis is faster for small-to-medium datasets
- ✅ Simpler architecture

### Considerations:
- ⚠️ Redis has lower vector capacity than OpenSearch (~1M vectors vs 10M+)
- ⚠️ Less advanced search features
- ✅ Perfect for your use case (educational videos)

Would you like me to:
1. Create a Redis-based vector search implementation?
2. Modify the deployment to use Redis instead of OpenSearch?
3. Show you how to migrate from OpenSearch to Redis later?

## 📊 Cost Comparison Summary

| Configuration | Monthly Cost | Savings | Use Case |
|--------------|--------------|---------|----------|
| Original Plan | $167 | - | Production ready |
| **Dev + Redis** | **$50-60** | **-$107** | **🎯 Recommended Start** |
| Dev + Serverless OS | $85-95 | -$72 | More scalable dev |
| Minimal Prod | $110 | -$57 | Small production |
| Optimized Prod | $130-150 | -$17-37 | Balanced production |

## Next Steps

1. **Choose configuration** based on your needs and budget
2. **Modify CloudFormation template** with optimized settings
3. **Update deployment scripts** with new parameters
4. **Deploy with cost-optimized configuration**

Would you like me to create a cost-optimized deployment package for the **$50-60/month configuration using Redis**?
