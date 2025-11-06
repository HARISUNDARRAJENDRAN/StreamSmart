# Commit deployment-ready code and push to GitHub

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Committing Deployment Files" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Add all changes
Write-Host "[1/3] Staging files..." -ForegroundColor Yellow
git add .

# Create commit
Write-Host "[2/3] Creating commit..." -ForegroundColor Yellow
git commit -m "feat: Add AWS deployment configuration and fix build errors

- Add AWS Amplify and App Runner deployment scripts
- Fix missing dependencies (chart, dynamodb, useImplicitTracking)
- Add JWT_SECRET for production
- Configure for global deployment with CloudFront CDN
- Ready for production deployment"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Commit created" -ForegroundColor Green
} else {
    Write-Host "✗ Commit failed or no changes to commit" -ForegroundColor Yellow
}

Write-Host ""

# Push to GitHub
Write-Host "[3/3] Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "✓ Code Pushed to GitHub!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your code is now on GitHub and ready for Amplify deployment!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Go to AWS Amplify Console (should be open in browser)" -ForegroundColor Gray
    Write-Host "2. Connect to GitHub repository: StreamSmart" -ForegroundColor Gray
    Write-Host "3. Select branch: main" -ForegroundColor Gray
    Write-Host "4. Amplify will auto-detect Next.js and deploy!" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "✗ Push failed. Check your GitHub credentials." -ForegroundColor Red
}
