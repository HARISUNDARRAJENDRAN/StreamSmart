#!/usr/bin/env python3
"""
Test the enhanced video processing endpoint
"""

import asyncio
import requests
import json
import os

async def test_enhance_video_endpoint():
    print("=== TESTING ENHANCED VIDEO ENDPOINT ===")
    
    # Check if backend is running
    backend_url = "http://localhost:8000"
    
    try:
        health_response = requests.get(f"{backend_url}/health")
        if health_response.status_code == 200:
            print("✅ Backend is running")
        else:
            print("❌ Backend health check failed")
            return
    except requests.exceptions.ConnectionError:
        print("❌ Backend is not running. Please start it with: uvicorn main:app --reload")
        return
    
    # Test video
    test_video_url = "https://www.youtube.com/watch?v=BwuLxPH8IDs"  # TypeScript video
    test_video_id = "BwuLxPH8IDs"
    
    print(f"\n🎥 Testing with video: {test_video_url}")
    
    # Prepare request data
    request_data = {
        "youtube_url": test_video_url,
        "video_id": test_video_id
    }
    
    print("\n📡 Sending request to /enhance-video endpoint...")
    
    try:
        response = requests.post(
            f"{backend_url}/enhance-video",
            json=request_data,
            timeout=60  # Give it time to process
        )
        
        if response.status_code == 200:
            result = response.json()
            
            print("✅ Request successful!")
            print(f"Processing Method: {result.get('processing_method', 'unknown')}")
            print(f"Enhanced Summary Length: {len(result.get('enhanced_summary', ''))}")
            print(f"Enhanced Summary Preview: {result.get('enhanced_summary', '')[:300]}...")
            
            multimodal_data = result.get('multimodal_data', {})
            print(f"\n🎯 Multimodal Data:")
            print(f"Summary Length: {len(multimodal_data.get('summary', ''))}")
            print(f"Root Topic: {multimodal_data.get('root_topic', 'N/A')}")
            print(f"Learning Objectives: {len(multimodal_data.get('learning_objectives', []))}")
            print(f"Key Concepts: {len(multimodal_data.get('key_concepts', []))}")
            print(f"Timestamp Highlights: {len(multimodal_data.get('timestamp_highlights', []))}")
            
            # Check if it's using fallback or actual content
            processing_stats = multimodal_data.get('processing_stats', {})
            print(f"\n📊 Processing Stats:")
            print(f"Transcript Length: {processing_stats.get('transcript_length', 0)}")
            print(f"Summary Word Count: {processing_stats.get('summary_word_count', 0)}")
            
            if result.get('processing_method') == 'multimodal':
                print("🎉 SUCCESS: Using multimodal processing with actual content!")
            else:
                print("⚠️  Using fallback processing")
                
            # Display some of the learning objectives
            objectives = multimodal_data.get('learning_objectives', [])
            if objectives:
                print(f"\n🎯 Learning Objectives:")
                for i, obj in enumerate(objectives[:3]):
                    print(f"  {i+1}. {obj}")
                    
            # Display key concepts
            concepts = multimodal_data.get('key_concepts', [])
            if concepts:
                print(f"\n💡 Key Concepts:")
                for i, concept in enumerate(concepts[:3]):
                    print(f"  {i+1}. {concept}")
            
        else:
            print(f"❌ Request failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out. The backend might be processing...")
    except Exception as e:
        print(f"❌ Error making request: {e}")

if __name__ == "__main__":
    asyncio.run(test_enhance_video_endpoint()) 