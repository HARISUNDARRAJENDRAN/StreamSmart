# Setup CloudFront CDN for Global Access
# This ensures users from any country can access StreamSmart quickly

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "StreamSmart - CloudFront CDN Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "CloudFront CDN provides:" -ForegroundColor Yellow
Write-Host "  ✓ 450+ edge locations worldwide" -ForegroundColor Green
Write-Host "  ✓ Automatic caching and optimization" -ForegroundColor Green
Write-Host "  ✓ DDoS protection" -ForegroundColor Green
Write-Host "  ✓ SSL/TLS certificates" -ForegroundColor Green
Write-Host "  ✓ <100ms latency for most users" -ForegroundColor Green
Write-Host ""

Write-Host "Setup Method:" -ForegroundColor Cyan
Write-Host "  1. Automatic (via AWS Console - Recommended)"
Write-Host "  2. View manual instructions"
$choice = Read-Host "Enter choice (1 or 2)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "Opening CloudFront Console..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Follow these steps:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "For Frontend (Amplify):" -ForegroundColor Yellow
    Write-Host "1. Go to Amplify Console → Your App → Domain Management" -ForegroundColor Gray
    Write-Host "2. CloudFront is automatically configured!" -ForegroundColor Green
    Write-Host "   (Amplify includes CloudFront CDN by default)" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "For Backend (App Runner):" -ForegroundColor Yellow
    Write-Host "1. Go to CloudFront Console" -ForegroundColor Gray
    Write-Host "2. Click 'Create Distribution'" -ForegroundColor Gray
    Write-Host "3. Origin Domain: Your App Runner URL" -ForegroundColor Gray
    Write-Host "4. Origin Protocol: HTTPS only" -ForegroundColor Gray
    Write-Host "5. Viewer Protocol: Redirect HTTP to HTTPS" -ForegroundColor Gray
    Write-Host "6. Cache Policy: CachingOptimized" -ForegroundColor Gray
    Write-Host "7. Add custom domain (optional): api.streamsmart.com" -ForegroundColor Gray
    Write-Host "8. Click 'Create distribution'" -ForegroundColor Gray
    Write-Host ""
    
    Start-Process "https://console.aws.amazon.com/cloudfront/v3/home?region=ap-south-2"
    
    Write-Host "Press Enter when done..." -ForegroundColor Green
    Read-Host
    
} else {
    Write-Host ""
    Write-Host "Manual CloudFront Setup Instructions:" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Step 1: Create CloudFront Distribution" -ForegroundColor Yellow
    Write-Host "---------------------------------------" -ForegroundColor Gray
    Write-Host @"
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json

# cloudfront-config.json:
{
  "CallerReference": "streamsmart-backend-cdn",
  "Comment": "StreamSmart Backend CDN",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "AppRunnerOrigin",
        "DomainName": "YOUR-APPRUNNER-URL.awsapprunner.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "AppRunnerOrigin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }
}
"@ -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Step 2: Configure Custom Domain (Optional)" -ForegroundColor Yellow
    Write-Host "--------------------------------------------" -ForegroundColor Gray
    Write-Host @"
1. Go to Route 53 Console
2. Create hosted zone for your domain
3. Create A record pointing to CloudFront distribution
4. Add SSL certificate via ACM (Certificate Manager)
"@ -ForegroundColor Gray
}

Write-Host ""
Write-Host "Testing Global Access:" -ForegroundColor Yellow
Write-Host "---------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "Test from different locations using:" -ForegroundColor Cyan
Write-Host "  https://tools.keycdn.com/performance" -ForegroundColor Blue
Write-Host "  https://www.webpagetest.org/" -ForegroundColor Blue
Write-Host ""
Write-Host "Expected Performance:" -ForegroundColor Cyan
Write-Host "  North America: 50-100ms" -ForegroundColor Green
Write-Host "  Europe: 80-150ms" -ForegroundColor Green
Write-Host "  Asia: 100-200ms" -ForegroundColor Green
Write-Host "  Other regions: 150-300ms" -ForegroundColor Green
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "✓ CDN Setup Guide Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  ✓ Frontend: Amplify includes CloudFront automatically" -ForegroundColor Green
Write-Host "  ✓ Backend: Create CloudFront distribution for App Runner" -ForegroundColor Green
Write-Host "  ✓ Global: Users worldwide will access via nearest edge location" -ForegroundColor Green
Write-Host ""
