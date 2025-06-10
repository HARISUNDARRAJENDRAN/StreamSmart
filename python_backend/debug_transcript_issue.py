#!/usr/bin/env python3
"""
Comprehensive debugging script for YouTube transcript issues
"""

import asyncio
import requests
import time
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, VideoUnavailable, NoTranscriptFound
import re
from urllib.parse import urlparse

def extract_video_id(url):
    """Extract video ID from YouTube URL"""
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com/.*[?&]v=([a-zA-Z0-9_-]{11})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def test_video_accessibility(video_url):
    """Test if the video is accessible and what info we can get"""
    print(f"\n🔍 Testing video accessibility: {video_url}")
    
    video_id = extract_video_id(video_url)
    if not video_id:
        print("❌ Could not extract video ID")
        return False
    
    print(f"📹 Video ID: {video_id}")
    
    # Test if video exists by checking basic YouTube page
    try:
        response = requests.get(f"https://www.youtube.com/watch?v={video_id}", timeout=10)
        if response.status_code == 200:
            print("✅ Video page accessible")
            if "This video is unavailable" in response.text:
                print("❌ Video is marked as unavailable")
                return False
            if "Private video" in response.text:
                print("❌ Video is private")
                return False
        else:
            print(f"❌ Video page returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error accessing video page: {e}")
        return False
    
    return True

def detailed_transcript_test(video_url):
    """Detailed testing of transcript extraction"""
    print(f"\n🔍 Detailed transcript testing for: {video_url}")
    
    video_id = extract_video_id(video_url)
    if not video_id:
        print("❌ Could not extract video ID")
        return False
    
    try:
        # Step 1: List available transcripts
        print("Step 1: Listing available transcripts...")
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        available_transcripts = []
        for transcript in transcript_list:
            lang_info = f"{transcript.language_code} ({transcript.language})"
            if transcript.is_generated:
                lang_info += " [AUTO-GENERATED]"
            else:
                lang_info += " [MANUAL]"
            available_transcripts.append(lang_info)
            print(f"  📝 {lang_info}")
        
        if not available_transcripts:
            print("❌ No transcripts found")
            return False
        
        # Step 2: Try to get English transcript
        print("\nStep 2: Attempting to get English transcript...")
        transcript = None
        
        try:
            # Try manual English first
            transcript = transcript_list.find_transcript(['en', 'en-US', 'en-GB'])
            print(f"✅ Found manual English transcript: {transcript.language}")
        except:
            try:
                # Try auto-generated English
                transcript = transcript_list.find_generated_transcript(['en', 'en-US', 'en-GB'])
                print(f"✅ Found auto-generated English transcript: {transcript.language}")
            except Exception as e:
                print(f"❌ No English transcript available: {e}")
                # Try any available transcript
                try:
                    available = list(transcript_list)
                    if available:
                        transcript = available[0]
                        print(f"✅ Using first available transcript: {transcript.language}")
                except Exception as e2:
                    print(f"❌ Could not get any transcript: {e2}")
                    return False
        
        if not transcript:
            print("❌ No usable transcript found")
            return False
        
        # Step 3: Fetch the transcript with detailed error handling
        print(f"\nStep 3: Fetching transcript data for {transcript.language}...")
        try:
            # This is where the error usually occurs
            transcript_data = transcript.fetch()
            print(f"✅ Successfully fetched {len(transcript_data)} transcript entries")
            
            # Show sample data
            if transcript_data:
                print("\nSample entries:")
                for i, entry in enumerate(transcript_data[:3]):
                    print(f"  {i+1}: {entry}")
                
                # Calculate total text length
                total_text = " ".join([entry.get('text', '') for entry in transcript_data])
                print(f"\nTotal transcript length: {len(total_text)} characters")
            
            return True
            
        except Exception as fetch_error:
            print(f"❌ FETCH ERROR: {fetch_error}")
            print(f"Error type: {type(fetch_error)}")
            
            # Try to get more details about the error
            if hasattr(fetch_error, 'args'):
                print(f"Error args: {fetch_error.args}")
            
            return False
    
    except TranscriptsDisabled:
        print("❌ Transcripts are disabled for this video")
        return False
    except VideoUnavailable:
        print("❌ Video is unavailable")
        return False
    except NoTranscriptFound:
        print("❌ No transcript found for this video")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        print(f"Error type: {type(e)}")
        return False

def test_youtube_api_status():
    """Test if YouTube API/services are working in general"""
    print("\n🌐 Testing YouTube API status...")
    
    try:
        # Test with a known working video (YouTube's own videos)
        test_videos = [
            "dQw4w9WgXcQ",  # Rick Roll - famous video, should have transcripts
            "jNQXAC9IVRw",  # Me at the zoo - first YouTube video
        ]
        
        for video_id in test_videos:
            try:
                print(f"\nTesting with known video: {video_id}")
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                print(f"✅ Can access transcript list for {video_id}")
                
                # Try to fetch one
                try:
                    transcript = transcript_list.find_generated_transcript(['en'])
                    data = transcript.fetch()
                    print(f"✅ Successfully fetched transcript for {video_id}: {len(data)} entries")
                    return True
                except:
                    print(f"⚠️  Could not fetch transcript data for {video_id}")
                    
            except Exception as e:
                print(f"❌ Error with {video_id}: {e}")
        
        print("❌ All test videos failed - YouTube API might be having issues")
        return False
        
    except Exception as e:
        print(f"❌ Error testing YouTube API: {e}")
        return False

def main():
    print("=== COMPREHENSIVE TRANSCRIPT DEBUGGING ===")
    
    # Test 1: YouTube API general status
    print("\n" + "="*50)
    print("TEST 1: YouTube API General Status")
    print("="*50)
    api_working = test_youtube_api_status()
    
    # Test 2: Your specific video
    print("\n" + "="*50)
    print("TEST 2: Your Specific Video")
    print("="*50)
    
    # Get the video URL from user
    test_url = "https://www.youtube.com/watch?v=your_video_id_here"  # Replace with actual URL
    print(f"Testing with: {test_url}")
    
    # You can also test with the video from your screenshot
    machine_learning_url = "https://www.youtube.com/watch?v=example"  # Replace with the actual URL you're testing
    
    # Test multiple videos
    test_videos = [
        "https://www.youtube.com/watch?v=BwuLxPH8IDs",  # TypeScript
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",  # Rick Roll (should work)
        machine_learning_url if "example" not in machine_learning_url else None,
    ]
    
    for url in test_videos:
        if url and "example" not in url:
            print(f"\n{'-'*30}")
            accessible = test_video_accessibility(url)
            if accessible:
                detailed_transcript_test(url)
            print(f"{'-'*30}")
    
    # Summary and recommendations
    print("\n" + "="*50)
    print("DIAGNOSIS & RECOMMENDATIONS")
    print("="*50)
    
    if not api_working:
        print("🚨 ISSUE: YouTube Transcript API is not working properly")
        print("💡 SOLUTIONS:")
        print("   1. Check your internet connection")
        print("   2. Wait a few hours and try again (YouTube might be blocking requests)")
        print("   3. Use a VPN to try from a different location")
        print("   4. Update youtube-transcript-api: pip install --upgrade youtube-transcript-api")
    else:
        print("🔧 PARTIAL ISSUE: API works for some videos but not others")
        print("💡 SOLUTIONS:")
        print("   1. Try different videos with confirmed transcripts")
        print("   2. Check if the specific videos you're testing have restrictions")
        print("   3. The videos might be region-locked or have disabled transcripts")

if __name__ == "__main__":
    main() 