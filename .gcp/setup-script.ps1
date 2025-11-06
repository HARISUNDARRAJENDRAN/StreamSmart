# StreamSmart GCP Setup Script
# Run this script to initialize GCP project and services

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "StreamSmart GCP Setup Wizard" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Authenticate
Write-Host "[1/8] Authenticating with Google Cloud..." -ForegroundColor Yellow
Write-Host "This will open a browser window for authentication."
Write-Host "Press Enter to continue..." -ForegroundColor Green
Read-Host

gcloud auth login

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Authentication failed" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Authentication successful" -ForegroundColor Green
Write-Host ""

# Step 2: List/Create Project
Write-Host "[2/8] Setting up GCP Project..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Do you want to:" -ForegroundColor Cyan
Write-Host "  1. Use existing project"
Write-Host "  2. Create new project"
$choice = Read-Host "Enter choice (1 or 2)"

if ($choice -eq "1") {
    # List existing projects
    Write-Host ""
    Write-Host "Available projects:" -ForegroundColor Cyan
    gcloud projects list
    Write-Host ""
    $projectId = Read-Host "Enter project ID to use"
} else {
    # Create new project
    $projectId = Read-Host "Enter new project ID (e.g., streamsmart-prod)"
    $projectName = Read-Host "Enter project name (e.g., StreamSmart Production)"
    
    Write-Host "Creating project: $projectId..." -ForegroundColor Yellow
    gcloud projects create $projectId --name="$projectName"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Project creation failed" -ForegroundColor Red
        exit 1
    }
}

# Set active project
gcloud config set project $projectId
Write-Host "✓ Project set to: $projectId" -ForegroundColor Green
Write-Host ""

# Step 3: Link Billing Account
Write-Host "[3/8] Setting up billing..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Available billing accounts:" -ForegroundColor Cyan
gcloud billing accounts list
Write-Host ""
$billingAccount = Read-Host "Enter billing account ID (or press Enter to skip)"

if ($billingAccount) {
    gcloud billing projects link $projectId --billing-account=$billingAccount
    Write-Host "✓ Billing account linked" -ForegroundColor Green
} else {
    Write-Host "! Skipping billing setup - you'll need to do this manually in GCP Console" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Enable APIs
Write-Host "[4/8] Enabling required APIs (this may take a few minutes)..." -ForegroundColor Yellow

$apis = @(
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "firestore.googleapis.com",
    "storage-api.googleapis.com",
    "redis.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudidentity.googleapis.com",
    "firebase.googleapis.com",
    "compute.googleapis.com",
    "vpcaccess.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "  Enabling $api..." -ForegroundColor Gray
    gcloud services enable $api 2>&1 | Out-Null
}

Write-Host "✓ All APIs enabled" -ForegroundColor Green
Write-Host ""

# Step 5: Create Service Accounts
Write-Host "[5/8] Creating service accounts..." -ForegroundColor Yellow

$serviceAccounts = @(
    @{name="streamsmart-backend-sa"; display="StreamSmart Backend Service"},
    @{name="streamsmart-frontend-sa"; display="StreamSmart Frontend Service"},
    @{name="streamsmart-cicd-sa"; display="StreamSmart CI/CD Service"}
)

foreach ($sa in $serviceAccounts) {
    Write-Host "  Creating $($sa.name)..." -ForegroundColor Gray
    gcloud iam service-accounts create $sa.name `
        --display-name="$($sa.display)" `
        --project=$projectId 2>&1 | Out-Null
}

Write-Host "✓ Service accounts created" -ForegroundColor Green
Write-Host ""

# Step 6: Store API Keys in Secret Manager
Write-Host "[6/8] Setting up Secret Manager..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Please provide your API keys (or press Enter to skip and add later):" -ForegroundColor Cyan

# OpenAI API Key
$openaiKey = Read-Host "OpenAI API Key" -AsSecureString
if ($openaiKey.Length -gt 0) {
    $openaiPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($openaiKey))
    echo $openaiPlain | gcloud secrets create openai-api-key --data-file=- 2>&1 | Out-Null
    Write-Host "  ✓ OpenAI key stored" -ForegroundColor Green
}

# Gemini API Key
$geminiKey = Read-Host "Gemini API Key" -AsSecureString
if ($geminiKey.Length -gt 0) {
    $geminiPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($geminiKey))
    echo $geminiPlain | gcloud secrets create gemini-api-key --data-file=- 2>&1 | Out-Null
    Write-Host "  ✓ Gemini key stored" -ForegroundColor Green
}

# YouTube API Key
$youtubeKey = Read-Host "YouTube API Key" -AsSecureString
if ($youtubeKey.Length -gt 0) {
    $youtubePlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($youtubeKey))
    echo $youtubePlain | gcloud secrets create youtube-api-key --data-file=- 2>&1 | Out-Null
    Write-Host "  ✓ YouTube key stored" -ForegroundColor Green
}

Write-Host "✓ Secret Manager configured" -ForegroundColor Green
Write-Host ""

# Step 7: Create Artifact Registry
Write-Host "[7/8] Creating Artifact Registry..." -ForegroundColor Yellow
gcloud artifacts repositories create streamsmart-docker `
    --repository-format=docker `
    --location=us-central1 `
    --description="StreamSmart Docker images" 2>&1 | Out-Null

Write-Host "✓ Artifact Registry created" -ForegroundColor Green
Write-Host ""

# Step 8: Save Configuration
Write-Host "[8/8] Saving configuration..." -ForegroundColor Yellow

$config = @{
    project_id = $projectId
    region = "us-central1"
    zone = "us-central1-a"
    setup_date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
}

$config | ConvertTo-Json | Out-File -FilePath ".gcp/project-info.json"

Write-Host "✓ Configuration saved to .gcp/project-info.json" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project ID: $projectId" -ForegroundColor Cyan
Write-Host "Region: us-central1" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Review .gcp/config.yaml for deployment settings"
Write-Host "2. Run deployment scripts to containerize and deploy"
Write-Host "3. Set up Firebase Authentication"
Write-Host "4. Configure DNS settings"
Write-Host ""
Write-Host "To view your project in GCP Console:" -ForegroundColor Cyan
Write-Host "https://console.cloud.google.com/home/dashboard?project=$projectId" -ForegroundColor Blue
Write-Host ""
