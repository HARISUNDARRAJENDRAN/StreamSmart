# Deployment Guide: Frontend (Vercel) + Backend (Cloud)

## Current Issue
- ✅ Frontend deployed on Vercel
- ❌ Backend running locally (can't be reached by Vercel)
- ❌ RAG chatbot fails because frontend can't connect to backend

## Solution Architecture
```
Vercel (Frontend) → Cloud Provider (Backend) → MongoDB Atlas
```

## Step 1: Deploy Python Backend

### Option A: Railway (Recommended)

1. **Go to [Railway.app](https://railway.app)**
2. **Connect your GitHub repo**
3. **Deploy from `python_backend` folder**:
   - Select your repo
   - Choose "Deploy from GitHub repo"
   - Set root directory to `python_backend`
4. **Add environment variables**:
   ```
   GEMINI_API_KEY=your_gemini_key
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_jwt_secret
   ADMIN_JWT_SECRET=your_admin_secret
   ```
5. **Railway will auto-deploy** and give you a URL like:
   ```
   https://your-app-name.railway.app
   ```

### Option B: Render

1. **Go to [Render.com](https://render.com)**
2. **Create Web Service**:
   - Connect GitHub repo
   - Root Directory: `python_backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. **Add environment variables** (same as above)
4. **Deploy** - you'll get a URL like:
   ```
   https://your-app-name.onrender.com
   ```

### Option C: Heroku

1. **Install Heroku CLI**
2. **Login and create app**:
   ```bash
   heroku login
   heroku create your-app-name
   ```
3. **Deploy**:
   ```bash
   cd python_backend
   git init
   git add .
   git commit -m "Deploy backend"
   heroku git:remote -a your-app-name
   git push heroku main
   ```
4. **Set environment variables**:
   ```bash
   heroku config:set GEMINI_API_KEY=your_key
   heroku config:set MONGODB_URI=your_mongodb_uri
   ```

## Step 2: Update Frontend Environment Variables

### In your Vercel dashboard:

1. **Go to your Vercel project settings**
2. **Environment Variables section**
3. **Add/Update**:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
   ```
   (Replace with your actual deployed backend URL)

### Or update `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

## Step 3: Update CORS in Backend

Make sure your `main.py` has the correct CORS origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-vercel-app.vercel.app",  # Your Vercel URL
        "https://*.vercel.app"  # All Vercel apps
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Step 4: Test the Connection

### Test backend directly:
```bash
curl https://your-backend-url.railway.app/health
```

Should return:
```json
{"status": "healthy", "models_loaded": true}
```

### Test from frontend:
Your Vercel app should now be able to connect to the backend and the RAG chatbot should work!

## Quick Deployment Commands

### For Railway:
```bash
# Just push to GitHub, Railway auto-deploys
git add .
git commit -m "Deploy backend"
git push origin main
```

### For Render:
```bash
# Connect repo in Render dashboard
# It will auto-deploy on git push
```

### For manual deployment check:
```bash
# Test your deployed backend
curl https://your-backend-url/health
curl https://your-backend-url/
```

## Environment Variables Needed

### Backend (Railway/Render/Heroku):
```
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your_random_jwt_secret
ADMIN_JWT_SECRET=your_random_admin_secret
PORT=8000 (usually auto-set by hosting provider)
```

### Frontend (Vercel):
```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

## Troubleshooting

### If RAG chatbot still shows error:
1. Check Vercel logs: `vercel logs`
2. Check backend logs in Railway/Render dashboard
3. Verify environment variables are set
4. Test backend URL directly in browser
5. Check CORS configuration

### Common issues:
- Backend URL wrong in frontend env vars
- CORS not allowing Vercel domain
- Environment variables missing
- Backend not starting (check logs)

## Success Indicators

✅ **Backend health check works**:
```bash
curl https://your-backend-url.railway.app/health
# Returns: {"status": "healthy"}
```

✅ **Frontend can reach backend**:
- No more "Error processing videos" in chatbot
- Videos process successfully
- RAG queries return answers

✅ **Full flow working**:
1. User uploads video URL on Vercel app
2. Vercel frontend sends request to Railway backend
3. Railway backend processes video & stores in MongoDB
4. User can chat with transcript via RAG 