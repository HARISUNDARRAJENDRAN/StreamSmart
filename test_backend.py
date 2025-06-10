#!/usr/bin/env python3
"""
Simple script to test backend connectivity
"""

import requests
import json

def test_backend():
    try:
        print("Testing backend at http://localhost:8000...")
        
        # Test health endpoint
        response = requests.get("http://localhost:8000/health", timeout=5)
        print(f"Health check status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Test root endpoint
        response = requests.get("http://localhost:8000/", timeout=5)
        print(f"Root endpoint status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Connection refused - backend not running")
        return False
    except requests.exceptions.Timeout:
        print("❌ Request timeout - backend not responding")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    if test_backend():
        print("✅ Backend is working!")
    else:
        print("❌ Backend has issues")
        print("\n🔧 To start backend:")
        print("cd python_backend")
        print("uvicorn main:app --host 0.0.0.0 --port 8000 --reload") 