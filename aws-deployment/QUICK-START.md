# StreamSmart AWS Deployment - Quick Start Guide
## Deploy in 30 Minutes (Always-On, Global Access)

## What You'll Get
- ✅ **Always-On**: No manual instance management
- ✅ **Auto-Scaling**: Handles traffic spikes automatically
- ✅ **Global Access**: Fast from anywhere in the world (CloudFront CDN)
- ✅ **99.99% Uptime**: AWS-managed services with SLA
- ✅ **Keep AWS Services**: No migration needed (DynamoDB, S3, Cognito, Bedrock)

## Cost: ~$60-280/month
- Development: ~$60/month
- Production (moderate traffic): ~$150-280/month

## Prerequisites (5 minutes)
1. ✅ AWS Account with billing enabled
2. ✅ AWS CLI configured (`aws configure`)
3. ✅ Docker installed and running
4. ✅ Node.js and npm installed

## Deployment Steps

### Step 1: Deploy Frontend (10 minutes)
**Option A: One-Click (Easiest)**
```powershell
cd aws-deployment
.\1-deploy-frontend-amplify.ps1
# Choose option 1 (One-Click Deploy)
# Follow browser instructions
```

**What happens:**
- AWS Amplify builds and hosts your Next.js app
- Automatic SSL certificate
- CloudFront CDN included (global access)
- Auto-deploy on Git push

**Result:** Your frontend is live at `https://xxx.amplifyapp.com`

---

### Step 2: Deploy Backend (15 minutes)
```powershell
.\2-deploy-backend-apprunner.ps1
# Choose option 1 (Console UI)
```

**What happens:**
1. Builds Docker container from your FastAPI code
2. Pushes to AWS ECR (container registry)
3. Creates App Runner service (always-on)
4. Configures auto-scaling (1-10 instances)

**Configuration in Console:**
- Port: `8000`
- CPU: `2 vCPU`
- Memory: `4 GB`
- Health check: `/health`
- Environment variables: Copy from `.env.local`:
  ```
  AWS_REGION=ap-south-2
  USE_DYNAMODB=true
  AWS_ACCOUNT_ID=<your-account-id>
  STREAMSMART_AWS_REGION=<your-region>
  S3_TRANSCRIPT_BUCKET=<your-bucket-name>
  (add others from .env.local)
  ```

**Result:** Backend live at `https://abc123.ap-south-2.awsapprunner.com`

---

### Step 3: Connect Frontend to Backend (2 minutes)
1. Copy your App Runner URL from Step 2
2. Update Amplify environment variables:
   ```bash
   # In Amplify Console → Environment variables
   NEXT_PUBLIC_BACKEND_URL=https://your-apprunner-url.awsapprunner.com
   ```
3. Redeploy frontend (automatic or manual trigger)

---

### Step 4: Set Up Global CDN (5 minutes)
```powershell
.\3-setup-global-cdn.ps1
```

**For Frontend:**
- Already done! Amplify includes CloudFront automatically

**For Backend (Optional but recommended):**
- Create CloudFront distribution pointing to App Runner
- Enables caching and faster API responses globally

---

## Verification Checklist
- [ ] Frontend loads at Amplify URL
- [ ] Backend health check works: `curl https://your-backend/health`
- [ ] Frontend can call backend API
- [ ] DynamoDB tables are accessible
- [ ] S3 buckets are accessible
- [ ] Cognito authentication works
- [ ] Test from different locations (use https://tools.keycdn.com/performance)

## Testing Global Access
1. Go to https://tools.keycdn.com/performance
2. Enter your Amplify URL
3. See response times from 10+ global locations
4. Should see <200ms for most locations

## Custom Domain (Optional, +10 minutes)
If you have a domain (e.g., streamsmart.com):

1. **In Route 53:**
   - Create hosted zone
   - Add NS records to your domain registrar

2. **In Amplify:**
   - Go to Domain Management
   - Add custom domain
   - Follow SSL setup wizard

3. **For Backend API:**
   - Create CNAME in Route 53: `api.streamsmart.com → CloudFront`
   - Or point directly to App Runner URL

## Troubleshooting

### Frontend build fails
```powershell
# Test build locally first
npm run build
# Fix any errors, then redeploy
```

### Backend container fails
```powershell
# Test Docker locally
cd python_backend
docker build -t test .
docker run -p 8000:8000 test
# Visit http://localhost:8000/health
```

### Can't access from certain countries
- Check CloudFront distribution is enabled
- Verify geo-restrictions are not set
- Check App Runner is in correct region

### High costs
- Reduce App Runner instances (min: 1, max: 3)
- Enable request-based pricing (for low traffic)
- Set up CloudWatch alerts for budget

## Monitoring & Logs

### View Logs
```bash
# Frontend logs (Amplify)
aws amplify list-apps
aws amplify get-app --app-id YOUR_APP_ID

# Backend logs (App Runner)
aws apprunner list-services
# Then view in CloudWatch Console
```

### Set Up Alerts
```bash
# Create SNS topic for alerts
aws sns create-topic --name streamsmart-alerts

# Subscribe your email
aws sns subscribe \
  --topic-arn arn:aws:sns:<region>:<account-id>:streamsmart-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com

# Create CloudWatch alarms
# (Do this in CloudWatch Console for easier setup)
```

## Scaling Configuration

### Low Traffic (Development)
```
App Runner:
- Min instances: 1
- Max instances: 3
- Cost: ~$25-40/month
```

### Medium Traffic (Production)
```
App Runner:
- Min instances: 2
- Max instances: 10
- Cost: ~$80-150/month
```

### High Traffic
```
App Runner:
- Min instances: 5
- Max instances: 25
- Cost: ~$200-400/month
```

## Next Steps After Deployment

1. **Set up CI/CD**
   - Amplify auto-deploys from Git (already done)
   - Set up GitHub Actions for backend
   - Add pre-deployment tests

2. **Add Custom Domain**
   - Looks more professional
   - Better for SEO
   - Easier to remember

3. **Set up Monitoring**
   - CloudWatch dashboards
   - Error tracking with Sentry
   - User analytics with Google Analytics

4. **Optimize Costs**
   - Review CloudWatch metrics
   - Adjust auto-scaling based on traffic
   - Enable caching aggressively

5. **Improve Performance**
   - Add API caching (CloudFront)
   - Optimize database queries
   - Enable compression

## Getting Help
- AWS Amplify: https://docs.amplify.aws/
- AWS App Runner: https://docs.aws.amazon.com/apprunner/
- CloudFront: https://docs.aws.amazon.com/cloudfront/
- StreamSmart Issues: Create issue in your GitHub repo

## Summary
✅ **Frontend**: Amplify Hosting (auto-scaling, CDN, SSL)  
✅ **Backend**: App Runner (auto-scaling, health checks, always-on)  
✅ **Database**: DynamoDB (already set up)  
✅ **Storage**: S3 (already set up)  
✅ **Auth**: Cognito (already set up)  
✅ **ML**: Bedrock (already set up)  
✅ **CDN**: CloudFront (global access)  
✅ **Monitoring**: CloudWatch (included)  

**Total Time**: 30-45 minutes  
**Ongoing Cost**: $60-280/month depending on traffic  
**Maintenance**: Minimal (AWS-managed services)
