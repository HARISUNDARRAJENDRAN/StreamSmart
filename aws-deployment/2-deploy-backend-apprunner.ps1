# StreamSmart Backend Deployment to AWS App Runner
# This script deploys your FastAPI backend to AWS App Runner (always-on, auto-scaling)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "StreamSmart Backend - AWS App Runner" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$AWS_REGION = "ap-south-2"
$AWS_ACCOUNT_ID = "560271561936"
$SERVICE_NAME = "streamsmart-backend"
$REPO_NAME = "streamsmart-backend"
$IMAGE_TAG = "latest"

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Region: $AWS_REGION" -ForegroundColor Gray
Write-Host "  Account: $AWS_ACCOUNT_ID" -ForegroundColor Gray
Write-Host "  Service: $SERVICE_NAME" -ForegroundColor Gray
Write-Host ""

# Step 1: Check Docker
Write-Host "[1/7] Checking Docker..." -ForegroundColor Yellow
docker --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker not found. Please install Docker first." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Docker is running" -ForegroundColor Green
Write-Host ""

# Step 2: Create ECR Repository
Write-Host "[2/7] Creating ECR repository..." -ForegroundColor Yellow
aws ecr describe-repositories --repository-names $REPO_NAME --region $AWS_REGION 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "  Creating new repository..." -ForegroundColor Gray
    aws ecr create-repository `
        --repository-name $REPO_NAME `
        --region $AWS_REGION `
        --image-scanning-configuration scanOnPush=true
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ ECR repository created" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to create ECR repository" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ ECR repository already exists" -ForegroundColor Green
}
Write-Host ""

# Step 3: Create Dockerfile if it doesn't exist
Write-Host "[3/7] Preparing Dockerfile..." -ForegroundColor Yellow
$dockerfilePath = "..\python_backend\Dockerfile"

if (-not (Test-Path $dockerfilePath)) {
    Write-Host "  Creating Dockerfile..." -ForegroundColor Gray
    
    $dockerfileContent = @"
# Use Python 3.10 slim image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health', timeout=5)"

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
"@
    
    $dockerfileContent | Out-File -FilePath $dockerfilePath -Encoding UTF8
    Write-Host "✓ Dockerfile created" -ForegroundColor Green
} else {
    Write-Host "✓ Dockerfile found" -ForegroundColor Green
}
Write-Host ""

# Step 4: Build Docker Image
Write-Host "[4/7] Building Docker image..." -ForegroundColor Yellow
Write-Host "  This may take a few minutes..." -ForegroundColor Gray

Set-Location ..\python_backend
docker build -t $SERVICE_NAME`:$IMAGE_TAG .

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker build failed" -ForegroundColor Red
    Set-Location ..\aws-deployment
    exit 1
}

Set-Location ..\aws-deployment
Write-Host "✓ Docker image built successfully" -ForegroundColor Green
Write-Host ""

# Step 5: Login to ECR
Write-Host "[5/7] Logging in to ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ ECR login failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Logged in to ECR" -ForegroundColor Green
Write-Host ""

# Step 6: Tag and Push Image
Write-Host "[6/7] Pushing image to ECR..." -ForegroundColor Yellow
$ECR_URI = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME`:$IMAGE_TAG"

docker tag $SERVICE_NAME`:$IMAGE_TAG $ECR_URI
docker push $ECR_URI

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to push image" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Image pushed to ECR" -ForegroundColor Green
Write-Host ""

# Step 7: Deploy to App Runner
Write-Host "[7/7] Deploying to App Runner..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Choose deployment method:" -ForegroundColor Cyan
Write-Host "  1. AWS Console (UI - Easier to configure)" -ForegroundColor Gray
Write-Host "  2. AWS CLI (Automated)" -ForegroundColor Gray
$deployChoice = Read-Host "Enter choice (1 or 2)"

if ($deployChoice -eq "1") {
    Write-Host ""
    Write-Host "Opening AWS App Runner Console..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Follow these steps:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Click 'Create service'" -ForegroundColor Gray
    Write-Host "2. Source: Container registry → Amazon ECR" -ForegroundColor Gray
    Write-Host "3. Image URI: $ECR_URI" -ForegroundColor Gray
    Write-Host "4. Deployment trigger: Manual (or Automatic)" -ForegroundColor Gray
    Write-Host "5. Service name: $SERVICE_NAME" -ForegroundColor Gray
    Write-Host "6. Port: 8000" -ForegroundColor Gray
    Write-Host "7. CPU & Memory: 2 vCPU, 4 GB (adjust based on needs)" -ForegroundColor Gray
    Write-Host "8. Environment variables: Copy from .env.local" -ForegroundColor Gray
    Write-Host "   - AWS_REGION, DynamoDB tables, S3 buckets, etc." -ForegroundColor Gray
    Write-Host "9. Health check: /health" -ForegroundColor Gray
    Write-Host "10. Auto scaling: Min 1, Max 10 instances" -ForegroundColor Gray
    Write-Host "11. Click 'Create & deploy'" -ForegroundColor Gray
    Write-Host ""
    
    Start-Process "https://console.aws.amazon.com/apprunner/home?region=$AWS_REGION#/create"
    
    Write-Host "Press Enter when deployment is complete..." -ForegroundColor Green
    Read-Host
    
} else {
    Write-Host ""
    Write-Host "Deploying via CLI..." -ForegroundColor Yellow
    Write-Host "! Note: CLI deployment requires IAM role creation" -ForegroundColor Yellow
    Write-Host ""
    
    # Create App Runner service configuration
    $serviceConfig = @"
{
  "ServiceName": "$SERVICE_NAME",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "$ECR_URI",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "8000",
        "RuntimeEnvironmentVariables": {
          "AWS_REGION": "$AWS_REGION",
          "USE_DYNAMODB": "true"
        }
      }
    },
    "AutoDeploymentsEnabled": false
  },
  "InstanceConfiguration": {
    "Cpu": "2 vCPU",
    "Memory": "4 GB"
  },
  "HealthCheckConfiguration": {
    "Protocol": "HTTP",
    "Path": "/health",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  },
  "AutoScalingConfigurationArn": "arn:aws:apprunner:$AWS_REGION`:$AWS_ACCOUNT_ID:autoscalingconfiguration/DefaultConfiguration/1/00000000000000000000000000000001"
}
"@
    
    $serviceConfig | Out-File -FilePath "apprunner-config.json" -Encoding UTF8
    
    Write-Host "Using AWS Console is recommended for first deployment." -ForegroundColor Yellow
    Write-Host "Service configuration saved to apprunner-config.json" -ForegroundColor Green
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "✓ Backend Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Wait for App Runner service to become 'Running'" -ForegroundColor Gray
Write-Host "2. Note your service URL (e.g., https://abc123.ap-south-2.awsapprunner.com)" -ForegroundColor Gray
Write-Host "3. Update frontend NEXT_PUBLIC_BACKEND_URL with this URL" -ForegroundColor Gray
Write-Host "4. Test backend: curl https://your-service-url/health" -ForegroundColor Gray
Write-Host "5. Set up custom domain with Route 53 (optional)" -ForegroundColor Gray
Write-Host ""

# Save deployment info
$deploymentInfo = @{
    service = "AWS App Runner"
    deployed_at = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    region = $AWS_REGION
    image_uri = $ECR_URI
    service_name = $SERVICE_NAME
}

$deploymentInfo | ConvertTo-Json | Out-File -FilePath "deployment-info-backend.json"
Write-Host "✓ Deployment info saved to deployment-info-backend.json" -ForegroundColor Green
