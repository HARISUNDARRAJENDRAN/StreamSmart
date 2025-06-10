#!/usr/bin/env python3
"""
Simple startup script for the StreamSmart backend
This ensures we're running the correct simplified version
"""

import os
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"🚀 Starting StreamSmart Backend on port {port}")
    print("📁 Using simplified main.py (no heavy ML dependencies)")
    
    # Import and run the FastAPI app from main.py
    from main import app
    uvicorn.run(app, host="0.0.0.0", port=port) 