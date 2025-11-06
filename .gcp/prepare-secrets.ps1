# Prepare Secrets for GCP from existing .env.local
# This script extracts API keys from .env.local and prepares them for GCP Secret Manager

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Preparing Secrets for GCP" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Read .env.local
$envFile = Get-Content ..\.env.local

# Extract keys
$secrets = @{}

foreach ($line in $envFile) {
    if ($line -match '^OPENAI_API_KEY\s*=\s*(.+)$') {
        $secrets['openai-api-key'] = $matches[1].Trim()
    }
    if ($line -match '^NEXT_PUBLIC_YOUTUBE_API_KEY\s*=\s*(.+)$') {
        $secrets['youtube-api-key'] = $matches[1].Trim()
    }
    if ($line -match '^NEXT_PUBLIC_AWS_ACCESS_KEY_ID\s*=\s*(.+)$') {
        $secrets['aws-access-key-id'] = $matches[1].Trim()
    }
    if ($line -match '^NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY\s*=\s*(.+)$') {
        $secrets['aws-secret-access-key'] = $matches[1].Trim()
    }
}

Write-Host "Found the following secrets:" -ForegroundColor Green
foreach ($key in $secrets.Keys) {
    $masked = $secrets[$key].Substring(0, [Math]::Min(10, $secrets[$key].Length)) + "..."
    Write-Host "  $key : $masked" -ForegroundColor Gray
}

Write-Host ""
Write-Host "These will be stored in GCP Secret Manager during setup." -ForegroundColor Yellow
Write-Host "Secrets file prepared successfully!" -ForegroundColor Green
Write-Host ""

# Save to temporary file for setup script
$secrets | ConvertTo-Json | Out-File -FilePath ".gcp-secrets-temp.json"
Write-Host "✓ Secrets cached for setup (will be deleted after upload)" -ForegroundColor Green
