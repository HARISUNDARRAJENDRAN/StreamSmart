# StreamSmart - Complete Deployment Checklist

## Overview
This is your master checklist for deploying the complete StreamSmart application:
- ✅ **Backend**: AWS App Runner (FastAPI)
- ✅ **Frontend**: AWS Amplify (Next.js)
- ⏳ **Extension**: Chrome Extension

## Current Status

### ✅ Backend (Deployed)
- **URL**: https://ppbmdfvxrc.ap-south-1.awsapprunner.com
- **Status**: Running
- **Issue Fixed**: Added `/api/v1/recommend` endpoint for AI feed

### ✅ Frontend (Deployed)
- **URL**: https://main.de7gjtsqdtkvr.amplifyapp.com
- **Status**: Running
- **Issue**: AI feed getting 404 (will be fixed after backend redeploy)

### ⏳ Extension (Ready to Deploy)
- **Status**: Configuration files created
- **Next**: Update URLs and deploy

---

## Deployment Tasks

### Task 1: Redeploy Backend (15 minutes)
**Why**: Fix AI feed 404 error with new `/api/v1/recommend` endpoint

#### Steps:
```bash
# 1. Navigate to backend directory
cd python_backend

# 2. Build Docker image
docker build -t streamsmart-backend:latest .

# 3. Authenticate with ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 560271561936.dkr.ecr.ap-south-1.amazonaws.com

# 4. Tag image
docker tag streamsmart-backend:latest 560271561936.dkr.ecr.ap-south-1.amazonaws.com/streamsmart-backend:latest

# 5. Push to ECR
docker push 560271561936.dkr.ecr.ap-south-1.amazonaws.com/streamsmart-backend:latest
```

#### Or use AWS Console:
1. Go to [AWS App Runner Console](https://console.aws.amazon.com/apprunner/)
2. Select your service
3. Click "Deploy"
4. Wait 5-10 minutes

#### Verify:
```bash
# Test health endpoint
curl https://ppbmdfvxrc.ap-south-1.awsapprunner.com/health

# Test new AI recommendation endpoint
curl -X POST https://ppbmdfvxrc.ap-south-1.awsapprunner.com/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"title": "Python Programming", "topN": 10}'
```

**Expected**: Should return 200 OK with recommendations

---

### Task 2: Update Amplify Environment Variables (5 minutes)

#### Steps:
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Select your app
3. Go to "Environment variables"
4. Add/Update these variables:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://ppbmdfvxrc.ap-south-1.awsapprunner.com
   NEXT_PUBLIC_ENABLE_AI_RECOMMENDATIONS=true
   ```
5. Save and redeploy

#### Verify:
1. Go to https://main.de7gjtsqdtkvr.amplifyapp.com
2. Navigate to AI Feed
3. Check browser console - no more 404 errors
4. Recommendations should load

---

### Task 3: Deploy Chrome Extension (20 minutes)

#### 3.1 Update Production URLs
```powershell
cd streamsmart-extension
.\update-production-urls.ps1
```

This updates all localhost URLs to production.

#### 3.2 Create Icons
Create 3 icon files in `streamsmart-extension/icons/`:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)  
- `icon128.png` (128x128 pixels)

**Quick Method**: Use Paint to create simple blue squares with "SS" text.

**Professional Method**: Use [Favicon.io](https://favicon.io/) or [Canva](https://www.canva.com/)

#### 3.3 Test Locally
```
1. Open Chrome
2. Go to chrome://extensions/
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select streamsmart-extension folder
6. Test on a YouTube video
```

#### 3.4 Package for Distribution
```powershell
.\package-extension.ps1
```

Creates: `streamsmart-extension-v1.0.0.zip`

#### 3.5 Distribution Options

**Option A: Private Testing (Immediate)**
- Share ZIP with testers
- They load unpacked in Developer mode

**Option B: Chrome Web Store (1-3 days review)**
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay $5 one-time fee
3. Upload ZIP
4. Fill store listing (see `streamsmart-extension/QUICK-START.md`)
5. Submit for review

---

## Testing Checklist

### Backend Tests
- [ ] Health endpoint: `GET /health`
- [ ] AI recommendations: `POST /api/v1/recommend`
- [ ] Transcript upload: `POST /api/transcripts/upload`
- [ ] Playlist operations: `/api/recommendations/*`

### Frontend Tests
- [ ] Login works (AWS Cognito)
- [ ] AI Feed loads without errors
- [ ] Playlists show videos
- [ ] Can add videos to playlists
- [ ] Search works
- [ ] Profile page loads

### Extension Tests
- [ ] Appears on YouTube pages
- [ ] Can extract transcripts
- [ ] Authentication redirects work
- [ ] Can add videos to playlists
- [ ] Popup shows correct info
- [ ] No console errors

---

## Post-Deployment Monitoring

### Check AWS CloudWatch Logs
```bash
# Backend logs
aws logs tail /aws/apprunner/streamsmart-backend --follow --region ap-south-1

# Frontend logs  
# View in AWS Amplify Console
```

### Monitor Errors
- Backend: Check App Runner logs for 500 errors
- Frontend: Check browser console for errors
- Extension: Check extension console (inspect popup)

### Performance
- Backend response times
- Frontend load times
- Database query performance

---

## Rollback Plan

If something breaks:

### Backend Rollback
1. Go to AWS App Runner Console
2. Select service
3. Click "Deployments"
4. Select previous successful deployment
5. Click "Rollback"

### Frontend Rollback
1. Go to AWS Amplify Console
2. Select app
3. Go to "Deployments"
4. Find last working commit
5. Click "Redeploy this version"

### Extension Rollback
- Revert to previous version
- Run `.\update-production-urls.ps1` with old URLs
- Reload extension

---

## Common Issues & Solutions

### Issue 1: AI Feed still shows 404
**Cause**: Backend not redeployed or cached response

**Solution**:
```bash
# 1. Verify backend deployed
curl https://ppbmdfvxrc.ap-south-1.awsapprunner.com/api/v1/recommend

# 2. Clear browser cache (Ctrl+Shift+Delete)

# 3. Hard refresh frontend (Ctrl+F5)
```

### Issue 2: CORS errors
**Cause**: Frontend domain not allowed in backend

**Solution**:
- Check `main.py` CORS settings
- Ensure Amplify domain is allowed
- Redeploy backend

### Issue 3: Extension can't connect
**Cause**: URLs not updated or CORS issue

**Solution**:
```powershell
# 1. Re-run update script
cd streamsmart-extension
.\update-production-urls.ps1

# 2. Reload extension in chrome://extensions/

# 3. Check console for errors
```

### Issue 4: Authentication fails
**Cause**: JWT secret mismatch or Cognito misconfiguration

**Solution**:
- Verify AWS Cognito pool ID and client ID
- Check JWT_SECRET matches between services
- Clear extension storage and re-authenticate

---

## Success Criteria

### Backend ✅
- [ ] `/health` returns 200 OK
- [ ] `/api/v1/recommend` returns recommendations
- [ ] All endpoints respond < 2 seconds
- [ ] No 500 errors in logs

### Frontend ✅
- [ ] Loads in < 3 seconds
- [ ] AI Feed shows recommendations
- [ ] No console errors
- [ ] All pages accessible
- [ ] Authentication works

### Extension ✅
- [ ] Installs without errors
- [ ] Connects to backend
- [ ] Can extract transcripts
- [ ] Videos appear in web app
- [ ] No popup errors

---

## Next Steps

1. **Now**: 
   - [ ] Redeploy backend (Task 1)
   - [ ] Update Amplify env vars (Task 2)

2. **Today**:
   - [ ] Test AI feed working
   - [ ] Deploy extension locally (Task 3.1-3.3)

3. **This Week**:
   - [ ] Package extension (Task 3.4)
   - [ ] Submit to Chrome Web Store (Task 3.5)

4. **Ongoing**:
   - [ ] Monitor logs
   - [ ] Collect user feedback
   - [ ] Plan improvements

---

## Resources

- **Backend Logs**: [AWS App Runner Console](https://console.aws.amazon.com/apprunner/)
- **Frontend Logs**: [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
- **Extension Guide**: `streamsmart-extension/QUICK-START.md`
- **API Docs**: Backend `/docs` endpoint (FastAPI auto-docs)

---

## Support

If you encounter issues:
1. Check relevant section in this guide
2. Review logs in AWS Console
3. Check browser/extension console
4. Verify all URLs are correct

**All deployment files committed to git and ready!**
