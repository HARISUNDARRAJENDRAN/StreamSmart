#!/usr/bin/env node
/**
 * Debug Script for RAG Chatbot Issues
 * Tests backend connectivity and video processing
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const TEST_VIDEO_URL = 'https://www.youtube.com/watch?v=7eh4d6sabA0'; // Short test video

async function debugChatbotIssue() {
    console.log('🔍 Debugging RAG Chatbot Issue...\n');
    
    // Test 1: Check if backend is running
    console.log('1. Testing backend connectivity...');
    try {
        const response = await fetch(`${BACKEND_URL}/health`);
        const data = await response.json();
        console.log('✅ Backend is running:', data);
    } catch (error) {
        console.log('❌ Backend connection failed:', error.message);
        console.log('📝 Solution: Start your Python backend:');
        console.log('   cd python_backend && python main.py');
        return;
    }
    
    // Test 2: Test environment variables
    console.log('\n2. Checking environment variables...');
    const envVars = {
        'GEMINI_API_KEY': process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing',
        'MONGODB_URI': process.env.MONGODB_URI ? '✅ Set' : '❌ Missing',
        'BACKEND_URL': process.env.BACKEND_URL || 'Using default: http://localhost:8000'
    };
    
    Object.entries(envVars).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });
    
    // Test 3: Test transcript extraction
    console.log('\n3. Testing transcript extraction...');
    try {
        const response = await fetch(`${BACKEND_URL}/extract-transcript`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                youtube_url: TEST_VIDEO_URL,
                video_id: 'test_video'
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.log('❌ Transcript extraction failed:', errorData);
            return;
        }
        
        const result = await response.json();
        console.log('✅ Transcript extraction successful');
        console.log(`   Text length: ${result.transcript?.full_text?.length || 0} characters`);
        
    } catch (error) {
        console.log('❌ Transcript extraction error:', error.message);
    }
    
    // Test 4: Test video processing
    console.log('\n4. Testing video processing...');
    try {
        const response = await fetch(`${BACKEND_URL}/process-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                youtube_url: TEST_VIDEO_URL,
                video_id: 'test_video'
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.log('❌ Video processing failed:', errorData);
            
            // Common solutions
            console.log('\n🔧 Common solutions:');
            console.log('   1. Check YouTube URL is valid and accessible');
            console.log('   2. Ensure GEMINI_API_KEY is set in environment');
            console.log('   3. Check if video has captions/transcripts available');
            console.log('   4. Try with a different video');
            return;
        }
        
        const result = await response.json();
        console.log('✅ Video processing successful');
        console.log(`   Summary: ${result.summary?.substring(0, 100)}...`);
        
    } catch (error) {
        console.log('❌ Video processing error:', error.message);
    }
    
    // Test 5: Test RAG endpoint
    console.log('\n5. Testing RAG functionality...');
    try {
        const response = await fetch(`${BACKEND_URL}/rag-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: "What is this video about?",
                video_ids: ["test_video"],
                top_k: 3
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.log('❌ RAG query failed:', errorData);
            return;
        }
        
        const result = await response.json();
        console.log('✅ RAG functionality working');
        console.log(`   Answer: ${result.answer?.substring(0, 100)}...`);
        
    } catch (error) {
        console.log('❌ RAG query error:', error.message);
    }
    
    console.log('\n✅ Debug complete!');
}

// Test frontend-backend integration
async function testFrontendIntegration() {
    console.log('\n🌐 Testing Frontend Integration...');
    
    // Check if frontend can reach backend
    const frontendBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    console.log(`Frontend API URL: ${frontendBaseUrl}`);
    
    try {
        const response = await fetch(`${frontendBaseUrl}/health`);
        const data = await response.json();
        console.log('✅ Frontend can reach backend:', data.status);
    } catch (error) {
        console.log('❌ Frontend cannot reach backend:', error.message);
        console.log('📝 Check NEXT_PUBLIC_API_URL in .env.local');
        console.log('📝 Ensure backend is deployed and accessible from Vercel');
    }
}

// Specific chatbot error patterns
function analyzeErrorMessage(errorMessage) {
    console.log('\n🔍 Analyzing error message...');
    
    const errorPatterns = {
        'Connection refused': {
            cause: 'Backend not running or wrong URL',
            solution: 'Start backend server or check BACKEND_URL'
        },
        'GEMINI_API_KEY': {
            cause: 'Missing Gemini API key',
            solution: 'Set GEMINI_API_KEY environment variable'
        },
        'Transcript extraction failed': {
            cause: 'YouTube transcript not available',
            solution: 'Try different video or check YouTube restrictions'
        },
        'CORS': {
            cause: 'Cross-origin request blocked',
            solution: 'Add frontend URL to CORS allowed origins'
        },
        'fetch is not defined': {
            cause: 'Node.js environment issue',
            solution: 'Install node-fetch: npm install node-fetch'
        }
    };
    
    for (const [pattern, info] of Object.entries(errorPatterns)) {
        if (errorMessage.includes(pattern)) {
            console.log(`❌ Error pattern detected: ${pattern}`);
            console.log(`   Cause: ${info.cause}`);
            console.log(`   Solution: ${info.solution}`);
            return;
        }
    }
    
    console.log('❓ Unknown error pattern. Please check logs for more details.');
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--frontend')) {
        await testFrontendIntegration();
    } else if (args.includes('--analyze') && args[1]) {
        analyzeErrorMessage(args[1]);
    } else {
        await debugChatbotIssue();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { debugChatbotIssue, testFrontendIntegration, analyzeErrorMessage }; 