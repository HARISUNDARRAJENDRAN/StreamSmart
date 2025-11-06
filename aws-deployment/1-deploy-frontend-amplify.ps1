# StreamSmart Frontend Deployment to AWS Amplify
# This script deploys your Next.js frontend to AWS Amplify Hosting

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "StreamSmart Frontend - AWS Amplify Deploy" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow

# Check if Amplify CLI is installed
$amplifyCLI = Get-Command amplify -ErrorAction SilentlyContinue
if (-not $amplifyCLI) {
    Write-Host "✗ Amplify CLI not found. Installing..." -ForegroundColor Red
    npm install -g @aws-amplify/cli
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to install Amplify CLI" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✓ Amplify CLI found" -ForegroundColor Green

# Check if AWS CLI is configured
$awsConfig = Test-Path ~/.aws/credentials
if (-not $awsConfig) {
    Write-Host "! AWS credentials not found. Please run 'aws configure' first" -ForegroundColor Yellow
    Write-Host "Press Enter to continue after configuring AWS CLI..." -ForegroundColor Green
    Read-Host
}

Write-Host ""

# Configure Amplify
Write-Host "[2/6] Configuring Amplify..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Choose deployment method:" -ForegroundColor Cyan
Write-Host "  1. One-Click Deploy (Console UI - Easiest)"
Write-Host "  2. CLI Deploy (Automated - Recommended)"
Write-Host "  3. Manual Setup (Advanced)"
$choice = Read-Host "Enter choice (1, 2, or 3)"

if ($choice -eq "1") {
    # One-Click Deploy via Console
    Write-Host ""
    Write-Host "Opening AWS Amplify Console..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Follow these steps in the browser:" -ForegroundColor Cyan
    Write-Host "1. Click 'Host web app'" -ForegroundColor Gray
    Write-Host "2. Connect your GitHub repository" -ForegroundColor Gray
    Write-Host "3. Select 'StreamSmart' repository" -ForegroundColor Gray
    Write-Host "4. Select 'main' branch" -ForegroundColor Gray
    Write-Host "5. Amplify will auto-detect Next.js" -ForegroundColor Gray
    Write-Host "6. Click 'Save and deploy'" -ForegroundColor Gray
    Write-Host ""
    
    Start-Process "https://console.aws.amazon.com/amplify/home?region=ap-south-2#/create"
    
    Write-Host "Press Enter when deployment is complete..." -ForegroundColor Green
    Read-Host
    
} elseif ($choice -eq "2") {
    # CLI Deploy
    Write-Host ""
    Write-Host "[3/6] Initializing Amplify project..." -ForegroundColor Yellow
    
    # Check if already initialized
    if (Test-Path "amplify") {
        Write-Host "! Amplify already initialized. Skipping..." -ForegroundColor Yellow
    } else {
        # Initialize Amplify
        amplify init --yes
    }
    
    Write-Host ""
    Write-Host "[4/6] Adding hosting configuration..." -ForegroundColor Yellow
    
    # Add hosting
    amplify add hosting
    
    Write-Host ""
    Write-Host "[5/6] Building Next.js application..." -ForegroundColor Yellow
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Build failed. Please fix errors and try again." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Build successful" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "[6/6] Publishing to Amplify..." -ForegroundColor Yellow
    amplify publish
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host "✓ Frontend Deployed Successfully!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your app is now live at the URL shown above." -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host "✗ Deployment failed. Check errors above." -ForegroundColor Red
    }
    
} else {
    # Manual Setup
    Write-Host ""
    Write-Host "Manual Setup Instructions:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Build the application:" -ForegroundColor Yellow
    Write-Host "   npm run build" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Go to AWS Amplify Console:" -ForegroundColor Yellow
    Write-Host "   https://console.aws.amazon.com/amplify/" -ForegroundColor Blue
    Write-Host ""
    Write-Host "3. Click 'Host web app' → 'Deploy without Git'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "4. Upload the .next folder" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "5. Configure environment variables:" -ForegroundColor Yellow
    Write-Host "   NEXT_PUBLIC_BACKEND_URL=https://your-backend-url" -ForegroundColor Gray
    Write-Host "   (copy from .env.local)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Note your Amplify URL" -ForegroundColor Gray
Write-Host "2. Run backend deployment script: .\2-deploy-backend-apprunner.ps1" -ForegroundColor Gray
Write-Host "3. Configure custom domain (optional)" -ForegroundColor Gray
Write-Host "4. Set up CloudFront CDN for global access" -ForegroundColor Gray
Write-Host ""

# Save deployment info
$deploymentInfo = @{
    service = "AWS Amplify"
    deployed_at = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    region = "ap-south-2"
    method = if ($choice -eq "1") { "Console" } elseif ($choice -eq "2") { "CLI" } else { "Manual" }
}

$deploymentInfo | ConvertTo-Json | Out-File -FilePath "deployment-info-frontend.json"
Write-Host "✓ Deployment info saved to deployment-info-frontend.json" -ForegroundColor Green
