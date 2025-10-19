#!/bin/bash
# StreamSmart Backend Deployment - Light Usage Configuration (~$100/month)

set -e

# Configuration
AWS_REGION="ap-south-1"
AWS_PROFILE="streamsmart-admin"
ACCOUNT_ID="011868793425"
VPC_ID="vpc-0cc433a6e70c9d8a3"
SUBNET1="subnet-090f0ddbfc59fadbd"
SUBNET2="subnet-09e2d9ccd6fd72143"
STACK_NAME="streamsmart-light"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_section() { echo -e "${BLUE}==== $1 ====${NC}"; }

echo ""
log_section "StreamSmart Light Usage Deployment (~\$100/month)"
echo ""
echo "Cost Optimizations Applied:"
echo "  ✓ OpenSearch: t3.small.search (single-AZ, 50GB)"
echo "  ✓ ECS: Fargate Spot (70% savings)"
echo "  ✓ CloudWatch: 7-day log retention"
echo "  ✓ S3: Lifecycle policies to Glacier"
echo ""

# Phase 1: Deploy Infrastructure
log_section "Phase 1: Deploying Infrastructure"

if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $AWS_REGION --profile $AWS_PROFILE &> /dev/null; then
    log_warn "Stack exists. Updating..."
    aws cloudformation update-stack \
        --stack-name $STACK_NAME \
        --template-body file://infrastructure-light-usage.yaml \
        --parameters \
            ParameterKey=VpcId,ParameterValue=$VPC_ID \
            ParameterKey=SubnetIds,ParameterValue="$SUBNET1\\,$SUBNET2" \
        --capabilities CAPABILITY_NAMED_IAM \
        --region $AWS_REGION \
        --profile $AWS_PROFILE || log_warn "No updates to perform"
else
    log_info "Creating new stack..."
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-body file://infrastructure-light-usage.yaml \
        --parameters \
            ParameterKey=VpcId,ParameterValue=$VPC_ID \
            ParameterKey=SubnetIds,ParameterValue="$SUBNET1\\,$SUBNET2" \
        --capabilities CAPABILITY_NAMED_IAM \
        --region $AWS_REGION \
        --profile $AWS_PROFILE
    
    log_info "Waiting for stack creation (10-15 minutes for single-AZ OpenSearch)..."
    aws cloudformation wait stack-create-complete \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --profile $AWS_PROFILE
fi

log_info "Infrastructure deployed!"

# Phase 2: Configure Secrets
log_section "Phase 2: Configuring Secrets"

S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    --profile $AWS_PROFILE \
    --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
    --output text)

OPENSEARCH_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    --profile $AWS_PROFILE \
    --query 'Stacks[0].Outputs[?OutputKey==`OpenSearchEndpoint`].OutputValue' \
    --output text)

log_info "S3 Bucket: $S3_BUCKET"
log_info "OpenSearch: $OPENSEARCH_ENDPOINT"

create_or_update_secret() {
    local name=$1
    local value=$2
    
    if aws secretsmanager describe-secret --secret-id $name --region $AWS_REGION --profile $AWS_PROFILE &> /dev/null; then
        aws secretsmanager update-secret --secret-id $name --secret-string "$value" \
            --region $AWS_REGION --profile $AWS_PROFILE &> /dev/null
    else
        aws secretsmanager create-secret --name $name --secret-string "$value" \
            --region $AWS_REGION --profile $AWS_PROFILE &> /dev/null
    fi
}

create_or_update_secret "streamsmart/rag-s3-bucket" "$S3_BUCKET"
create_or_update_secret "streamsmart/rag-opensearch-endpoint" "$OPENSEARCH_ENDPOINT"
create_or_update_secret "streamsmart/rag-embed-model" "amazon.titan-embed-text-v2:0"
create_or_update_secret "streamsmart/rag-llm-model" "amazon.titan-text-express-v1"

log_info "Secrets configured!"

# Phase 3: Build and Push
log_section "Phase 3: Building Docker Image"

BACKEND_ECR=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    --profile $AWS_PROFILE \
    --query 'Stacks[0].Outputs[?OutputKey==`BackendECRRepository`].OutputValue' \
    --output text)

log_info "Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION --profile $AWS_PROFILE | \
    docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

log_info "Building backend..."
cd python_backend
docker build -t streamsmart-backend:latest -f Dockerfile . --quiet
cd ..

log_info "Pushing to ECR..."
docker tag streamsmart-backend:latest $BACKEND_ECR:latest
docker push $BACKEND_ECR:latest --quiet

log_info "Image pushed!"

# Phase 4: DynamoDB
log_section "Phase 4: Creating DynamoDB Table"

if aws dynamodb describe-table --table-name Videos --region $AWS_REGION --profile $AWS_PROFILE &> /dev/null; then
    log_warn "DynamoDB table exists"
else
    aws dynamodb create-table \
        --table-name Videos \
        --attribute-definitions \
            AttributeName=userId,AttributeType=S \
            AttributeName=videoId,AttributeType=S \
            AttributeName=createdAt,AttributeType=N \
        --key-schema \
            AttributeName=userId,KeyType=HASH \
            AttributeName=videoId,KeyType=RANGE \
        --billing-mode PAY_PER_REQUEST \
        --global-secondary-indexes \
            "IndexName=userId-createdAt-index,KeySchema=[{AttributeName=userId,KeyType=HASH},{AttributeName=createdAt,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
        --region $AWS_REGION \
        --profile $AWS_PROFILE &> /dev/null
    
    log_info "DynamoDB table created!"
fi

# Phase 5: Register Task Definition
log_section "Phase 5: Registering Task Definition"

sed "s/ACCOUNT_ID/$ACCOUNT_ID/g; s/REGION/$AWS_REGION/g" \
    ecs-task-definitions/backend-task-definition.json > backend-task-updated.json

aws ecs register-task-definition \
    --cli-input-json file://backend-task-updated.json \
    --region $AWS_REGION \
    --profile $AWS_PROFILE &> /dev/null

rm backend-task-updated.json
log_info "Task definition registered!"

# Phase 6: Create/Update ECS Service
log_section "Phase 6: Deploying ECS Service"

BACKEND_TG=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    --profile $AWS_PROFILE \
    --query 'Stacks[0].Outputs[?OutputKey==`BackendTargetGroupArn`].OutputValue' \
    --output text)

BACKEND_SG=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    --profile $AWS_PROFILE \
    --query 'Stacks[0].Outputs[?OutputKey==`BackendSecurityGroup`].OutputValue' \
    --output text)

if aws ecs describe-services --cluster streamsmart-cluster --services streamsmart-backend \
    --region $AWS_REGION --profile $AWS_PROFILE --query 'services[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
    
    log_warn "Service exists. Updating..."
    aws ecs update-service \
        --cluster streamsmart-cluster \
        --service streamsmart-backend \
        --force-new-deployment \
        --region $AWS_REGION \
        --profile $AWS_PROFILE &> /dev/null
else
    log_info "Creating service with Fargate Spot..."
    aws ecs create-service \
        --cluster streamsmart-cluster \
        --service-name streamsmart-backend \
        --task-definition streamsmart-backend \
        --desired-count 1 \
        --capacity-provider-strategy capacityProvider=FARGATE_SPOT,weight=1 \
        --network-configuration "awsvpcConfiguration={subnets=[$SUBNET1,$SUBNET2],securityGroups=[$BACKEND_SG],assignPublicIp=ENABLED}" \
        --load-balancers "targetGroupArn=$BACKEND_TG,containerName=streamsmart-backend,containerPort=8000" \
        --region $AWS_REGION \
        --profile $AWS_PROFILE &> /dev/null
fi

log_info "Service deployed!"

# Phase 7: Verify
log_section "Phase 7: Verification"

ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    --profile $AWS_PROFILE \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text)

log_info "Waiting for service to stabilize..."
aws ecs wait services-stable \
    --cluster streamsmart-cluster \
    --services streamsmart-backend \
    --region $AWS_REGION \
    --profile $AWS_PROFILE

echo ""
log_section "Deployment Complete! 🎉"
echo ""
echo "Backend API: http://$ALB_DNS/docs"
echo "CloudWatch Logs: /ecs/streamsmart-backend"
echo ""
echo "Cost Estimate: ~\$100/month"
echo "  - OpenSearch t3.small: ~\$50/month"
echo "  - Fargate Spot: ~\$5/month"
echo "  - ALB: ~\$25/month"
echo "  - Other: ~\$20/month"
echo ""
echo "To reduce costs further:"
echo "  • Scale to 0 when not in use: aws ecs update-service --desired-count 0"
echo "  • Scale up when needed: aws ecs update-service --desired-count 1"
echo ""
