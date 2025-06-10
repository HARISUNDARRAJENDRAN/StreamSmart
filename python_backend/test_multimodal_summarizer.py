#!/usr/bin/env python3
"""
Test script to debug the multi-modal summarizer
"""

import asyncio
import os
import logging
from services.multimodal_summarizer import TranscriptSummarizer

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_multimodal_summarizer():
    print("=== TESTING MULTI-MODAL SUMMARIZER ===")
    
    # Check if Gemini API key is available
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment")
        print("Please set the GEMINI_API_KEY environment variable")
        return
    
    print(f"✅ GEMINI_API_KEY found: {api_key[:10]}...")
    
    # Initialize the summarizer
    summarizer = TranscriptSummarizer()
    
    # Test if summarizer is ready
    if not summarizer.is_ready():
        print("❌ Summarizer is not ready")
        return
    
    print("✅ Summarizer is ready")
    
    # Test video (the machine learning one from your screenshot)
    test_video_id = "BwuLxPH8IDs"  # TypeScript video
    test_video_url = f"https://www.youtube.com/watch?v={test_video_id}"
    
    print(f"\n🎥 Testing with video: {test_video_url}")
    
    # Test 1: Check if we can get transcript with our enhanced method
    try:
        print("\n📝 Test 1: Getting transcript with enhanced method...")
        from rag_chatbot import create_rag_chatbot
        
        rag_bot = create_rag_chatbot(api_key)
        transcript = await rag_bot.fetch_and_store_transcript(test_video_url, "TypeScript Course")
        
        if transcript and len(transcript) > 100:
            print(f"✅ Enhanced transcript fetch SUCCESS: {len(transcript)} characters")
            print(f"Preview: {transcript[:200]}...")
            
            # Test 2: Test direct summarization
            print("\n🤖 Test 2: Testing direct Gemini summarization...")
            summary = await summarizer._summarize_text_with_gemini(transcript)
            
            if summary and not summary.startswith("Error:"):
                print(f"✅ Direct summarization SUCCESS: {len(summary)} characters")
                print(f"Summary preview: {summary[:300]}...")
                
                # Test 3: Test full multimodal summary generation
                print("\n🎯 Test 3: Testing full multimodal summary generation...")
                
                transcript_data = {
                    "full_text": transcript,
                    "segments": [],  # We don't have segments from our enhanced method
                    "url": test_video_url
                }
                visual_data = {}
                
                result = await summarizer.generate_multimodal_summary(
                    transcript_data, visual_data, test_video_id
                )
                
                print(f"✅ Multimodal summary generation SUCCESS!")
                print(f"Summary: {result.get('SUMMARY', 'No summary')[:300]}...")
                print(f"Root Topic: {result.get('ROOT_TOPIC', 'No topic')}")
                print(f"Learning Objectives: {result.get('LEARNING_OBJECTIVES', [])}")
                print(f"Key Concepts: {result.get('KEY_CONCEPTS', [])}")
                
            else:
                print(f"❌ Direct summarization FAILED: {summary}")
                
        else:
            print(f"❌ Enhanced transcript fetch FAILED: {len(transcript) if transcript else 0} characters")
            
    except Exception as e:
        print(f"❌ Error in testing: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 4: Test with mock data to isolate the issue
    print("\n🧪 Test 4: Testing with mock transcript data...")
    
    mock_transcript = """
    Welcome to this TypeScript course for beginners. In this comprehensive tutorial, 
    we will explore TypeScript fundamentals, including type annotations, interfaces, 
    classes, and advanced features. TypeScript is a superset of JavaScript that adds 
    static type checking. We'll start with basic concepts and gradually move to more 
    advanced topics like generics, decorators, and modules. By the end of this course, 
    you'll have a solid understanding of TypeScript and be able to use it in your projects.
    """
    
    try:
        mock_transcript_data = {
            "full_text": mock_transcript,
            "segments": [
                {"start": 0, "text": "Welcome to this TypeScript course for beginners"},
                {"start": 30, "text": "We will explore TypeScript fundamentals"},
                {"start": 60, "text": "TypeScript is a superset of JavaScript"}
            ],
            "url": test_video_url
        }
        
        mock_result = await summarizer.generate_multimodal_summary(
            mock_transcript_data, {}, test_video_id
        )
        
        print(f"✅ Mock data test SUCCESS!")
        print(f"Mock Summary: {mock_result.get('SUMMARY', 'No summary')[:200]}...")
        print(f"Mock Root Topic: {mock_result.get('ROOT_TOPIC', 'No topic')}")
        
    except Exception as e:
        print(f"❌ Mock data test FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_multimodal_summarizer()) 