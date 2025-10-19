# StreamSmart Light Usage Deployment Guide

## 🎯 Perfect for: Initial Development & Testing

**Monthly Cost: ~$100** (down from $167 - 40% savings)

## What's Optimized?

### 1. OpenSearch Vector Database
**Original:** t3.medium, Multi-AZ, 100GB = $120/month
**Optimized:** t3.small.search, Single-AZ, 50GB = **$50/month**

**Capacity:**
- ✅ Handles 1-5 million vectors
- ✅ Perfect for 1000-5000 educational videos
- ✅ Sub-second query response
- ✅ Sufficient for < 1000 queries/day

**What you're giving up:**
- ⚠️ Single availability zone (if AWS has AZ issues, temporary downtime)
- ⚠️ Less storage (50GB vs 100GB)
- ⚠️ Smaller instance (still fast for light usage)

### 2. ECS Fargate
**Original:** On-demand pricing = $15/month
**Optimized:** Fargate Spot = **$5/month** (70% savings)

**What is Fargate Spot?**
- AWS spare capacity at discount
- Can be interrupted with 2-minute notice
- Perfect for dev/test (not mission-critical)

**For production later:**
- Mix: 50% on-demand, 50% spot for best balance

### 3. CloudWatch Logs
**Original:** 30-day retention = $2.50/month
**Optimized:** 7-day retention = **$1/month**

**Recommendation:**
- Keep recent logs for debugging
- Export important logs to S3 if needed

### 4. S3 Lifecycle
**Added:** Auto-archive to Glacier after 90 days
**Savings:** $0.50-1/month as data grows

## Cost Breakdown

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| **OpenSearch** | t3.small, single-AZ, 50GB | **$50** |
| **Fargate** | Spot instances | **$5** |
| **ALB** | Standard | $25 |
| **S3** | With lifecycle | $0.50 |
| **DynamoDB** | On-demand | $2 |
| **Secrets** | 4 secrets | $2 |
| **CloudWatch** | 7-day retention | $1 |
| **Bedrock** | Pay-per-use | Variable* |
| **Total** | | **~$85-90/month** |

*Bedrock costs depend on usage:
- Embeddings: $0.0001 per 1K tokens
- Text generation: $0.0003 per 1K tokens
- Estimate: $5-15/month for light usage

## Additional Savings: Scale to Zero

When not actively developing:

```bash
# Stop service (saves ~$4/day)
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

**With scale-to-zero weekends/nights:** ~$60-70/month

## Deployment

### Option 1: Automated Script (Recommended)

**Windows PowerShell:**
```powershell
.\deploy-light-usage.ps1
```

**Linux/Mac/WSL:**
```bash
chmod +x deploy-light-usage.sh
bash deploy-light-usage.sh
```

### Option 2: Use CloudFormation Directly

```bash
aws cloudformation create-stack \
  --stack-name streamsmart-light \
  --template-body file://infrastructure-light-usage.yaml \
  --parameters \
    ParameterKey=VpcId,ParameterValue=vpc-0cc433a6e70c9d8a3 \
    ParameterKey=SubnetIds,ParameterValue="subnet-090f0ddbfc59fadbd,subnet-09e2d9ccd6fd72143" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ap-south-1 \
  --profile streamsmart-admin
```

## Performance Expectations

### OpenSearch t3.small.search
- **Indexing speed:** 1000-2000 documents/second
- **Query latency:** 50-200ms for vector search
- **Concurrent queries:** 10-20 without issues
- **Storage:** 50GB = ~500K-1M video transcripts

### Fargate Spot
- **Interruption rate:** < 5% in practice
- **Notice:** 2 minutes before interruption
- **Auto-restart:** Service automatically restarts on new spot capacity

## When to Upgrade?

Upgrade to production configuration when:

1. **Traffic increases:**
   - More than 1000 queries/day
   - Need higher availability (99.9%+ uptime)

2. **Data grows:**
   - More than 1M vectors
   - Storage approaching 40GB

3. **Performance issues:**
   - Query latency > 500ms
   - Frequent Fargate spot interruptions

## Upgrade Path

### To Minimal Production (~$130/month)
```yaml
# In infrastructure-light-usage.yaml
OpenSearch:
  InstanceType: t3.small.search
  InstanceCount: 2              # Add second node
  ZoneAwarenessEnabled: true    # Enable multi-AZ
```

Then use on-demand Fargate:
```bash
# In ECS service creation
--launch-type FARGATE  # Instead of FARGATE_SPOT
```

### To Full Production (~$150-180/month)
- Upgrade to t3.medium.search
- Enable dedicated master nodes
- Add CloudWatch alarms and auto-scaling
- Set up multi-region backups

## Monitoring Light Usage

### Key Metrics to Watch

1. **OpenSearch:**
```bash
# Check cluster health
aws opensearch describe-domain \
  --domain-name streamsmart-rag \
  --region ap-south-1 \
  --query 'DomainStatus.ClusterConfig'
```

2. **Cost Explorer:**
- Check weekly in AWS Console
- Set budget alert at $120/month

3. **Fargate Spot:**
- Monitor interruptions in CloudWatch
- If > 5% interruption rate, consider on-demand

## FAQ

### Q: Will OpenSearch t3.small be fast enough?
**A:** Yes! For light usage (< 1000 queries/day, < 1M vectors), t3.small provides excellent performance. You'll see sub-second query responses.

### Q: What happens if Fargate Spot gets interrupted?
**A:** ECS automatically restarts your task on new spot capacity within 1-2 minutes. For dev/test, this is acceptable. For production, use on-demand.

### Q: Can I switch to production later without downtime?
**A:** Almost. You can update the CloudFormation stack to add a second OpenSearch node, which will cause a brief disruption (~5 minutes). Plan during low-traffic period.

### Q: How do I estimate my actual Bedrock costs?
**A:** Monitor after first week:
```bash
# Check Bedrock usage
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://bedrock-filter.json
```

## Next Steps

1. **Deploy light usage configuration:**
   ```bash
   bash deploy-light-usage.sh
   ```

2. **Test with real data:**
   - Upload 10-100 video transcripts
   - Test query performance
   - Monitor costs in AWS Console

3. **Monitor for 1-2 weeks:**
   - Check CloudWatch metrics
   - Review AWS Cost Explorer
   - Adjust if needed

4. **Upgrade when ready:**
   - Update CloudFormation parameters
   - Migrate to production config

## Support Commands

### Check Current Costs
```bash
# Get month-to-date costs
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

### OpenSearch Health
```bash
# Check domain status
aws opensearch describe-domain \
  --domain-name streamsmart-rag \
  --region ap-south-1
```

### ECS Service Status
```bash
# Check running tasks
aws ecs describe-services \
  --cluster streamsmart-cluster \
  --services streamsmart-backend \
  --region ap-south-1
```

### CloudWatch Logs
```bash
# Tail backend logs
aws logs tail /ecs/streamsmart-backend \
  --follow \
  --region ap-south-1
```

---

**Ready to deploy?** Run:
```bash
bash deploy-light-usage.sh
```

You'll have a fully functional RAG chatbot backend for ~$100/month! 🚀
