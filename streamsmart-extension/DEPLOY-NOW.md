# Deploy Chrome Extension NOW (5 minutes)

## Skip the icons - just get it working! 🚀

Chrome will use a default icon. You can add custom icons later.

---

## Step 1: Update URLs (1 minute)

```powershell
cd C:\Users\HARI\Desktop\StreamSmart\streamsmart-extension
.\update-production-urls.ps1
```

✅ This updates all localhost URLs to your production URLs

---

## Step 2: Load in Chrome (2 minutes)

1. **Open Chrome**

2. **Go to extensions page:**
   ```
   chrome://extensions/
   ```

3. **Enable Developer mode** (toggle in top-right corner)

4. **Click "Load unpacked"**

5. **Select folder:**
   ```
   C:\Users\HARI\Desktop\StreamSmart\streamsmart-extension
   ```

6. **Done!** You should see "StreamSmart Transcript Extractor" in your extensions list

---

## Step 3: Test It (2 minutes)

1. **Go to YouTube:**
   ```
   https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ```

2. **Look for the StreamSmart button** (should appear near the video)

3. **Click it** - Extension popup should open

4. **Click "Extract Transcript"**

5. **Select a playlist** and click "Add to Playlist"

6. **Check your web app:**
   ```
   https://main.de7gjtsqdtkvr.amplifyapp.com/playlists
   ```
   Video should appear in your playlist!

---

## Troubleshooting

### Extension not showing on YouTube
**Fix:**
- Refresh the YouTube page (F5)
- Check if extension is enabled in `chrome://extensions/`

### "Failed to connect to backend"
**Fix:**
- Verify backend is running: https://ppbmdfvxrc.ap-south-1.awsapprunner.com/health
- Check browser console (F12) for errors
- Make sure you ran `update-production-urls.ps1`

### Authentication not working
**Fix:**
- Go to your web app first: https://main.de7gjtsqdtkvr.amplifyapp.com
- Login there
- Then try the extension again

### No button on YouTube
**Fix:**
- Right-click extension icon → "Manage extension"
- Under "Site access" → Select "On all sites"
- Refresh YouTube

---

## What About Icons?

Chrome will show a default puzzle piece icon. This is fine for testing!

**To add icons later:**
1. Create 3 PNG files:
   - `icons/icon16.png` (16x16)
   - `icons/icon48.png` (48x48)  
   - `icons/icon128.png` (128x128)
2. Update manifest.json to include icons section
3. Reload extension in Chrome

**For now, just test functionality first!**

---

## Sharing with Others

### Option A: Quick Share (Immediate)
1. Run: `.\package-extension.ps1`
2. Share the ZIP file
3. Others extract and load unpacked

### Option B: Chrome Web Store (Takes 1-3 days)
1. Get icons ready
2. Go to: https://chrome.google.com/webstore/devconsole
3. Pay $5 one-time fee
4. Upload packaged extension
5. Wait for approval

---

## Next Steps

1. ✅ Test extension locally (follow steps above)
2. ✅ Fix any issues
3. ✅ Share with team/testers
4. Later: Add icons and publish to Chrome Web Store

---

**That's it! Your extension should be working now. 🎉**

No icons needed for testing - just get it working first!
