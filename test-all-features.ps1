# StreamSmart Complete Feature Test Script
# Run this to test all functionalities

$ALB_URL = "http://streamsmart-alb-877355261.ap-south-1.elb.amazonaws.com"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "StreamSmart Feature Testing Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Test Frontend Health
Write-Host "1. Testing Frontend Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $ALB_URL -Method Get -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✓ Frontend is accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "   ✗ Frontend not accessible yet" -ForegroundColor Red
}

# 2. Test Backend Health
Write-Host "2. Testing Backend Health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$ALB_URL/health" -Method Get -TimeoutSec 10
    Write-Host "   ✓ Backend is healthy" -ForegroundColor Green
    Write-Host "   - Status: $($response.status)" -ForegroundColor Gray
    Write-Host "   - AWS RAG: $($response.aws_rag)" -ForegroundColor Gray
    Write-Host "   - Models Loaded: $($response.models_loaded)" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Backend health check failed" -ForegroundColor Red
}

# 3. Test Authentication API
Write-Host "3. Testing Authentication System..." -ForegroundColor Yellow
try {
    $loginData = @{
        email = "demo@example.com"
        password = "demo123"
        authProvider = "demo"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$ALB_URL/api/auth/login" -Method Post -Body $loginData -ContentType "application/json" -TimeoutSec 10
    if ($response.user) {
        Write-Host "   ✓ Authentication API working" -ForegroundColor Green
    }
} catch {
    Write-Host "   ✗ Authentication API not responding" -ForegroundColor Red
}
}

# 4. Test BERT Recommendations API
Write-Host "4. Testing BERT Recommendations..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$ALB_URL/api/bert-recommendations/stats" -Method Get -TimeoutSec 10
    Write-Host "   ✓ BERT system accessible" -ForegroundColor Green
    Write-Host "   - Embeddings: $($response.total_embeddings)" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ BERT system not accessible" -ForegroundColor Red
}

# 5. Test RAG Chatbot API
Write-Host "5. Testing RAG Chatbot..." -ForegroundColor Yellow
try {
    $ragData = @{
        video_url = "https://www.youtube.com/watch?v=test"
        question = "What is this about?"
        transcript = "This is a test transcript for the RAG system."
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$ALB_URL/api/rag/query" -Method Post -Body $ragData -ContentType "application/json" -TimeoutSec 10
    Write-Host "   ✓ RAG system accessible" -ForegroundColor Green
} catch {
    Write-Host "   ✗ RAG system not accessible (may need transcript)" -ForegroundColor Yellow
}

# 6. Test DynamoDB Connection
Write-Host "6. Testing DynamoDB Connection..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$ALB_URL/api/playlists?userId=demo" -Method Get -TimeoutSec 10
    Write-Host "   ✓ DynamoDB queries working" -ForegroundColor Green
} catch {
    Write-Host "   ✗ DynamoDB connection issues" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access your application at:" -ForegroundColor Green
Write-Host $ALB_URL -ForegroundColor Cyan
