# Deploy to Render (100% FREE)

## Step-by-Step Render Deployment

### 1. Sign Up for Render
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (no credit card needed!)
3. Connect your GitHub account

### 2. Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repo
3. Configure:
   ```
   Name: streamsmart-backend
   Root Directory: python_backend
   Environment: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

### 3. Add Environment Variables
In Render dashboard, add:
```
GEMINI_API_KEY = your_gemini_api_key
MONGODB_URI = your_mongodb_atlas_connection_string
JWT_SECRET = any_random_string_here
ADMIN_JWT_SECRET = another_random_string
```

### 4. Deploy!
- Render auto-deploys when you push to GitHub
- You'll get a URL like: `https://streamsmart-backend.onrender.com`
- First deploy takes ~5-10 minutes

### 5. Update Vercel Environment
In your Vercel dashboard:
```
NEXT_PUBLIC_API_URL = https://streamsmart-backend.onrender.com
```

## Free Tier Limits
- ✅ 512MB RAM (enough for your app)
- ✅ Shared CPU (sufficient for moderate usage)
- ✅ 500 build hours/month (very generous)
- ✅ Auto-sleep after 15 min inactivity (wakes up in ~30 seconds)
- ✅ Custom domains supported
- ✅ HTTPS included

## Test Your Deployment
```bash
curl https://streamsmart-backend.onrender.com/health
# Should return: {"status": "healthy"}
```

## Pro Tips
- Apps sleep after 15 min of inactivity (free tier limitation)
- First request after sleep takes ~30 seconds to wake up
- Use a simple ping service to keep it awake if needed
- Render has excellent build logs and monitoring 