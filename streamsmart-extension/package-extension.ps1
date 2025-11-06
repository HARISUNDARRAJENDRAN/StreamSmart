# PowerShell Script to Package Extension for Distribution

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "StreamSmart Extension - Packaging" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if production URLs are configured
$serviceWorkerContent = Get-Content "background\service-worker.js" -Raw
if ($serviceWorkerContent -match "localhost") {
    Write-Host "⚠️  Warning: Localhost URLs detected!" -ForegroundColor Yellow
    Write-Host "Run update-production-urls.ps1 first" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 0
    }
}

# Check icons (optional)
Write-Host "[1/3] Checking icons..." -ForegroundColor Yellow
if (-not (Test-Path "icons")) {
    Write-Host "  ⓘ No icons directory - Chrome will use default icon" -ForegroundColor Gray
    Write-Host "  (Icons can be added later)" -ForegroundColor Gray
} else {
    Write-Host "✓ Icons directory exists" -ForegroundColor Green
}
Write-Host ""

# Get version from manifest
$manifest = Get-Content "manifest.json" | ConvertFrom-Json
$version = $manifest.version

# Create package
Write-Host "[2/3] Creating package..." -ForegroundColor Yellow
$packageName = "..\streamsmart-extension-v$version.zip"

# Remove old package if exists
if (Test-Path $packageName) {
    Remove-Item $packageName -Force
}

# Files and folders to include
$filesToInclude = @(
    "manifest.json",
    "background",
    "content",
    "popup",
    "utils"
)

# Add icons if they exist
if (Test-Path "icons") {
    $filesToInclude += "icons"
}

# Create temporary directory
$tempDir = "..\temp-extension-package"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Copy files
foreach ($item in $filesToInclude) {
    if (Test-Path $item) {
        Write-Host "  Copying $item..." -ForegroundColor Gray
        if (Test-Path $item -PathType Container) {
            Copy-Item -Path $item -Destination $tempDir -Recurse -Force
        } else {
            Copy-Item -Path $item -Destination $tempDir -Force
        }
    }
}

# Create ZIP
Compress-Archive -Path "$tempDir\*" -DestinationPath $packageName -Force

# Cleanup
Remove-Item $tempDir -Recurse -Force

Write-Host "✓ Package created: $packageName" -ForegroundColor Green
Write-Host ""

# Show package info
$packageInfo = Get-Item $packageName
Write-Host "[3/3] Package Information:" -ForegroundColor Yellow
Write-Host "  Name: $($packageInfo.Name)" -ForegroundColor Gray
Write-Host "  Size: $([math]::Round($packageInfo.Length / 1KB, 2)) KB" -ForegroundColor Gray
Write-Host "  Location: $($packageInfo.FullName)" -ForegroundColor Gray
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "✓ Extension Packaged Successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "For Testing:" -ForegroundColor Cyan
Write-Host "1. Go to chrome://extensions/" -ForegroundColor Gray
Write-Host "2. Enable 'Developer mode'" -ForegroundColor Gray
Write-Host "3. Click 'Load unpacked'" -ForegroundColor Gray
Write-Host "4. Select the 'streamsmart-extension' folder" -ForegroundColor Gray
Write-Host ""
Write-Host "For Distribution:" -ForegroundColor Cyan
Write-Host "1. Share the ZIP file with users" -ForegroundColor Gray
Write-Host "2. Users extract and load unpacked" -ForegroundColor Gray
Write-Host ""
Write-Host "For Chrome Web Store:" -ForegroundColor Cyan
Write-Host "1. Go to: https://chrome.google.com/webstore/devconsole" -ForegroundColor Gray
Write-Host "2. Click 'New Item'" -ForegroundColor Gray
Write-Host "3. Upload: $packageName" -ForegroundColor Gray
Write-Host "4. Fill store listing and submit" -ForegroundColor Gray
Write-Host ""
