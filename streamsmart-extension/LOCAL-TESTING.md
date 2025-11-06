# StreamSmart Extension - Local Testing Guide

## Prerequisites
- ✅ Chrome, Edge, or Brave browser
- ✅ Frontend running on http://localhost:3000
- ✅ Backend running on http://localhost:8000 (optional)

## Installation Steps

### 1. Open Extensions Page
**Chrome/Edge/Brave:**
```
chrome://extensions/
edge://extensions/
brave://extensions/
```

Or navigate manually:
- Click browser menu (⋮)
- Go to: Extensions → Manage Extensions

### 2. Enable Developer Mode
- Toggle **"Developer mode"** switch (top-right corner)

### 3. Load Extension
1. Click **"Load unpacked"** button
2. Navigate to extension folder:
   ```
   C:\Users\HARI\Desktop\StreamSmart\streamsmart-extension
   ```
3. Select the folder and click **"Select Folder"**

### 4. Verify Installation
- Extension should appear with name: **"StreamSmart Transcript Extractor"**
- Pin it to toolbar for easy access (click pin icon)

## Testing Scenarios

### Test 1: YouTube Transcript Extraction
1. **Go to YouTube:**
   ```
   https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ```

2. **Click extension icon** in browser toolbar

3. **Expected behavior:**
   - Extension popup opens
   - Shows video title and channel
   - Displays "Extract Transcript" button
   - Clicking extracts and shows transcript text

### Test 2: Authentication Sync
1. **Open your web app:**
   ```
   http://localhost:3000
   ```

2. **Login** with your credentials

3. **Check extension:**
   - Should automatically sync auth token
   - Extension should show "Logged in as: [your-email]"

4. **Check console logs:**
   - Press F12 in popup
   - Should see: "✅ Auth synced to extension successfully"

### Test 3: Send Transcript to Backend
1. **Extract transcript** from YouTube video (Test 1)

2. **Click "Send to StreamSmart"** button in extension

3. **Expected behavior:**
   - Shows loading state
   - Sends to: `http://localhost:8000/api/transcripts/save`
   - Success message: "Transcript saved!"

4. **Verify in backend logs:**
   - Backend should log: "Received transcript for video: [video-id]"

### Test 4: Playlist Integration
1. **While on YouTube video**, click extension

2. **Click "Add to Playlist"**

3. **Select playlist** from dropdown

4. **Verify:**
   - Video added to selected playlist
   - Appears in web app at: http://localhost:3000/playlists

## Debugging

### View Extension Logs
1. **Popup logs:**
   - Right-click extension icon → "Inspect popup"
   - Console shows popup script logs

2. **Background service worker logs:**
   - Go to: `chrome://extensions/`
   - Find StreamSmart extension
   - Click "service worker" link
   - Console shows background script logs

3. **Content script logs:**
   - Open YouTube video
   - Press F12 (DevTools)
   - Console shows content script logs
   - Look for: `[StreamSmart Content Script]` messages

### Common Issues

**Issue 1: Extension not appearing**
- ✅ Solution: Refresh extensions page, check folder path

**Issue 2: "Manifest file is missing or unreadable"**
- ✅ Solution: Make sure you selected the `streamsmart-extension` folder, not a subfolder

**Issue 3: "Cannot access chrome:// or edge:// URLs"**
- ✅ Solution: This is normal, extensions can't run on browser internal pages

**Issue 4: Auth not syncing**
- ✅ Solution: 
  - Check frontend is running on localhost:3000
  - Clear browser storage: DevTools → Application → Clear storage
  - Login again

**Issue 5: Backend API calls failing**
- ✅ Solution:
  - Verify backend is running: http://localhost:8000/health
  - Check CORS settings in backend
  - Check extension permissions in manifest.json

## Updating Extension After Code Changes

1. **Make changes** to extension files

2. **Reload extension:**
   - Go to: `chrome://extensions/`
   - Find StreamSmart extension
   - Click **reload icon** (🔄)

3. **Test changes** immediately

**Note:** You don't need to remove and re-add the extension!

## Extension Files Structure

```
streamsmart-extension/
├── manifest.json              # Extension configuration
├── background/
│   └── service-worker.js      # Background scripts
├── content/
│   ├── youtube-scraper.js     # YouTube page interaction
│   ├── webapp-auth-sync.js    # Auth sync with web app
│   └── styles.css             # Content script styles
├── popup/
│   ├── popup.html             # Extension popup UI
│   └── popup.js               # Popup logic
└── utils/
    └── transcript-parser.js   # Transcript extraction logic
```

## Production Deployment (Later)

When ready to publish:

1. **Update manifest.json** with production URLs:
   ```json
   "host_permissions": [
     "https://your-amplify-url.amplifyapp.com/*",
     "https://your-apprunner-url.awsapprunner.com/*"
   ]
   ```

2. **Create zip file:**
   ```powershell
   Compress-Archive -Path * -DestinationPath ../streamsmart-extension-v1.0.0.zip
   ```

3. **Upload to Chrome Web Store:**
   - https://chrome.google.com/webstore/devconsole
   - Pay $5 one-time developer fee
   - Submit for review (2-3 days)

## Tips for Development

1. **Keep DevTools open** while testing
2. **Check all 3 console locations** (popup, background, content script)
3. **Test on different YouTube videos** (some don't have transcripts)
4. **Test with and without authentication**
5. **Clear cache** if behavior seems odd

## Support

If extension doesn't work:
1. Check console logs in all 3 places
2. Verify manifest.json has correct permissions
3. Make sure localhost servers are running
4. Try removing and re-adding extension

## Summary

✅ **Local testing is easy** - just load unpacked extension  
✅ **No publishing required** - works immediately  
✅ **Fast iteration** - reload extension after changes  
✅ **Full debugging** - Chrome DevTools support  
✅ **Production ready** - same code, just update URLs later
