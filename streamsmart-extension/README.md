# StreamSmart Transcript Extractor

Chrome extension to extract YouTube video transcripts and send them to StreamSmart for AI-powered learning.

## Features

- **One-Click Extraction**: Extract transcripts directly from YouTube
- **Automatic Caching**: Transcripts are cached for all users
- **Manual Fallback**: Users can also manually paste transcripts
- **Recent History**: View recently extracted transcripts
- **Status Indicator**: Shows if transcript is already cached

## Installation

### For Development

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `streamsmart-extension` folder
5. The extension icon should appear in your toolbar

### For Users

1. Download from Chrome Web Store (coming soon)
2. Click "Add to Chrome"
3. Grant permissions when prompted

## Usage

### Method 1: Via Extension Button (Recommended)

1. Navigate to any YouTube video
2. Click the **"Send to StreamSmart"** button below the video
3. Wait for extraction (5-10 seconds)
4. Success! The transcript is now available in StreamSmart

### Method 2: Via Extension Popup

1. Navigate to any YouTube video
2. Click the StreamSmart extension icon in toolbar
3. Click "Extract Transcript"
4. Wait for confirmation

## Requirements

- Chrome browser (v88 or higher)
- StreamSmart backend running at `http://localhost:8000`
- YouTube video must have captions enabled

## Configuration

### Backend URL

By default, the extension connects to `http://localhost:8000`. To change this:

1. Open `content/youtube-scraper.js`
2. Update the `BACKEND_URL` constant
3. Reload the extension

## How It Works

1. **Detection**: Extension detects YouTube watch pages
2. **DOM Scraping**: Extracts transcript segments from YouTube's DOM
3. **Parsing**: Cleans and formats transcript data
4. **Upload**: Sends to StreamSmart backend via REST API
5. **Storage**: Backend stores in S3 and indexes in DynamoDB
6. **Caching**: Future users get instant access

## API Endpoints Used

- `POST /api/transcripts/upload` - Upload transcript
- `GET /api/transcripts/check/{videoId}` - Check if cached
- `GET /health` - Backend health check

## Troubleshooting

### Extension not showing button

- Refresh the YouTube page
- Check if transcript/captions are enabled on the video
- Verify extension is enabled in `chrome://extensions/`

### Upload fails

- Ensure backend is running (`http://localhost:8000/health`)
- Check browser console for errors (F12 → Console)
- Verify AWS credentials are configured in backend

### Transcript extraction fails

- Video must have captions/transcript enabled
- Some videos don't allow transcript extraction
- Try manual upload instead

## Development

### File Structure

```
streamsmart-extension/
├── manifest.json              # Extension config
├── content/
│   ├── youtube-scraper.js     # Main content script
│   └── styles.css             # Injected button styles
├── background/
│   └── service-worker.js      # Background tasks
├── popup/
│   ├── popup.html             # Extension popup
│   ├── popup.css              # Popup styles
│   └── popup.js               # Popup logic
├── utils/
│   └── transcript-parser.js   # Transcript utilities
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Testing

1. Load extension in development mode
2. Open YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
3. Click "Send to StreamSmart" button
4. Check backend logs for upload confirmation
5. Verify in DynamoDB: `aws dynamodb scan --table-name Transcripts`

### Building for Production

1. Update version in `manifest.json`
2. Create icon files (16x16, 48x48, 128x128)
3. Zip the extension folder
4. Upload to Chrome Web Store

## Privacy

- Extension only runs on YouTube.com
- No tracking or analytics
- Transcripts are stored securely in AWS S3
- No personal data is collected

## License

MIT License - See LICENSE file

## Support

For issues or questions:
- GitHub Issues: [repo link]
- Email: support@streamsmart.app

## Changelog

### v1.0.0 (2025-10-28)
- Initial release
- Basic transcript extraction
- S3/DynamoDB integration
- Popup UI with recent history
