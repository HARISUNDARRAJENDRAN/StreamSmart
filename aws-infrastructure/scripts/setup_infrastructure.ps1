# StreamSmart AWS Infrastructure Setup Script
# This script sets up the complete AWS infrastructure for AI recommendations

param(
    [string]$Profile = "Harisundar",
    [string]$Region = "ap-south-2",
    [switch]$SkipCSVUpload,
    [switch]$SkipEmbeddings,
    [switch]$DeployOnly
)

Write-Host "===== StreamSmart AWS Infrastructure Setup =====" -ForegroundColor Cyan
Write-Host "Profile: $Profile" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host ""

# Set AWS environment variables
$env:AWS_PROFILE = $Profile
$env:AWS_REGION = $Region
$env:CDK_DEFAULT_ACCOUNT = (aws sts get-caller-identity --query Account --output text)
$env:CDK_DEFAULT_REGION = $Region

Write-Host "AWS Account: $env:CDK_DEFAULT_ACCOUNT" -ForegroundColor Green
Write-Host ""

# Function to check if command exists
function Test-Command {
    param($Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Cyan

if (-not (Test-Command aws)) {
    Write-Host "ERROR: AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    exit 1
}

if (-not (Test-Command npm)) {
    Write-Host "ERROR: Node.js/npm not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

if (-not (Test-Command python)) {
    Write-Host "ERROR: Python not found. Please install Python 3.11+ first." -ForegroundColor Red
    exit 1
}

Write-Host "All prerequisites satisfied!" -ForegroundColor Green
Write-Host ""

# Change to infrastructure directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$infraDir = Split-Path -Parent $scriptDir
Set-Location $infraDir

# Install CDK dependencies
Write-Host "Installing CDK dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install npm dependencies" -ForegroundColor Red
    exit 1
}

# Bootstrap CDK (if needed)
Write-Host "Bootstrapping CDK..." -ForegroundColor Cyan
cdk bootstrap aws://$env:CDK_DEFAULT_ACCOUNT/$Region
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: CDK bootstrap failed or already done" -ForegroundColor Yellow
}

# Build TypeScript
Write-Host "Building CDK project..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed" -ForegroundColor Red
    exit 1
}

# Synthesize CloudFormation templates
Write-Host "Synthesizing CloudFormation templates..." -ForegroundColor Cyan
cdk synth
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: CDK synth failed" -ForegroundColor Red
    exit 1
}

if (-not $DeployOnly) {
    # Upload CSV to S3
    if (-not $SkipCSVUpload) {
        Write-Host "Uploading CSV data to S3..." -ForegroundColor Cyan
        $csvPath = Join-Path (Split-Path -Parent (Split-Path -Parent $infraDir)) "python_backend\educational_youtube_content.csv"
        
        if (Test-Path $csvPath) {
            # Get bucket name from .env or use default
            $bucketName = "streamsmart-csv-data-$env:CDK_DEFAULT_ACCOUNT-$Region"
            
            Write-Host "Creating S3 bucket if it doesn't exist..." -ForegroundColor Cyan
            aws s3 mb "s3://$bucketName" --region $Region 2>$null
            
            Write-Host "Uploading CSV to s3://$bucketName/educational_youtube_content.csv" -ForegroundColor Cyan
            aws s3 cp $csvPath "s3://$bucketName/educational_youtube_content.csv"
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "CSV uploaded successfully!" -ForegroundColor Green
            } else {
                Write-Host "WARNING: CSV upload failed" -ForegroundColor Yellow
            }
        } else {
            Write-Host "WARNING: CSV file not found at $csvPath" -ForegroundColor Yellow
        }
    }
}

# Deploy infrastructure
Write-Host ""
Write-Host "Deploying infrastructure..." -ForegroundColor Cyan
Write-Host "This may take 20-30 minutes. Please be patient..." -ForegroundColor Yellow
Write-Host ""

cdk deploy --all --require-approval never
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "===== Deployment Complete! =====" -ForegroundColor Green
Write-Host ""

# Get stack outputs
Write-Host "Retrieving stack outputs..." -ForegroundColor Cyan
$outputs = aws cloudformation describe-stacks --region $Region --query "Stacks[?starts_with(StackName, 'StreamSmart')].Outputs" --output json | ConvertFrom-Json

Write-Host ""
Write-Host "===== Important Endpoints =====" -ForegroundColor Cyan
foreach ($stack in $outputs) {
    foreach ($output in $stack) {
        Write-Host "$($output.OutputKey): $($output.OutputValue)" -ForegroundColor Yellow
    }
}

# Generate embeddings if not skipped
if (-not $DeployOnly -and -not $SkipEmbeddings) {
    Write-Host ""
    Write-Host "===== Generating Embeddings =====" -ForegroundColor Cyan
    Write-Host "This will take some time depending on dataset size..." -ForegroundColor Yellow
    
    $scriptsDir = Join-Path $infraDir "scripts"
    Set-Location $scriptsDir
    
    # Install Python dependencies
    Write-Host "Installing Python dependencies..." -ForegroundColor Cyan
    python -m pip install -r requirements.txt
    
    # Run embedding generation
    $csvPath = Join-Path (Split-Path -Parent (Split-Path -Parent $infraDir)) "python_backend\educational_youtube_content.csv"
    $opensearchEndpoint = $env:AWS_RAG_OPENSEARCH_ENDPOINT
    
    Write-Host "Generating embeddings..." -ForegroundColor Cyan
    python generate_embeddings.py `
        --csv-path $csvPath `
        --opensearch-endpoint $opensearchEndpoint `
        --region $Region `
        --create-index `
        --batch-size 100
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Embeddings generated successfully!" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Embedding generation failed" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "===== Setup Complete! =====" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test the API endpoint" -ForegroundColor Yellow
Write-Host "2. Update your frontend .env with the new API endpoint" -ForegroundColor Yellow
Write-Host "3. Monitor CloudWatch dashboards for performance" -ForegroundColor Yellow
Write-Host ""
