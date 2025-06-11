#!/usr/bin/env python3
"""
Test script to verify if User-Agent headers solve YouTube blocking issue
"""

import os
import sys
import time
import requests
from youtube_transcript_api import YouTubeTranscriptApi

def test_user_agent_approach():
    """Test fetching transcript with browser-like User-Agent headers"""
    
    # Test video ID (a popular video that should have transcripts)
    test_video_id = "dQw4w9WgXcQ"  # Rick Astley - Never Gonna Give You Up
    
    print("🧪 Testing User-Agent approach for YouTube transcript fetching...")
    print(f"📺 Test video ID: {test_video_id}")
    print()
    
    # Create session with browser-like headers
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
    })
    
    # Monkey patch requests to use our session
    original_get = requests.get
    original_post = requests.post
    
    def patched_get(*args, **kwargs):
        kwargs.setdefault('headers', {}).update(session.headers)
        return original_get(*args, **kwargs)
    
    def patched_post(*args, **kwargs):
        kwargs.setdefault('headers', {}).update(session.headers)
        return original_post(*args, **kwargs)
    
    requests.get = patched_get
    requests.post = patched_post
    
    try:
        print("📡 Applying browser User-Agent headers...")
        print(f"   User-Agent: {session.headers['User-Agent']}")
        print()
        
        # Test different language approaches
        transcript_methods = [
            (['en'], 'English'),
            (['en-US'], 'English (US)'),
            (['auto'], 'Auto-generated'),
        ]
        
        success = False
        
        for languages, method_name in transcript_methods:
            try:
                print(f"🔍 Trying {method_name} transcript...")
                
                # Add small delay to mimic human behavior
                time.sleep(1)
                
                transcript_list = YouTubeTranscriptApi.get_transcript(test_video_id, languages=languages)
                transcript_text = ' '.join([item['text'] for item in transcript_list])
                
                if transcript_text and len(transcript_text.strip()) > 50:
                    print(f"✅ SUCCESS! Retrieved transcript using {method_name}")
                    print(f"📝 Transcript length: {len(transcript_text)} characters")
                    print(f"🎵 First 100 characters: {transcript_text[:100]}...")
                    print()
                    success = True
                    break
                    
            except Exception as e:
                print(f"❌ {method_name} failed: {str(e)[:100]}...")
                print()
                continue
        
        if success:
            print("🎉 User-Agent approach WORKS! YouTube transcript blocking bypassed.")
            print("💡 This is a free solution that doesn't require proxies!")
        else:
            print("😞 User-Agent approach didn't work. May need proxy fallback.")
            
    finally:
        # Restore original requests methods
        requests.get = original_get
        requests.post = original_post

if __name__ == "__main__":
    test_user_agent_approach() 