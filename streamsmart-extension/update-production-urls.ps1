# PowerShell Script to Update Extension URLs for Production
# Run this script to automatically update all localhost URLs to production URLs

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "StreamSmart Extension - Production Update" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$FRONTEND_URL = "https://main.de7gjtsqdtkvr.amplifyapp.com"
$BACKEND_URL = "https://ppbmdfvxrc.ap-south-1.awsapprunner.com"

Write-Host "Production URLs:" -ForegroundColor Yellow
Write-Host "  Frontend: $FRONTEND_URL" -ForegroundColor Gray
Write-Host "  Backend: $BACKEND_URL" -ForegroundColor Gray
Write-Host ""

# Backup manifest.json
Write-Host "[1/5] Backing up manifest.json..." -ForegroundColor Yellow
Copy-Item -Path "manifest.json" -Destination "manifest.local.json" -Force
Copy-Item -Path "manifest.production.json" -Destination "manifest.json" -Force
Write-Host "✓ Manifest updated" -ForegroundColor Green
Write-Host ""

# Update popup/popup.js
Write-Host "[2/5] Updating popup/popup.js..." -ForegroundColor Yellow
$popupJsPath = "popup\popup.js"
$popupJsContent = Get-Content $popupJsPath -Raw
$popupJsContent = $popupJsContent -replace "http://localhost:8000", $BACKEND_URL
Set-Content -Path $popupJsPath -Value $popupJsContent
Write-Host "✓ popup.js updated" -ForegroundColor Green
Write-Host ""

# Update popup/popup.html
Write-Host "[3/5] Updating popup/popup.html..." -ForegroundColor Yellow
$popupHtmlPath = "popup\popup.html"
$popupHtmlContent = Get-Content $popupHtmlPath -Raw
$popupHtmlContent = $popupHtmlContent -replace "http://localhost:3000", $FRONTEND_URL
Set-Content -Path $popupHtmlPath -Value $popupHtmlContent
Write-Host "✓ popup.html updated" -ForegroundColor Green
Write-Host ""

# Update content/youtube-scraper.js
Write-Host "[4/5] Updating content/youtube-scraper.js..." -ForegroundColor Yellow
$youtubeScraperPath = "content\youtube-scraper.js"
$youtubeScraperContent = Get-Content $youtubeScraperPath -Raw
$youtubeScraperContent = $youtubeScraperContent -replace "http://localhost:8000", $BACKEND_URL
$youtubeScraperContent = $youtubeScraperContent -replace "http://localhost:3000", $FRONTEND_URL
Set-Content -Path $youtubeScraperPath -Value $youtubeScraperContent
Write-Host "✓ youtube-scraper.js updated" -ForegroundColor Green
Write-Host ""

# Update background/service-worker.js
Write-Host "[5/5] Updating background/service-worker.js..." -ForegroundColor Yellow
$serviceWorkerPath = "background\service-worker.js"
$serviceWorkerContent = Get-Content $serviceWorkerPath -Raw
$serviceWorkerContent = $serviceWorkerContent -replace "http://localhost:8000", $BACKEND_URL
$serviceWorkerContent = $serviceWorkerContent -replace "http://localhost:3000", $FRONTEND_URL
Set-Content -Path $serviceWorkerPath -Value $serviceWorkerContent
Write-Host "✓ service-worker.js updated" -ForegroundColor Green
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "✓ Extension Updated Successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Create icons folder with extension icons" -ForegroundColor Gray
Write-Host "2. Load extension in Chrome:" -ForegroundColor Gray
Write-Host "   - Go to chrome://extensions/" -ForegroundColor Gray
Write-Host "   - Enable Developer mode" -ForegroundColor Gray
Write-Host "   - Click 'Load unpacked'" -ForegroundColor Gray
Write-Host "   - Select this folder" -ForegroundColor Gray
Write-Host "3. Test on YouTube videos" -ForegroundColor Gray
Write-Host "4. If working, package as ZIP for distribution" -ForegroundColor Gray
Write-Host ""
Write-Host "To revert to localhost (for local development):" -ForegroundColor Cyan
Write-Host "  Copy-Item manifest.local.json manifest.json -Force" -ForegroundColor Gray
Write-Host ""
