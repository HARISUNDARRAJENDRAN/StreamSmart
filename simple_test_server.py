#!/usr/bin/env python3
"""
Simple test server to verify FastAPI is working
"""

from fastapi import FastAPI
import uvicorn

app = FastAPI(title="Test Server")

@app.get("/")
async def root():
    return {"message": "Test server is working"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/test")
async def test():
    return {
        "message": "Backend is responding",
        "status": "ok",
        "endpoints": ["/", "/health", "/test"]
    }

if __name__ == "__main__":
    print("Starting simple test server...")
    uvicorn.run(app, host="127.0.0.1", port=8000) 