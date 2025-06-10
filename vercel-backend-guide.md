# Host Backend on Vercel (100% FREE)

## Why Use Vercel for Backend?
- ✅ Already hosting your frontend there
- ✅ 100GB bandwidth/month (free)
- ✅ Serverless functions (Python supported)
- ✅ No separate deployment needed
- ✅ Same domain (no CORS issues!)

## Setup Steps

### 1. Create API folder structure
```
your-project/
├── src/               # Your existing frontend
├── api/               # NEW: Backend endpoints
│   ├── health.py
│   ├── rag-answer.py
│   └── process-videos.py
└── vercel.json        # Configuration
```

### 2. Create vercel.json
```json
{
  "functions": {
    "api/**/*.py": {
      "runtime": "python3.9"
    }
  },
  "env": {
    "GEMINI_API_KEY": "@gemini-api-key",
    "MONGODB_URI": "@mongodb-uri",
    "JWT_SECRET": "@jwt-secret"
  }
}
```

### 3. Create requirements.txt in root
```txt
fastapi==0.104.1
google-generativeai==0.3.2
pymongo==4.6.0
python-jose[cryptography]==3.3.0
python-multipart==0.0.6
transformers==4.36.2
torch==2.1.2
sentence-transformers==2.2.2
```

### 4. Create API endpoints

**api/health.py:**
```python
from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {"status": "healthy", "platform": "vercel"}
        self.wfile.write(json.dumps(response).encode())
```

### 5. Update frontend to use relative URLs
Instead of:
```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`);
```

Use:
```typescript
const response = await fetch('/api/health');
```

## Advantages
- Same domain (no CORS issues)
- Free forever
- Auto-scaling
- Global CDN
- Simple deployment (one git push)

## Limitations
- 10-second function timeout (hobby plan)
- Cold starts (~1-3 seconds)
- Limited to stateless functions
- 50MB deployment size limit

## Best for
- ✅ Simple RAG queries
- ✅ Text processing
- ✅ API endpoints
- ❌ Large ML model loading (use Render instead) 