# StreamSmart Extension Setup

## For Beta Version

To enable extension downloads on your landing page:

1. **Zip the Extension Folder:**
   ```bash
   # Navigate to your project root
   cd streamsmart-extension
   
   # Create a zip file (Windows PowerShell)
   Compress-Archive -Path * -DestinationPath ../public/streamsmart-extension.zip
   
   # Or use any zip tool to compress the streamsmart-extension folder
   ```

2. **Place the ZIP file:**
   - The zipped extension should be placed in: `public/streamsmart-extension.zip`
   - This location is already configured in the download link

3. **Verify the Setup:**
   - The extension download page is at: `/extension-setup`
   - Users can download from: `https://yourdomain.com/streamsmart-extension.zip`

## Current Status

✅ Extension setup page created (`/extension-setup`)
✅ Download section added to landing page hero
✅ Comprehensive installation instructions provided
⏳ **Manual Step Required:** Zip and place the extension file in `/public/`

## What Users Will See

1. **Landing Page**: CTA card with "Get the Extension" button
2. **Setup Page**: 
   - Download button for the ZIP file
   - Step-by-step installation guide
   - Troubleshooting tips
   - Visual progress indicators

## Next Steps After Beta

When moving to production:
- Upload extension to Chrome Web Store
- Update download links to Chrome Web Store URL
- Remove manual installation instructions
- Add automatic update mechanism
