# Deploy Frontend to Vercel - Complete Guide

## Step 1: Prepare Your Project

### 1.1 Check Project Structure
Your project should look like:
```
StreamSmart/
├── src/                 # React/Next.js frontend
├── python_backend/      # Backend (already deployed to Render)
├── package.json         # Frontend dependencies
├── next.config.js       # Next.js config
└── .env.local          # Environment variables (local)
```

### 1.2 Create/Update Next.js Config
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}

module.exports = nextConfig
```

### 1.3 Create Vercel Config (Optional)
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "functions": {
    "app/**/*.{js,ts,jsx,tsx}": {
      "runtime": "nodejs18.x"
    }
  }
}
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

#### 2.1 Sign Up/Login to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub account
3. Authorize Vercel to access your repositories

#### 2.2 Import Your Project
1. Click **"New Project"**
2. **Import Git Repository**
3. Select your `StreamSmart` repository
4. Configure project:
   ```
   Framework Preset: Next.js
   Root Directory: . (leave as root)
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

#### 2.3 Set Environment Variables
**CRITICAL: Add this environment variable:**
```
NEXT_PUBLIC_API_URL = https://your-render-backend.onrender.com
```
*(Replace with your actual Render backend URL)*

#### 2.4 Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. Get your Vercel URL: `https://your-app.vercel.app`

### Option B: Deploy via Vercel CLI

#### 2.1 Install Vercel CLI
```bash
npm install -g vercel
```

#### 2.2 Login and Deploy
```bash
# Login to Vercel
vercel login

# Deploy from project root
vercel

# Follow prompts:
# Set up and deploy? Y
# Which scope? [Your account]
# Link to existing project? N
# Project name: StreamSmart
# Directory: ./
# Override settings? N
```

## Step 3: Configure Environment Variables

### 3.1 In Vercel Dashboard
1. Go to your project in Vercel dashboard
2. **Settings** → **Environment Variables**
3. Add:
   ```
   Name: NEXT_PUBLIC_API_URL
   Value: https://your-render-backend.onrender.com
   Environment: Production, Preview, Development
   ```

### 3.2 For Local Development
Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com
```

## Step 4: Update CORS in Backend

Your backend needs to allow requests from Vercel:

### 4.1 Update Backend CORS Settings
In your `python_backend/main.py`, update CORS origins:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
        "https://your-app.vercel.app",  # Your specific Vercel URL
        "https://vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4.2 Redeploy Backend
Push the CORS changes to trigger Render redeploy:
```bash
git add .
git commit -m "Update CORS for Vercel deployment"
git push origin main
```

## Step 5: Test Your Deployment

### 5.1 Test Frontend
1. Visit your Vercel URL
2. Check if the app loads
3. Open browser console (F12) for any errors

### 5.2 Test Backend Connection
1. Open browser console on your Vercel app
2. Run:
```javascript
fetch('https://your-render-backend.onrender.com/health')
  .then(r => r.json())
  .then(console.log)
```

### 5.3 Test RAG Functionality
1. Try adding a YouTube video
2. Ask questions in the chatbot
3. Should work without "Error processing videos"

## Step 6: Custom Domain (Optional)

### 6.1 Add Custom Domain
1. In Vercel dashboard → **Settings** → **Domains**
2. Add your domain: `your-domain.com`
3. Configure DNS records as shown

### 6.2 Update Backend CORS
Add your custom domain to CORS origins in backend.

## Troubleshooting

### Build Errors
- Check `package.json` has all dependencies
- Ensure Node.js version compatibility
- Check for TypeScript errors

### Runtime Errors
- Verify environment variables are set
- Check browser console for CORS errors
- Verify backend URL is accessible

### CORS Issues
```javascript
// Test CORS from browser console
fetch('https://your-backend.onrender.com/health', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
}).then(r => console.log('CORS:', r.status))
```

## Success Checklist

✅ Frontend deployed to Vercel
✅ Environment variables configured
✅ Backend CORS updated
✅ Health check works
✅ RAG chatbot processes videos
✅ Questions get answered

## Common Commands

```bash
# Deploy updates
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs [deployment-url]

# Set environment variable
vercel env add NEXT_PUBLIC_API_URL
``` 