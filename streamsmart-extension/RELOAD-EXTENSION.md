# How to Reload Your Extension After URL Changes

## Quick Steps:

1. **Open Chrome Extensions Page:**
   ```
   chrome://extensions/
   ```

2. **Find "StreamSmart Transcript Extractor"**

3. **Click the Reload Button** (circular arrow icon)
   - It's in the bottom right of the extension card

4. **Done!** Extension now uses production URLs

---

## Verify URLs Were Updated:

1. **Right-click extension icon** (in Chrome toolbar)
2. **Select "Inspect popup"**
3. **In Console tab**, type:
   ```javascript
   CONFIG.BACKEND_URL
   ```
4. **Should show**: `https://ppbmdfvxrc.ap-south-1.awsapprunner.com`

---

## Test It:

1. Go to any YouTube video
2. Click the StreamSmart button
3. Should now redirect to: `https://main.de7gjtsqdtkvr.amplifyapp.com`
4. No more localhost errors!

---

## Still Seeing localhost?

If after reloading you still see localhost:

### Option 1: Unload and Reload
1. Go to `chrome://extensions/`
2. Click "Remove" on StreamSmart extension
3. Click "Load unpacked" again
4. Select: `C:\Users\HARI\Desktop\StreamSmart\streamsmart-extension`

### Option 2: Clear Extension Storage
1. Go to `chrome://extensions/`
2. Click "Details" on StreamSmart
3. Scroll to "Site settings"
4. Click "Clear data"
5. Reload extension

---

That's it! Your extension should now connect to production. 🎉
