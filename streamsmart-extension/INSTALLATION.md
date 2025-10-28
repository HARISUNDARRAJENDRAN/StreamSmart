# Chrome Extension Installation

## Quick Fix Applied ✅

The manifest.json has been updated to remove icon references (not needed for testing).

## Load Extension in Chrome

1. **Open Chrome Extensions Page**
   - Type in address bar: `chrome://extensions/`
   - Or: Menu (⋮) → Extensions → Manage Extensions

2. **Enable Developer Mode**
   - Toggle switch in **top right corner**

3. **Load Extension**
   - Click **"Load unpacked"** button
   - Navigate to folder: `C:\Users\HARI\Desktop\StreamSmart\streamsmart-extension`
   - Click **"Select Folder"**

4. **Verify Installation**
   - Extension should appear in the list
   - Name: "StreamSmart Transcript Extractor"
   - Status: Should be enabled (toggle on)

## Test Extension

1. **Go to YouTube Video**
   - Example: https://www.youtube.com/watch?v=Tn6-PIqc4UM
   
2. **Look for Button**
   - Scroll down below the video player
   - Look for purple "Send to StreamSmart" button
   - It appears near the Like/Share buttons area

3. **Click Extension Icon** (Alternative)
   - Click the puzzle piece icon (🧩) in Chrome toolbar
   - Find "StreamSmart Transcript Extractor"
   - Click it to open popup

## If Extension Still Won't Load

### Check for Errors:

1. After clicking "Load unpacked", if there's an error:
   - Click "Details" on the error message
   - Copy the full error text
   - Share it so we can fix it

### Common Issues:

**Error: "Manifest file is missing or unreadable"**
- Make sure you selected the correct folder
- Path should be: `streamsmart-extension` (not a subfolder)

**Error: "Could not load javascript file"**
- Check if all JS files exist:
  - `content/youtube-scraper.js` ✅
  - `background/service-worker.js` ✅
  - `utils/transcript-parser.js` ✅
  - `popup/popup.js` ✅

**Error: "Could not load popup.html"**
- Check if file exists: `popup/popup.html` ✅

### Verify Files Exist:

Run in Command Prompt:
```cmd
dir "C:\Users\HARI\Desktop\StreamSmart\streamsmart-extension"
dir "C:\Users\HARI\Desktop\StreamSmart\streamsmart-extension\content"
dir "C:\Users\HARI\Desktop\StreamSmart\streamsmart-extension\background"
dir "C:\Users\HARI\Desktop\StreamSmart\streamsmart-extension\popup"
dir "C:\Users\HARI\Desktop\StreamSmart\streamsmart-extension\utils"
```

All directories should exist with files inside.

## After Successful Load

### Test on YouTube:

1. Open: https://www.youtube.com/watch?v=Tn6-PIqc4UM
2. Open browser console: Press **F12**
3. Look for log: `🎬 StreamSmart: YouTube scraper loaded`
4. Look for button below video (may take 2-3 seconds to appear)

### Check Background Worker:

1. Go to: `chrome://extensions/`
2. Find "StreamSmart Transcript Extractor"
3. Click "Details"
4. Under "Inspect views", click "service worker"
5. Console should show: `🔧 StreamSmart: Service worker initialized`

## Need Help?

If extension loads but doesn't work:
- Check browser console (F12) for errors
- Check service worker console (see above)
- Ensure backend is running: `http://localhost:8000/health`
- Try refreshing the YouTube page

The extension is now ready to test! 🚀
