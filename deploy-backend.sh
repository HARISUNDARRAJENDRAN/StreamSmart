#!/bin/bash
# StreamSmart Backend Deployment Script
# Run with: bash deploy-backend.sh

set -e  # Exit on error

# Configuration
AWS_REGION="ap-south-1"
AWS_PROFILE="streamsmart-admin"
ACCOUNT_ID="011868793425"
VPC_ID="vpc-0cc433a6e70c9d8a3"
SUBNET1="subnet-090f0ddbfc59fadbd"
SUBNET2="subnet-09e2d9ccd6fd72143"
STACK_NAME="streamsmart-infrastructure"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install it first."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Please install it first."
        exit 1
    fi
    
    # Verify AWS credentials
    if ! aws sts get-caller-identity --profile $AWS_PROFILE &> /dev/null; then
        log_error "AWS credentials not configured for profile: $AWS_PROFILE"
        exit 1
    fi
    
    log_info "Prerequisites check passed!"
}

# Phase 1: Deploy Infrastructure
deploy_infrastructure() {
    log_info "Phase 1: Deploying infrastructure with CloudFormation..."
    
    # Check if stack already exists
    if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $AWS_REGION --profile $AWS_PROFILE &> /dev/null; then
        log_warn "Stack $STACK_NAME already exists. Skipping creation."
        return 0
    fi
    
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-body file://ecs-task-definitions/infrastructure-cloudformation.yaml \
        --parameters \
            ParameterKey=VpcId,ParameterValue=$VPC_ID \
            ParameterKey=SubnetIds,ParameterValue="$SUBNET1\\,$SUBNET2" \
        --capabilities CAPABILITY_IAM \
        --region $AWS_REGION \
        --profile $AWS_PROFILE
    
    log_info "Waiting for stack creation (this may take 15-20 minutes)..."
    aws cloudformation wait stack-create-complete \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --profile $AWS_PROFILE
    
    log_info "Infrastructure stack created successfully!"
}

# Phase 2: Configure Secrets
configure_secrets() {
    log_info "Phase 2: Configuring AWS Secrets Manager..."
    
    # Get outputs from CloudFormation
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
    log_info "OpenSearch Endpoint: $OPENSEARCH_ENDPOINT"
    
    # Create or update secrets
    create_or_update_secret() {
        local secret_name=$1
        local secret_value=$2
        
        if aws secretsmanager describe-secret --secret-id $secret_name --region $AWS_REGION --profile $AWS_PROFILE &> /dev/null; then
            log_warn "Secret $secret_name already exists. Updating..."
            aws secretsmanager update-secret \
                --secret-id $secret_name \
                --secret-string "$secret_value" \
                --region $AWS_REGION \
                --profile $AWS_PROFILE &> /dev/null
        else
            aws secretsmanager create-secret \
                --name $secret_name \
                --secret-string "$secret_value" \
                --region $AWS_REGION \
                --profile $AWS_PROFILE &> /dev/null
        fi
    }
    
    create_or_update_secret "streamsmart/rag-s3-bucket" "$S3_BUCKET"
    create_or_update_secret "streamsmart/rag-opensearch-endpoint" "$OPENSEARCH_ENDPOINT"
    create_or_update_secret "streamsmart/rag-embed-model" "amazon.titan-embed-text-v2:0"
    create_or_update_secret "streamsmart/rag-llm-model" "amazon.titan-text-express-v1"
    
    log_info "Secrets configured successfully!"
}

# Phase 3: Build and Push Docker Images
build_and_push_images() {
    log_info "Phase 3: Building and pushing Docker images..."
    
    # Get ECR repository URI
    BACKEND_ECR=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --profile $AWS_PROFILE \
        --query 'Stacks[0].Outputs[?OutputKey==`BackendECRRepository`].OutputValue' \
        --output text)
    
    log_info "Backend ECR: $BACKEND_ECR"
    
    # Login to ECR
    log_info "Logging into ECR..."
    aws ecr get-login-password \
        --region $AWS_REGION \
        --profile $AWS_PROFILE | docker login \
        --username AWS \
        --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    
    # Build backend image
    log_info "Building backend Docker image..."
    cd python_backend
    docker build -t streamsmart-backend:latest -f Dockerfile .
    cd ..
    
    # Tag and push
    log_info "Pushing backend image to ECR..."
    docker tag streamsmart-backend:latest $BACKEND_ECR:latest
    docker push $BACKEND_ECR:latest
    
    log_info "Docker images pushed successfully!"
}

# Phase 4: Create DynamoDB Table
create_dynamodb_table() {
    log_info "Phase 4: Creating DynamoDB table..."
    
    # Check if table already exists
    if aws dynamodb describe-table --table-name Videos --region $AWS_REGION --profile $AWS_PROFILE &> /dev/null; then
        log_warn "DynamoDB table 'Videos' already exists. Skipping creation."
        return 0
    fi
    
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
            IndexName=userId-createdAt-index,KeySchema=[{AttributeName=userId,KeyType=HASH},{AttributeName=createdAt,KeyType=RANGE}],Projection={ProjectionType=ALL} \
        --region $AWS_REGION \
        --profile $AWS_PROFILE
    
    log_info "DynamoDB table created successfully!"
}

# Phase 5: Register Task Definition
register_task_definition() {
    log_info "Phase 5: Registering ECS task definition..."
    
    # Update task definition with actual values
    sed "s/ACCOUNT_ID/$ACCOUNT_ID/g; s/REGION/$AWS_REGION/g" \
        ecs-task-definitions/backend-task-definition.json > backend-task-updated.json
    
    aws ecs register-task-definition \
        --cli-input-json file://backend-task-updated.json \
        --region $AWS_REGION \
        --profile $AWS_PROFILE
    
    rm backend-task-updated.json
    
    log_info "Task definition registered successfully!"
}

# Phase 6: Create ECS Service
create_ecs_service() {
    log_info "Phase 6: Creating ECS service..."
    
    # Check if service already exists
    if aws ecs describe-services \
        --cluster streamsmart-cluster \
        --services streamsmart-backend \
        --region $AWS_REGION \
        --profile $AWS_PROFILE \
        --query 'services[0].status' --output text 2> /dev/null | grep -q "ACTIVE"; then
        log_warn "ECS service already exists. Updating..."
        
        aws ecs update-service \
            --cluster streamsmart-cluster \
            --service streamsmart-backend \
            --force-new-deployment \
            --region $AWS_REGION \
            --profile $AWS_PROFILE
        
        log_info "Service updated successfully!"
        return 0
    fi
    
    # Get resources from CloudFormation
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
    
    # Create service
    aws ecs create-service \
        --cluster streamsmart-cluster \
        --service-name streamsmart-backend \
        --task-definition streamsmart-backend \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$SUBNET1,$SUBNET2],securityGroups=[$BACKEND_SG],assignPublicIp=ENABLED}" \
        --load-balancers "targetGroupArn=$BACKEND_TG,containerName=streamsmart-backend,containerPort=8000" \
        --region $AWS_REGION \
        --profile $AWS_PROFILE
    
    log_info "ECS service created successfully!"
}

# Phase 7: Verify Deployment
verify_deployment() {
    log_info "Phase 7: Verifying deployment..."
    
    # Get load balancer DNS
    ALB_DNS=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --profile $AWS_PROFILE \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text)
    
    log_info "Load Balancer DNS: $ALB_DNS"
    log_info "Backend API Docs: http://$ALB_DNS/docs"
    
    # Check service status
    SERVICE_STATUS=$(aws ecs describe-services \
        --cluster streamsmart-cluster \
        --services streamsmart-backend \
        --region $AWS_REGION \
        --profile $AWS_PROFILE \
        --query 'services[0].deployments[0].rolloutState' \
        --output text)
    
    log_info "Service deployment status: $SERVICE_STATUS"
    
    # Wait for service to be stable
    log_info "Waiting for service to become stable (this may take a few minutes)..."
    aws ecs wait services-stable \
        --cluster streamsmart-cluster \
        --services streamsmart-backend \
        --region $AWS_REGION \
        --profile $AWS_PROFILE
    
    log_info "Deployment verification complete!"
    
    echo ""
    log_info "==================== DEPLOYMENT SUMMARY ===================="
    echo "Load Balancer: http://$ALB_DNS"
    echo "API Documentation: http://$ALB_DNS/docs"
    echo "CloudWatch Logs: /ecs/streamsmart-backend"
    echo ""
    echo "Next steps:"
    echo "1. Test the backend: curl http://$ALB_DNS/docs"
    echo "2. Configure Amazon Lex for conversational interface"
    echo "3. Set up monitoring and alarms"
    echo "4. Test RAG functionality with video transcripts"
    log_info "==========================================================="
}

# Main execution
main() {
    log_info "Starting StreamSmart backend deployment..."
    echo ""
    
    check_prerequisites
    echo ""
    
    # Ask user which phases to run
    echo "Select deployment phases to run:"
    echo "1. All phases (full deployment)"
    echo "2. Infrastructure only"
    echo "3. Build and deploy containers only"
    echo "4. Skip to verification"
    echo ""
    read -p "Enter choice (1-4): " choice
    
    case $choice in
        1)
            deploy_infrastructure
            configure_secrets
            build_and_push_images
            create_dynamodb_table
            register_task_definition
            create_ecs_service
            verify_deployment
            ;;
        2)
            deploy_infrastructure
            configure_secrets
            ;;
        3)
            build_and_push_images
            register_task_definition
            create_ecs_service
            verify_deployment
            ;;
        4)
            verify_deployment
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    log_info "Deployment completed successfully! 🎉"
}

# Run main function
main
