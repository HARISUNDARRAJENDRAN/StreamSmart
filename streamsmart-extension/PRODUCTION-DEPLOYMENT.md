# StreamSmart Extension - Production Deployment Guide

## Overview
This guide will help you deploy the StreamSmart Chrome Extension to work with your production environment:
- **Frontend**: https://main.de7gjtsqdtkvr.amplifyapp.com
- **Backend**: https://ppbmdfvxrc.ap-south-1.awsapprunner.com

## Step 1: Update Configuration Files

### 1.1 Update `popup/popup.js`
```javascript
// Change from:
const CONFIG = {
  BACKEND_URL: 'http://localhost:8000'
};

// To:
const CONFIG = {
  BACKEND_URL: 'https://ppbmdfvxrc.ap-south-1.awsapprunner.com'
};
```

### 1.2 Update `popup/popup.html`
```html
<!-- Change from: -->
<a href="http://localhost:3000" target="_blank" class="link">Open StreamSmart</a>

<!-- To: -->
<a href="https://main.de7gjtsqdtkvr.amplifyapp.com" target="_blank" class="link">Open StreamSmart</a>
```

### 1.3 Update `content/youtube-scraper.js`
```javascript
// Change CONFIG object (around line 10):
const CONFIG = {
  BACKEND_URL: 'https://ppbmdfvxrc.ap-south-1.awsapprunner.com',
  BUTTON_ID: 'streamsmart-extract-btn',
  STATUS_ID: 'streamsmart-status'
};

// Update authentication redirect (line 150):
window.open('https://main.de7gjtsqdtkvr.amplifyapp.com/playlists', '_blank');

// Update API calls (lines 224, 362, 637):
// From: http://localhost:3000/api/...
// To: https://main.de7gjtsqdtkvr.amplifyapp.com/api/...
```

### 1.4 Update `background/service-worker.js`
```javascript
// Change CONFIG object (around line 9):
const CONFIG = {
  BACKEND_URL: 'https://ppbmdfvxrc.ap-south-1.awsapprunner.com',
  FRONTEND_URL: 'https://main.de7gjtsqdtkvr.amplifyapp.com',
  STORAGE_KEYS: {
    USER_TOKEN: 'userToken',
    USER_ID: 'userId',
    USER_EMAIL: 'userEmail'
  }
};

// Update API calls (line 184):
// From: http://localhost:3000/api/...
// To: https://main.de7gjtsqdtkvr.amplifyapp.com/api/...
```

### 1.5 Replace manifest.json with production version
```bash
# Backup current manifest
cp manifest.json manifest.local.json

# Use production manifest
cp manifest.production.json manifest.json
```

## Step 2: Create Extension Icons

Create icons in `streamsmart-extension/icons/` folder:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

You can use a simple design or logo for your extension.

## Step 3: Package the Extension

### Option A: Load Unpacked (For Testing)
1. Open Chrome/Edge/Brave
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `streamsmart-extension` folder
6. Test on YouTube videos

### Option B: Package as ZIP (For Distribution)
```bash
# Navigate to extension directory
cd streamsmart-extension

# Create a ZIP file (exclude development files)
# Windows PowerShell:
Compress-Archive -Path .\* -DestinationPath ..\streamsmart-extension-v1.0.0.zip -Force
```

## Step 4: Publish to Chrome Web Store (Optional)

### 4.1 Prerequisites
- Google Developer account ($5 one-time fee)
- Privacy policy URL
- Store listing assets:
  - Description
  - Screenshots
  - Promotional images

### 4.2 Publishing Steps
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click "New Item"
3. Upload the ZIP file
4. Fill in store listing:
   - **Name**: StreamSmart Transcript Extractor
   - **Description**: Extract YouTube transcripts and sync with your StreamSmart AI learning assistant
   - **Category**: Productivity
   - **Language**: English
5. Add screenshots showing:
   - Extension popup
   - YouTube integration
   - Transcript extraction
6. Submit for review (takes 1-3 days)

## Step 5: Testing Production Extension

### 5.1 Test Authentication Flow
1. Install the extension
2. Go to any YouTube video
3. Click the StreamSmart button
4. Should redirect to: `https://main.de7gjtsqdtkvr.amplifyapp.com/playlists`
5. Login with AWS Cognito
6. Return to YouTube and try extracting transcript

### 5.2 Test Transcript Extraction
1. On YouTube video page, click StreamSmart button
2. Wait for transcript extraction
3. Select a playlist
4. Click "Add to Playlist"
5. Verify video appears in your web app

### 5.3 Test API Connectivity
```javascript
// Open extension popup
// Open browser DevTools (F12)
// In Console, run:
fetch('https://ppbmdfvxrc.ap-south-1.awsapprunner.com/health')
  .then(r => r.json())
  .then(console.log)
```

## Step 6: Distribution Options

### Option 1: Chrome Web Store (Recommended)
- **Pros**: Auto-updates, discoverable, trusted
- **Cons**: Review process, $5 fee
- **Best for**: Public release

### Option 2: Direct Distribution
- **Pros**: Immediate availability
- **Cons**: Manual updates, users need to enable Developer mode
- **Best for**: Private beta testing

#### Direct Distribution Steps:
1. Package as ZIP (Step 3B)
2. Share ZIP file with users
3. Users install via "Load unpacked"

### Option 3: Enterprise Deployment
- Use Chrome Policy for force-installing extensions
- Best for organizational deployments

## Troubleshooting

### Issue 1: Extension not communicating with backend
**Solution:**
- Check CORS settings in backend to allow Amplify domain
- Verify backend URL is correct in all files
- Check browser console for CORS errors

### Issue 2: Authentication not working
**Solution:**
- Verify JWT_SECRET matches between extension and backend
- Check AWS Cognito settings
- Clear extension storage: DevTools → Application → Storage

### Issue 3: Transcript extraction fails
**Solution:**
- Check backend `/api/transcripts/upload` endpoint
- Verify S3 bucket permissions
- Check YouTube API quota

### Issue 4: Videos not appearing in playlists
**Solution:**
- Verify DynamoDB table permissions
- Check API endpoint responses in Network tab
- Ensure userId is being passed correctly

## Security Checklist

- [ ] Remove all `localhost` references
- [ ] Use HTTPS for all API calls
- [ ] Validate JWT tokens on backend
- [ ] Implement rate limiting
- [ ] Don't expose API keys in extension code
- [ ] Use content security policy
- [ ] Minimize permissions in manifest

## Maintenance

### Updating the Extension
1. Make changes to extension files
2. Update version in `manifest.json`
3. Re-package and upload to Chrome Web Store
4. Users receive auto-update within 24-48 hours

### Monitoring
- Monitor backend logs for extension API calls
- Track error rates in backend
- Collect user feedback via Chrome Web Store reviews

## Support

For issues:
1. Check browser console logs
2. Check backend CloudWatch logs
3. Verify all URLs are updated to production
4. Test with Developer mode enabled

---

**Next Steps:**
1. Update all configuration files (Step 1)
2. Create icons (Step 2)
3. Test with "Load unpacked" (Step 3A)
4. Once working, package for distribution (Step 3B)
5. Decide on distribution method (Step 6)
