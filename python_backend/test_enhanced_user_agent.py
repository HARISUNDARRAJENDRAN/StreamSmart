#!/usr/bin/env python3
"""
Enhanced test with User-Agent + session cookies + referrer headers
"""

import os
import sys
import time
import requests
from youtube_transcript_api import YouTubeTranscriptApi
import yt_dlp

def test_enhanced_browser_simulation():
    """Test with full browser simulation including cookies, referrer, etc."""
    
    test_video_id = "dQw4w9WgXcQ"  # Rick Astley - Never Gonna Give You Up
    
    print("🧪 Testing ENHANCED browser simulation for YouTube...")
    print(f"📺 Test video ID: {test_video_id}")
    print()
    
    # Create session with comprehensive browser simulation
    session = requests.Session()
    
    # Step 1: Visit YouTube homepage first to get cookies
    print("🌐 Step 1: Visiting YouTube homepage to establish session...")
    try:
        homepage_response = session.get('https://www.youtube.com', headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        })
        print(f"   Status: {homepage_response.status_code}")
        print(f"   Cookies received: {len(session.cookies)} cookies")
        time.sleep(2)
    except Exception as e:
        print(f"   Warning: Could not visit homepage: {e}")
    
    # Step 2: Now set up enhanced headers for transcript requests
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    })
    
    # Monkey patch requests
    original_get = requests.get
    original_post = requests.post
    
    def patched_get(*args, **kwargs):
        kwargs.setdefault('headers', {}).update(session.headers)
        kwargs.setdefault('cookies', session.cookies)
        return original_get(*args, **kwargs)
    
    def patched_post(*args, **kwargs):
        kwargs.setdefault('headers', {}).update(session.headers)
        kwargs.setdefault('cookies', session.cookies)
        return original_post(*args, **kwargs)
    
    requests.get = patched_get
    requests.post = patched_post
    
    try:
        print("📡 Step 2: Applying enhanced browser headers...")
        print(f"   User-Agent: {session.headers['User-Agent']}")
        print(f"   Referer: {session.headers.get('Referer', 'None')}")
        print(f"   Cookies: {len(session.cookies)} cookies active")
        print()
        
        # Test transcript methods
        transcript_methods = [
            (['en'], 'English'),
            (['en-US'], 'English (US)'),
            (['auto'], 'Auto-generated'),
        ]
        
        success = False
        
        for languages, method_name in transcript_methods:
            try:
                print(f"🔍 Trying {method_name} transcript...")
                
                # Add realistic delay
                time.sleep(2)
                
                transcript_list = YouTubeTranscriptApi.get_transcript(test_video_id, languages=languages)
                transcript_text = ' '.join([item['text'] for item in transcript_list])
                
                if transcript_text and len(transcript_text.strip()) > 50:
                    print(f"✅ SUCCESS! Retrieved transcript using {method_name}")
                    print(f"📝 Transcript length: {len(transcript_text)} characters")
                    print(f"🎵 First 100 characters: {transcript_text[:100]}...")
                    success = True
                    break
                    
            except Exception as e:
                print(f"❌ {method_name} failed: {str(e)[:150]}...")
                continue
        
        if not success:
            print("\n🔄 Trying alternative approach with yt-dlp...")
            try:
                ydl_opts = {
                    'quiet': True,
                    'no_warnings': True,
                    'http_headers': dict(session.headers),
                    'writesubtitles': True,
                    'writeautomaticsub': True,
                    'skip_download': True
                }
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(f'https://www.youtube.com/watch?v={test_video_id}', download=False)
                    print(f"✅ yt-dlp worked! Video title: {info.get('title', 'Unknown')}")
                    
            except Exception as e:
                print(f"❌ yt-dlp also failed: {str(e)[:100]}...")
        
        if success:
            print("\n🎉 Enhanced browser simulation WORKS!")
            print("💡 This approach successfully bypassed YouTube blocking!")
        else:
            print("\n😞 Even enhanced browser simulation didn't work.")
            print("💡 YouTube may be detecting cloud provider IP or using other detection methods.")
            print("🔧 Proxies may still be needed for cloud deployment.")
            
    finally:
        # Restore original requests methods
        requests.get = original_get
        requests.post = original_post

if __name__ == "__main__":
    test_enhanced_browser_simulation() 