# Fix AI Feed 404 Error - Deployment Guide

## Problem Identified
Your AI feed is failing with a 404 error because:
1. Frontend calls: `POST /api/v1/recommend`
2. Backend was missing this exact endpoint
3. Environment variables weren't properly configured

## Solution Implemented

### 1. Backend Changes (Already Done)
- Created `ai_recommendation_api.py` with the `/api/v1/recommend` endpoint
- Fixed CSV file path to use `educational_youtube_content.csv`
- Integrated router in `main.py`

### 2. Deploy Updated Backend to App Runner

```bash
# 1. Navigate to backend directory
cd python_backend

# 2. Build and push new Docker image
docker build -t streamsmart-backend:latest .

# 3. Tag for ECR
docker tag streamsmart-backend:latest 560271561936.dkr.ecr.ap-south-1.amazonaws.com/streamsmart-backend:latest

# 4. Push to ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 560271561936.dkr.ecr.ap-south-1.amazonaws.com
docker push 560271561936.dkr.ecr.ap-south-1.amazonaws.com/streamsmart-backend:latest

# 5. Update App Runner service
# Go to AWS Console > App Runner > Your service > Deploy
```

### 3. Update Amplify Environment Variables

Go to AWS Amplify Console and add these environment variables:

```env
NEXT_PUBLIC_BACKEND_URL=https://ppbmdfvxrc.ap-south-1.awsapprunner.com
NEXT_PUBLIC_ENABLE_AI_RECOMMENDATIONS=true
STREAMSMART_AWS_REGION=ap-south-2
STREAMSMART_AWS_ACCESS_KEY_ID=<your-aws-access-key-id>
STREAMSMART_AWS_SECRET_ACCESS_KEY=<your-aws-secret-access-key>
```

**Note:** Use your actual AWS credentials from `.env.local` file (not committed to git)

### 4. Test the Fix

After deployment, test the endpoint directly:

```bash
# Test backend health
curl https://ppbmdfvxrc.ap-south-1.awsapprunner.com/health

# Test AI recommendation endpoint
curl -X POST https://ppbmdfvxrc.ap-south-1.awsapprunner.com/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"title": "Python Programming", "topN": 10}'
```

### 5. Verify in Browser

1. Open your Amplify app: https://main.de7gjtsqdtkvr.amplifyapp.com/
2. Navigate to AI Feed
3. Check browser console - the 404 error should be resolved

## Alternative Quick Fix (If deployment takes time)

You can also update your frontend to use the existing endpoint:

```typescript
// In src/services/aiRecommendationService.ts
// Change from: /api/v1/recommend
// To: /api/recommendations/suggest

// But the request/response format needs adjustment
```

## Monitoring

Check App Runner logs for any errors:
```bash
aws logs tail /aws/apprunner/streamsmart-backend --follow
```

## Success Indicators

✅ Backend returns 200 OK on `/api/v1/recommend`
✅ AI Feed loads recommendations without 404 errors
✅ Console shows successful API calls

## Need Help?

If issues persist:
1. Check App Runner service is running
2. Verify environment variables in Amplify
3. Check CORS settings in backend
4. Review CloudWatch logs for errors
