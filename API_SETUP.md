# StreamSmart API Setup Guide

## Required API Keys for Full Functionality

### 1. YouTube Data API v3 Key (For AI Video Suggestions)

**Steps to get YouTube API Key:**
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select existing one
3. Enable "YouTube Data API v3" 
4. Go to Credentials → Create Credentials → API Key
5. Restrict the key to YouTube Data API v3 for security
6. Copy the API key

### 2. Gemini AI API Key (For AI Features)

**Steps to get Gemini API Key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

### 3. Environment Variables Setup

Create a `.env.local` file in your project root with:

```env
# YouTube Data API v3 Key
YOUTUBE_API_KEY=your_actual_youtube_api_key

# Gemini AI API Key  
GEMINI_API_KEY=your_actual_gemini_api_key

# Next.js Configuration
NEXTAUTH_URL=http://localhost:9002
NEXTAUTH_SECRET=your-secret-key-here
```

### 4. Restart Development Server

After adding the API keys, restart your development server:
```bash
npm run dev
```

## Features Enabled by API Keys

- **YouTube API Key**: AI video suggestions, video metadata fetching, thumbnails
- **Gemini AI Key**: Mind maps, quizzes, chatbot, content recommendations

## API Usage Limits

- **YouTube API**: 10,000 units/day (free tier)
- **Gemini AI**: Generous free tier with rate limits

## Security Notes

- Never commit `.env.local` to version control
- Restrict API keys to specific services
- Monitor usage in respective consoles 