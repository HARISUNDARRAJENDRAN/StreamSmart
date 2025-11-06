# StreamSmart Extension - Quick Start Guide

## Step-by-Step Deployment

### 1. Update URLs for Production (2 minutes)

Open PowerShell in the `streamsmart-extension` directory and run:

```powershell
.\update-production-urls.ps1
```

This will automatically update all localhost URLs to your production URLs:
- Frontend: `https://main.de7gjtsqdtkvr.amplifyapp.com`
- Backend: `https://ppbmdfvxrc.ap-south-1.awsapprunner.com`

### 2. Create Extension Icons (5 minutes)

#### Option A: Quick Placeholder Icons
Create a simple colored square icon:
1. Open Paint or any image editor
2. Create 3 images:
   - 16x16 pixels → Save as `icons/icon16.png`
   - 48x48 pixels → Save as `icons/icon48.png`
   - 128x128 pixels → Save as `icons/icon128.png`
3. Use a solid color (e.g., blue) with white text "SS"

#### Option B: Professional Icons (Recommended)
Use an online tool:
- [Favicon.io](https://favicon.io/) - Generate from text/image
- [Canva](https://www.canva.com/) - Design custom icons
- [Figma](https://www.figma.com/) - Professional design

Requirements:
- PNG format
- Transparent background
- Simple, recognizable design
- Matches your brand

### 3. Test Locally (10 minutes)

1. **Load the Extension:**
   - Open Chrome
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `streamsmart-extension` folder

2. **Test on YouTube:**
   - Go to any YouTube video
   - Look for the StreamSmart button near the video
   - Click it to extract transcript
   - Should redirect to your Amplify app for authentication

3. **Test Full Flow:**
   ```
   YouTube video → Extract → Login → Select Playlist → Add Video
   ```

4. **Verify in Web App:**
   - Go to https://main.de7gjtsqdtkvr.amplifyapp.com
   - Login
   - Check playlists - video should be there

### 4. Package for Distribution (2 minutes)

```powershell
.\package-extension.ps1
```

This creates `streamsmart-extension-v1.0.0.zip` ready for distribution.

### 5. Distribution Options

#### Option A: Private Beta (Easiest)
**Best for:** Testing with a few users

1. Share the ZIP file
2. Users install:
   - Extract ZIP
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select extracted folder

**Pros:** Immediate, no approval needed
**Cons:** Manual updates, users need Developer mode

#### Option B: Chrome Web Store (Recommended)
**Best for:** Public release

1. **Register:**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Pay $5 one-time fee
   - Create developer account

2. **Upload Extension:**
   - Click "New Item"
   - Upload `streamsmart-extension-v1.0.0.zip`
   - Fill store listing:
     ```
     Name: StreamSmart Transcript Extractor
     Summary: Extract YouTube transcripts for AI-powered learning
     Description: [See below]
     Category: Productivity
     Language: English
     ```

3. **Add Screenshots:**
   - Take 3-5 screenshots showing:
     - Extension popup
     - YouTube integration
     - Transcript extraction process
     - Playlist management

4. **Privacy Policy:**
   - Create a simple privacy policy (required)
   - Host on your website or use a service like [Privacy Policy Generator](https://www.privacypolicygenerator.info/)

5. **Submit for Review:**
   - Takes 1-3 days
   - You'll receive email when approved

**Pros:** Auto-updates, discoverable, trusted
**Cons:** Review process, small fee

## Sample Store Listing

### Description
```
StreamSmart Transcript Extractor - Your YouTube Learning Companion

Extract and save YouTube video transcripts with one click. Perfect for students, researchers, and lifelong learners.

Features:
• 🎯 One-click transcript extraction from any YouTube video
• 📚 Organize videos into custom playlists
• 🤖 AI-powered recommendations
• ☁️ Cloud sync across devices
• 🔒 Secure authentication

How it works:
1. Watch any YouTube video
2. Click the StreamSmart button
3. Transcript is extracted and saved
4. Access from your StreamSmart web dashboard

Perfect for:
✓ Students taking online courses
✓ Researchers gathering information
✓ Content creators studying competitors
✓ Anyone who learns from YouTube

Privacy: We only access YouTube pages when you click the extension button. Your data is securely stored in your private account.

Need help? Visit: https://main.de7gjtsqdtkvr.amplifyapp.com
```

## Troubleshooting

### Extension not showing on YouTube
**Solution:**
- Refresh the YouTube page
- Check if extension is enabled in `chrome://extensions/`
- Right-click extension icon → "This can read and change site data" → "On all sites"

### "Failed to connect to backend"
**Solution:**
- Verify backend is running: https://ppbmdfvxrc.ap-south-1.awsapprunner.com/health
- Check browser console for CORS errors
- Ensure URLs are updated (run `update-production-urls.ps1` again)

### Authentication not working
**Solution:**
- Clear extension storage:
  - Go to `chrome://extensions/`
  - Click extension "Details"
  - Scroll to "Site settings"
  - Clear data
- Try logging in again at your web app

### Transcript extraction fails
**Solution:**
- Some videos don't have transcripts
- Check if captions are available on YouTube
- Try a different video

## Updating the Extension

When you make changes:

1. **Update version in `manifest.json`:**
   ```json
   "version": "1.0.1"
   ```

2. **Package new version:**
   ```powershell
   .\package-extension.ps1
   ```

3. **For Chrome Web Store:**
   - Upload new ZIP to developer dashboard
   - Users get auto-update within 24-48 hours

4. **For local testing:**
   - Go to `chrome://extensions/`
   - Click "Update" button (top left)

## Next Steps

1. ✅ Run `update-production-urls.ps1`
2. ✅ Create icons in `icons/` folder
3. ✅ Test locally with "Load unpacked"
4. ✅ Fix any issues
5. ✅ Run `package-extension.ps1`
6. ✅ Choose distribution method
7. ✅ Deploy!

---

**Need help?** Check `PRODUCTION-DEPLOYMENT.md` for detailed instructions.
