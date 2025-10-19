# StreamSmart Backend Deployment Script - PowerShell
# Run with: .\deploy-backend.ps1

param(
    [string]$Region = "ap-south-1",
    [string]$Profile = "streamsmart-admin",
    [string]$AccountId = "011868793425",
    [string]$VpcId = "vpc-0cc433a6e70c9d8a3",
    [string]$Subnet1 = "subnet-090f0ddbfc59fadbd",
    [string]$Subnet2 = "subnet-09e2d9ccd6fd72143",
    [string]$StackName = "streamsmart-infrastructure",
    [switch]$InfrastructureOnly,
    [switch]$ContainersOnly,
    [switch]$VerifyOnly
)

$ErrorActionPreference = "Stop"

# Set AWS profile
$env:AWS_PROFILE = $Profile
$env:AWS_REGION = $Region

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Check-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check AWS CLI
    try {
        aws --version | Out-Null
    } catch {
        Write-Error-Custom "AWS CLI not found. Please install it first."
        exit 1
    }
    
    # Check Docker
    try {
        docker --version | Out-Null
    } catch {
        Write-Error-Custom "Docker not found. Please install it first."
        exit 1
    }
    
    # Verify AWS credentials
    try {
        aws sts get-caller-identity --profile $Profile | Out-Null
    } catch {
        Write-Error-Custom "AWS credentials not configured for profile: $Profile"
        exit 1
    }
    
    Write-Info "Prerequisites check passed!"
}

function Deploy-Infrastructure {
    Write-Info "Phase 1: Deploying infrastructure with CloudFormation..."
    
    # Check if stack already exists
    $stackExists = $false
    try {
        aws cloudformation describe-stacks --stack-name $StackName --region $Region --profile $Profile 2>$null
        $stackExists = $true
    } catch {
        $stackExists = $false
    }
    
    if ($stackExists) {
        Write-Warn "Stack $StackName already exists. Skipping creation."
        return
    }
    
    # Create stack
    $subnetParam = "$Subnet1,$Subnet2"
    aws cloudformation create-stack `
        --stack-name $StackName `
        --template-body file://ecs-task-definitions/infrastructure-cloudformation.yaml `
        --parameters "ParameterKey=VpcId,ParameterValue=$VpcId" "ParameterKey=SubnetIds,ParameterValue=$subnetParam" `
        --capabilities CAPABILITY_IAM `
        --region $Region `
        --profile $Profile
    
    Write-Info "Waiting for stack creation (this may take 15-20 minutes)..."
    aws cloudformation wait stack-create-complete `
        --stack-name $StackName `
        --region $Region `
        --profile $Profile
    
    Write-Info "Infrastructure stack created successfully!"
}

function Configure-Secrets {
    Write-Info "Phase 2: Configuring AWS Secrets Manager..."
    
    # Get outputs from CloudFormation
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
    Write-Info "OpenSearch Endpoint: $opensearchEndpoint"
    
    # Function to create or update secret
    function CreateOrUpdateSecret {
        param(
            [string]$SecretName,
            [string]$SecretValue
        )
        
        $secretExists = $false
        try {
            aws secretsmanager describe-secret --secret-id $SecretName --region $Region --profile $Profile 2>$null
            $secretExists = $true
        } catch {
            $secretExists = $false
        }
        
        if ($secretExists) {
            Write-Warn "Secret $SecretName already exists. Updating..."
            aws secretsmanager update-secret `
                --secret-id $SecretName `
                --secret-string $SecretValue `
                --region $Region `
                --profile $Profile | Out-Null
        } else {
            aws secretsmanager create-secret `
                --name $SecretName `
                --secret-string $SecretValue `
                --region $Region `
                --profile $Profile | Out-Null
        }
    }
    
    CreateOrUpdateSecret "streamsmart/rag-s3-bucket" $s3Bucket
    CreateOrUpdateSecret "streamsmart/rag-opensearch-endpoint" $opensearchEndpoint
    CreateOrUpdateSecret "streamsmart/rag-embed-model" "amazon.titan-embed-text-v2:0"
    CreateOrUpdateSecret "streamsmart/rag-llm-model" "amazon.titan-text-express-v1"
    
    Write-Info "Secrets configured successfully!"
}

function Build-AndPushImages {
    Write-Info "Phase 3: Building and pushing Docker images..."
    
    # Get ECR repository URI
    $backendEcr = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --region $Region `
        --profile $Profile `
        --query "Stacks[0].Outputs[?OutputKey==``BackendECRRepository``].OutputValue" `
        --output text
    
    Write-Info "Backend ECR: $backendEcr"
    
    # Login to ECR
    Write-Info "Logging into ECR..."
    $ecrPassword = aws ecr get-login-password --region $Region --profile $Profile
    $ecrPassword | docker login --username AWS --password-stdin "$AccountId.dkr.ecr.$Region.amazonaws.com"
    
    # Build backend image
    Write-Info "Building backend Docker image..."
    Push-Location python_backend
    docker build -t streamsmart-backend:latest -f Dockerfile .
    Pop-Location
    
    # Tag and push
    Write-Info "Pushing backend image to ECR..."
    docker tag streamsmart-backend:latest "$backendEcr:latest"
    docker push "$backendEcr:latest"
    
    Write-Info "Docker images pushed successfully!"
}

function Create-DynamoDBTable {
    Write-Info "Phase 4: Creating DynamoDB table..."
    
    # Check if table already exists
    $tableExists = $false
    try {
        aws dynamodb describe-table --table-name Videos --region $Region --profile $Profile 2>$null
        $tableExists = $true
    } catch {
        $tableExists = $false
    }
    
    if ($tableExists) {
        Write-Warn "DynamoDB table 'Videos' already exists. Skipping creation."
        return
    }
    
    # Create table with GSI using separate command
    aws dynamodb create-table `
        --table-name Videos `
        --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=videoId,AttributeType=S AttributeName=createdAt,AttributeType=N `
        --key-schema AttributeName=userId,KeyType=HASH AttributeName=videoId,KeyType=RANGE `
        --billing-mode PAY_PER_REQUEST `
        --global-secondary-indexes "IndexName=userId-createdAt-index,KeySchema=[{AttributeName=userId,KeyType=HASH},{AttributeName=createdAt,KeyType=RANGE}],Projection={ProjectionType=ALL}" `
        --region $Region `
        --profile $Profile
    
    Write-Info "DynamoDB table created successfully!"
}

function Register-TaskDefinition {
    Write-Info "Phase 5: Registering ECS task definition..."
    
    # Update task definition with actual values
    $taskDefContent = Get-Content -Path "ecs-task-definitions\backend-task-definition.json" -Raw
    $taskDefContent = $taskDefContent.Replace("ACCOUNT_ID", $AccountId)
    $taskDefContent = $taskDefContent.Replace("REGION", $Region)
    $taskDefContent | Out-File -FilePath "backend-task-updated.json" -Encoding UTF8
    
    aws ecs register-task-definition `
        --cli-input-json file://backend-task-updated.json `
        --region $Region `
        --profile $Profile
    
    Remove-Item "backend-task-updated.json"
    
    Write-Info "Task definition registered successfully!"
}

function Create-ECSService {
    Write-Info "Phase 6: Creating ECS service..."
    
    # Check if service already exists
    $serviceStatus = aws ecs describe-services `
        --cluster streamsmart-cluster `
        --services streamsmart-backend `
        --region $Region `
        --profile $Profile `
        --query "services[0].status" `
        --output text 2>$null
    
    if ($serviceStatus -eq "ACTIVE") {
        Write-Warn "ECS service already exists. Updating..."
        
        aws ecs update-service `
            --cluster streamsmart-cluster `
            --service streamsmart-backend `
            --force-new-deployment `
            --region $Region `
            --profile $Profile
        
        Write-Info "Service updated successfully!"
        return
    }
    
    # Get resources from CloudFormation
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
    
    # Create network configuration string
    $networkConfig = "awsvpcConfiguration={subnets=[$Subnet1,$Subnet2],securityGroups=[$backendSg],assignPublicIp=ENABLED}"
    $loadBalancerConfig = "targetGroupArn=$backendTg,containerName=streamsmart-backend,containerPort=8000"
    
    # Create service
    aws ecs create-service `
        --cluster streamsmart-cluster `
        --service-name streamsmart-backend `
        --task-definition streamsmart-backend `
        --desired-count 1 `
        --launch-type FARGATE `
        --network-configuration $networkConfig `
        --load-balancers $loadBalancerConfig `
        --region $Region `
        --profile $Profile
    
    Write-Info "ECS service created successfully!"
}

function Verify-Deployment {
    Write-Info "Phase 7: Verifying deployment..."
    
    # Get load balancer DNS
    $albDns = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --region $Region `
        --profile $Profile `
        --query "Stacks[0].Outputs[?OutputKey==``LoadBalancerDNS``].OutputValue" `
        --output text
    
    Write-Info "Load Balancer DNS: $albDns"
    Write-Info "Backend API Docs: http://$albDns/docs"
    
    # Check service status
    $serviceStatus = aws ecs describe-services `
        --cluster streamsmart-cluster `
        --services streamsmart-backend `
        --region $Region `
        --profile $Profile `
        --query "services[0].deployments[0].rolloutState" `
        --output text
    
    Write-Info "Service deployment status: $serviceStatus"
    
    # Wait for service to be stable
    Write-Info "Waiting for service to become stable (this may take a few minutes)..."
    aws ecs wait services-stable `
        --cluster streamsmart-cluster `
        --services streamsmart-backend `
        --region $Region `
        --profile $Profile
    
    Write-Info "Deployment verification complete!"
    
    Write-Host ""
    Write-Info "==================== DEPLOYMENT SUMMARY ===================="
    Write-Host "Load Balancer: http://$albDns"
    Write-Host "API Documentation: http://$albDns/docs"
    Write-Host "CloudWatch Logs: /ecs/streamsmart-backend"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Test the backend: curl http://$albDns/docs"
    Write-Host "2. Configure Amazon Lex for conversational interface"
    Write-Host "3. Set up monitoring and alarms"
    Write-Host "4. Test RAG functionality with video transcripts"
    Write-Info "==========================================================="
}

# Main execution
Write-Info "Starting StreamSmart backend deployment..."
Write-Host ""

Check-Prerequisites
Write-Host ""

if ($VerifyOnly) {
    Verify-Deployment
}
elseif ($InfrastructureOnly) {
    Deploy-Infrastructure
    Configure-Secrets
}
elseif ($ContainersOnly) {
    Build-AndPushImages
    Create-DynamoDBTable
    Register-TaskDefinition
    Create-ECSService
    Verify-Deployment
}
else {
    # Full deployment
    Deploy-Infrastructure
    Configure-Secrets
    Build-AndPushImages
    Create-DynamoDBTable
    Register-TaskDefinition
    Create-ECSService
    Verify-Deployment
}

Write-Host ""
Write-Info "Deployment completed successfully! 🎉"
