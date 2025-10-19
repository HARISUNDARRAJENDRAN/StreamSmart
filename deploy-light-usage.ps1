# StreamSmart Backend Deployment - Light Usage Configuration (~$100/month)
# Run with: .\deploy-light-usage.ps1

param(
    [string]$Region = "ap-south-1",
    [string]$Profile = "streamsmart-admin",
    [string]$AccountId = "011868793425",
    [string]$VpcId = "vpc-0cc433a6e70c9d8a3",
    [string]$Subnet1 = "subnet-090f0ddbfc59fadbd",
    [string]$Subnet2 = "subnet-09e2d9ccd6fd72143",
    [string]$StackName = "streamsmart-light"
)

$ErrorActionPreference = "Stop"
$env:AWS_PROFILE = $Profile
$env:AWS_REGION = $Region

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Section { Write-Host "`n==== $args ====`n" -ForegroundColor Cyan }

Write-Host ""
Write-Section "StreamSmart Light Usage Deployment (~`$100/month)"
Write-Host "Cost Optimizations Applied:"
Write-Host "  ✓ OpenSearch: t3.small.search (single-AZ, 50GB)"
Write-Host "  ✓ ECS: Fargate Spot (70% savings)"
Write-Host "  ✓ CloudWatch: 7-day log retention"
Write-Host "  ✓ S3: Lifecycle policies to Glacier"
Write-Host ""

# Phase 1: Deploy Infrastructure
Write-Section "Phase 1: Deploying Infrastructure"

try {
    aws cloudformation describe-stacks --stack-name $StackName --region $Region --profile $Profile 2>$null
    Write-Warn "Stack exists. Updating..."
    
    aws cloudformation update-stack `
        --stack-name $StackName `
        --template-body file://infrastructure-light-usage.yaml `
        --parameters "ParameterKey=VpcId,ParameterValue=$VpcId" "ParameterKey=SubnetIds,ParameterValue=$Subnet1,$Subnet2" `
        --capabilities CAPABILITY_NAMED_IAM `
        --region $Region `
        --profile $Profile 2>$null
    
    if ($LASTEXITCODE -ne 0) { Write-Warn "No updates to perform" }
} catch {
    Write-Info "Creating new stack..."
    
    aws cloudformation create-stack `
        --stack-name $StackName `
        --template-body file://infrastructure-light-usage.yaml `
        --parameters "ParameterKey=VpcId,ParameterValue=$VpcId" "ParameterKey=SubnetIds,ParameterValue=$Subnet1,$Subnet2" `
        --capabilities CAPABILITY_NAMED_IAM `
        --region $Region `
        --profile $Profile
    
    Write-Info "Waiting for stack creation (10-15 minutes for single-AZ OpenSearch)..."
    aws cloudformation wait stack-create-complete `
        --stack-name $StackName `
        --region $Region `
        --profile $Profile
}

Write-Info "Infrastructure deployed!"

# Phase 2: Configure Secrets
Write-Section "Phase 2: Configuring Secrets"

$s3Bucket = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --profile $Profile `
    --query "Stacks[0].Outputs[?OutputKey==``S3BucketName``].OutputValue" `
    --output text

$opensearchEndpoint = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --profile $Profile `
    --query "Stacks[0].Outputs[?OutputKey==``OpenSearchEndpoint``].OutputValue" `
    --output text

Write-Info "S3 Bucket: $s3Bucket"
Write-Info "OpenSearch: $opensearchEndpoint"

function CreateOrUpdateSecret($name, $value) {
    try {
        aws secretsmanager describe-secret --secret-id $name --region $Region --profile $Profile 2>$null
        aws secretsmanager update-secret --secret-id $name --secret-string $value --region $Region --profile $Profile 2>&1 | Out-Null
    } catch {
        aws secretsmanager create-secret --name $name --secret-string $value --region $Region --profile $Profile 2>&1 | Out-Null
    }
}

CreateOrUpdateSecret "streamsmart/rag-s3-bucket" $s3Bucket
CreateOrUpdateSecret "streamsmart/rag-opensearch-endpoint" $opensearchEndpoint
CreateOrUpdateSecret "streamsmart/rag-embed-model" "amazon.titan-embed-text-v2:0"
CreateOrUpdateSecret "streamsmart/rag-llm-model" "amazon.titan-text-express-v1"

Write-Info "Secrets configured!"

# Phase 3: Build and Push
Write-Section "Phase 3: Building Docker Image"

$backendEcr = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --profile $Profile `
    --query "Stacks[0].Outputs[?OutputKey==``BackendECRRepository``].OutputValue" `
    --output text

Write-Info "Logging into ECR..."
$ecrPassword = aws ecr get-login-password --region $Region --profile $Profile
$ecrPassword | docker login --username AWS --password-stdin "$AccountId.dkr.ecr.$Region.amazonaws.com" 2>&1 | Out-Null

Write-Info "Building backend..."
Push-Location python_backend
docker build -t streamsmart-backend:latest -f Dockerfile . --quiet
Pop-Location

Write-Info "Pushing to ECR..."
docker tag streamsmart-backend:latest "$backendEcr:latest"
docker push "$backendEcr:latest" --quiet

Write-Info "Image pushed!"

# Phase 4: DynamoDB
Write-Section "Phase 4: Creating DynamoDB Table"

try {
    aws dynamodb describe-table --table-name Videos --region $Region --profile $Profile 2>$null
    Write-Warn "DynamoDB table exists"
} catch {
    aws dynamodb create-table `
        --table-name Videos `
        --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=videoId,AttributeType=S AttributeName=createdAt,AttributeType=N `
        --key-schema AttributeName=userId,KeyType=HASH AttributeName=videoId,KeyType=RANGE `
        --billing-mode PAY_PER_REQUEST `
        --global-secondary-indexes "IndexName=userId-createdAt-index,KeySchema=[{AttributeName=userId,KeyType=HASH},{AttributeName=createdAt,KeyType=RANGE}],Projection={ProjectionType=ALL}" `
        --region $Region `
        --profile $Profile 2>&1 | Out-Null
    
    Write-Info "DynamoDB table created!"
}

# Phase 5: Register Task Definition
Write-Section "Phase 5: Registering Task Definition"

$taskDefContent = Get-Content -Path "ecs-task-definitions\backend-task-definition.json" -Raw
$taskDefContent = $taskDefContent.Replace("ACCOUNT_ID", $AccountId).Replace("REGION", $Region)
$taskDefContent | Out-File -FilePath "backend-task-updated.json" -Encoding UTF8

aws ecs register-task-definition `
    --cli-input-json file://backend-task-updated.json `
    --region $Region `
    --profile $Profile 2>&1 | Out-Null

Remove-Item "backend-task-updated.json"
Write-Info "Task definition registered!"

# Phase 6: Create/Update ECS Service
Write-Section "Phase 6: Deploying ECS Service"

$backendTg = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --profile $Profile `
    --query "Stacks[0].Outputs[?OutputKey==``BackendTargetGroupArn``].OutputValue" `
    --output text

$backendSg = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --profile $Profile `
    --query "Stacks[0].Outputs[?OutputKey==``BackendSecurityGroup``].OutputValue" `
    --output text

$serviceStatus = aws ecs describe-services `
    --cluster streamsmart-cluster `
    --services streamsmart-backend `
    --region $Region `
    --profile $Profile `
    --query "services[0].status" `
    --output text 2>$null

if ($serviceStatus -eq "ACTIVE") {
    Write-Warn "Service exists. Updating..."
    aws ecs update-service `
        --cluster streamsmart-cluster `
        --service streamsmart-backend `
        --force-new-deployment `
        --region $Region `
        --profile $Profile 2>&1 | Out-Null
} else {
    Write-Info "Creating service with Fargate Spot..."
    
    $networkConfig = "awsvpcConfiguration={subnets=[$Subnet1,$Subnet2],securityGroups=[$backendSg],assignPublicIp=ENABLED}"
    $lbConfig = "targetGroupArn=$backendTg,containerName=streamsmart-backend,containerPort=8000"
    
    aws ecs create-service `
        --cluster streamsmart-cluster `
        --service-name streamsmart-backend `
        --task-definition streamsmart-backend `
        --desired-count 1 `
        --capacity-provider-strategy "capacityProvider=FARGATE_SPOT,weight=1" `
        --network-configuration $networkConfig `
        --load-balancers $lbConfig `
        --region $Region `
        --profile $Profile 2>&1 | Out-Null
}

Write-Info "Service deployed!"

# Phase 7: Verify
Write-Section "Phase 7: Verification"

$albDns = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --profile $Profile `
    --query "Stacks[0].Outputs[?OutputKey==``LoadBalancerDNS``].OutputValue" `
    --output text

Write-Info "Waiting for service to stabilize..."
aws ecs wait services-stable `
    --cluster streamsmart-cluster `
    --services streamsmart-backend `
    --region $Region `
    --profile $Profile

Write-Host ""
Write-Section "Deployment Complete! 🎉"
Write-Host ""
Write-Host "Backend API: http://$albDns/docs"
Write-Host "CloudWatch Logs: /ecs/streamsmart-backend"
Write-Host ""
Write-Host "Cost Estimate: ~`$100/month"
Write-Host "  - OpenSearch t3.small: ~`$50/month"
Write-Host "  - Fargate Spot: ~`$5/month"
Write-Host "  - ALB: ~`$25/month"
Write-Host "  - Other: ~`$20/month"
Write-Host ""
Write-Host "To reduce costs further:"
Write-Host "  • Scale to 0 when not in use: aws ecs update-service --desired-count 0"
Write-Host "  • Scale up when needed: aws ecs update-service --desired-count 1"
Write-Host ""
