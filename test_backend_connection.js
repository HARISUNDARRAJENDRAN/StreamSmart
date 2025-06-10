// Test backend connection for Vercel frontend
async function testBackendConnection() {
    console.log('🧪 Testing Backend Connection...');
    
    // Replace this with your actual Render URL
    const BACKEND_URL = 'https://your-render-url.onrender.com';
    
    try {
        // Test 1: Health check
        console.log('📋 Testing health endpoint...');
        const healthResponse = await fetch(`${BACKEND_URL}/health`);
        const healthData = await healthResponse.json();
        console.log('✅ Health check:', healthData);
        
        // Test 2: Root endpoint
        console.log('📋 Testing root endpoint...');
        const rootResponse = await fetch(`${BACKEND_URL}/`);
        const rootData = await rootResponse.json();
        console.log('✅ Root endpoint:', rootData);
        
        // Test 3: CORS check
        console.log('📋 Testing CORS...');
        const corsResponse = await fetch(`${BACKEND_URL}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://your-vercel-app.vercel.app'
            }
        });
        console.log('✅ CORS test:', corsResponse.status === 200 ? 'PASSED' : 'FAILED');
        
        return true;
    } catch (error) {
        console.error('❌ Backend connection failed:', error);
        return false;
    }
}

// Test from browser console
console.log('🚀 Run: testBackendConnection()'); 