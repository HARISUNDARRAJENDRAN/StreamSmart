# 🚀 Deploy StreamSmart NOW - Step by Step

## ✅ Pre-Deployment Checklist
- [x] AWS CLI configured
- [x] Application builds successfully
- [x] All dependencies installed
- [ ] GitHub repository pushed (recommended)

## Step 1: Deploy Frontend to AWS Amplify (10 minutes)

### Option A: Deploy from GitHub (Recommended - Auto CI/CD)

1. **Push your code to GitHub** (if not already):
   ```powershell
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Open AWS Amplify Console**:
   ```
   https://console.aws.amazon.com/amplify/home?region=ap-south-2#/create
   ```

3. **Follow these steps in browser**:
   - Click "Host web app"
   - Choose "GitHub" → Authorize AWS Amplify
   - Select repository: `StreamSmart`
   - Select branch: `main`
   - Amplify will auto-detect Next.js ✅
   
4. **Configure build settings** (auto-detected, but verify):
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

5. **Add Environment Variables**:
   ```
   JWT_SECRET=<your-jwt-secret>
   NEXT_PUBLIC_AWS_REGION=<your-region>
   NEXT_PUBLIC_COGNITO_USER_POOL_ID=<your-pool-id>
   NEXT_PUBLIC_COGNITO_CLIENT_ID=<your-client-id>
   NEXT_PUBLIC_YOUTUBE_API_KEY=<your-youtube-key>
   
   IMPORTANT: Copy ALL values from your .env.local file
   ```

6. **Click "Save and deploy"**

7. **Wait for deployment** (~5 minutes)
   - Build will show progress
   - You'll get a URL like: `https://main.d1234abcd.amplifyapp.com`

### Option B: Deploy without Git (Manual Upload)

1. **Build the app**:
   ```powershell
   npm run build
   ```

2. **Open Amplify Console**:
   ```
   https://console.aws.amazon.com/amplify/home?region=ap-south-2
   ```

3. **Click "Deploy without Git"**

4. **Drag and drop the `.next` folder**

5. **Add environment variables** (same as above)

---

## Step 2: Deploy Backend to AWS App Runner (15 minutes)

### Prerequisites:
- Docker Desktop running

### Steps:

1. **Run the deployment script**:
   ```powershell
   cd aws-deployment
   .\2-deploy-backend-apprunner.ps1
   ```

2. **When prompted, choose Option 1** (Console UI)

3. **The script will**:
   - ✅ Build Docker image
   - ✅ Push to ECR
   - ✅ Open App Runner console

4. **In App Runner Console**:
   - Service name: `streamsmart-backend`
   - Port: `8000`
   - CPU: `2 vCPU`
   - Memory: `4 GB`
   - Health check: `/health`
   
5. **Add Environment Variables** (CRITICAL - Copy from .env.local):
   ```
   AWS_REGION=<your-region>
   USE_DYNAMODB=true
   AWS_ACCOUNT_ID=<your-account-id>
   STREAMSMART_AWS_REGION=<your-region>
   S3_TRANSCRIPT_BUCKET=<your-bucket-name>
   AWS_RAG_S3_BUCKET=<your-rag-bucket-name>
   OPENSEARCH_ENDPOINT=<your-opensearch-endpoint>
   AWS_ELASTICACHE_HOST=<your-redis-host>
   VIDEOS_TABLE=Videos
   ```

6. **Configure Auto-scaling**:
   - Min instances: `1`
   - Max instances: `10`

7. **Click "Create & deploy"**

8. **Wait for deployment** (~10 minutes)
   - Service will show "Running" when ready
   - You'll get a URL like: `https://abc123xyz.ap-south-2.awsapprunner.com`

---

## Step 3: Connect Frontend to Backend (2 minutes)

1. **Copy your App Runner URL** from Step 2

2. **Update Amplify Environment Variables**:
   - Go to Amplify Console → Your App → Environment variables
   - Add: `NEXT_PUBLIC_BACKEND_URL` = `https://your-apprunner-url.awsapprunner.com`

3. **Trigger redeploy**:
   - In Amplify Console, click "Redeploy this version"
   - Or push a new commit to GitHub

---

## Step 4: Verify Deployment (5 minutes)

### Test Frontend:
1. Open your Amplify URL
2. Should see landing page
3. Try to login/register

### Test Backend:
```powershell
curl https://your-apprunner-url.awsapprunner.com/health
# Should return: {"status": "healthy"}
```

### Test Full Integration:
1. Login to your app
2. Navigate to AI Feed
3. Try searching for videos
4. Check if playlists load

---

## Step 5: Set Up CloudFront CDN (Optional, 5 minutes)

For global access optimization:

```powershell
.\3-setup-global-cdn.ps1
```

**Note**: Amplify already includes CloudFront! This step is only for backend API caching.

---

## Troubleshooting

### Build Fails in Amplify:
- Check build logs in Amplify Console
- Verify all environment variables are set
- Make sure JWT_SECRET is set

### Backend Fails to Start:
- Check CloudWatch logs
- Verify environment variables
- Test Docker image locally first:
  ```powershell
  docker run -p 8000:8000 your-image-name
  ```

### Can't Access from Certain Countries:
- CloudFront is automatically enabled for Amplify
- For backend, set up CloudFront distribution

---

## Expected Costs

### Development (Low Traffic):
- Amplify: $15/month
- App Runner: $25/month
- **Total**: ~$40/month (+ existing AWS services)

### Production (Moderate Traffic):
- Amplify: $30/month
- App Runner: $80/month
- **Total**: ~$110/month (+ existing AWS services)

---

## Next Steps After Deployment

1. **Custom Domain** (Optional):
   - Buy domain or use existing
   - Configure in Route 53
   - Add to Amplify app

2. **Monitoring**:
   - Set up CloudWatch alerts
   - Monitor costs in Billing Dashboard
   - Check error rates

3. **Optimization**:
   - Enable caching
   - Optimize images
   - Set up CDN for static assets

---

## Getting Your URLs

After deployment, you'll have:

- **Frontend URL**: `https://main.d1234abcd.amplifyapp.com`
- **Backend URL**: `https://abc123xyz.ap-south-2.awsapprunner.com`

Save these URLs! You'll need them for configuration.

---

## Support

If you encounter issues:
1. Check AWS Service Health Dashboard
2. Review CloudWatch logs
3. Check Amplify build logs
4. Verify IAM permissions

---

## Summary

✅ **Time to Deploy**: ~30-45 minutes
✅ **Monthly Cost**: $40-110 (excluding existing services)
✅ **Uptime SLA**: 99.99%
✅ **Global Access**: Via CloudFront CDN
✅ **Auto-Scaling**: Automatic based on traffic
✅ **Zero Maintenance**: AWS-managed services

**Ready to go live? Start with Step 1 above!**
