# StreamSmart AWS Deployment Guide
## Global, Always-On Deployment

## Overview
Deploy StreamSmart as an always-available, globally accessible application using AWS managed services.

## Benefits of This Approach
- ✅ Keep all existing AWS services (DynamoDB, S3, Cognito, Bedrock)
- ✅ No migration needed
- ✅ Always-on (no manual instance management)
- ✅ Auto-scaling based on traffic
- ✅ Global CDN for fast access worldwide
- ✅ Lower cost than GCP migration
- ✅ Simpler deployment process

## Architecture Components

### Frontend Options (Choose One)

#### Option 1: AWS Amplify Hosting (Recommended - Easiest)
- **Pros**: Automatic deployments from Git, built-in CDN, SSL certificates, CI/CD
- **Cost**: ~$15-30/month for moderate traffic
- **Setup Time**: 10 minutes
- **Best For**: Quick deployment, Git-based workflow

#### Option 2: S3 + CloudFront
- **Pros**: Lowest cost, full control
- **Cost**: ~$5-15/month
- **Setup Time**: 30 minutes
- **Best For**: Cost optimization, static export

### Backend Options (Choose One)

#### Option 1: AWS App Runner (Recommended - Simplest)
- **Pros**: Automatic deployments, auto-scaling, managed infrastructure, health checks
- **Cost**: ~$25-100/month depending on traffic
- **Setup Time**: 15 minutes
- **Best For**: Containerized apps, minimal DevOps

#### Option 2: Elastic Beanstalk
- **Pros**: More control, established service, integrated monitoring
- **Cost**: ~$30-120/month
- **Setup Time**: 30 minutes
- **Best For**: Traditional deployments, more customization

#### Option 3: ECS Fargate (Advanced)
- **Pros**: Full container orchestration, maximum control
- **Cost**: ~$40-150/month
- **Setup Time**: 1-2 hours
- **Best For**: Complex deployments, microservices

## Quick Start (Recommended Path)

### Step 1: Frontend Deployment (AWS Amplify)
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure Amplify
amplify configure

# Initialize Amplify in your project
amplify init

# Add hosting
amplify add hosting

# Deploy
amplify publish
```

### Step 2: Backend Deployment (AWS App Runner)
```bash
# Build Docker image
docker build -t streamsmart-backend ./python_backend

# Push to ECR
aws ecr create-repository --repository-name streamsmart-backend
aws ecr get-login-password | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com
docker tag streamsmart-backend:latest ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/streamsmart-backend:latest
docker push ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/streamsmart-backend:latest

# Deploy to App Runner (via Console or CLI)
aws apprunner create-service --service-name streamsmart-backend
```

### Step 3: Configure DNS (Route 53)
- Point your domain to Amplify
- Create CNAME for backend API
- Enable SSL certificates

## Deployment Methods

### Method A: One-Click Deploy (Fastest)
Use AWS Console UI for both Amplify and App Runner.

**Time**: 20 minutes  
**Complexity**: Low  
**Best For**: Getting started quickly

### Method B: CLI Deployment (Recommended)
Use AWS CLI and scripts for automation.

**Time**: 1 hour  
**Complexity**: Medium  
**Best For**: Reproducible deployments

### Method C: Infrastructure as Code (Advanced)
Use AWS CDK or CloudFormation.

**Time**: 2-3 hours  
**Complexity**: High  
**Best For**: Production-ready, version-controlled infrastructure

## Cost Breakdown (Monthly Estimates)

### Small Scale (Development/MVP)
- Amplify Hosting: $15
- App Runner: $25 (2 vCPU, 4GB RAM, minimal traffic)
- DynamoDB: $5 (existing)
- S3: $2 (existing)
- CloudFront: $10
- Route 53: $1
- **Total**: ~$58/month

### Medium Scale (Production)
- Amplify Hosting: $30
- App Runner: $80 (auto-scaling)
- DynamoDB: $20
- S3: $5
- CloudFront: $40
- ElastiCache: $50 (existing)
- OpenSearch: $50 (existing)
- Route 53: $1
- **Total**: ~$276/month

### Large Scale (High Traffic)
- Amplify Hosting: $50
- App Runner: $200 (high auto-scaling)
- DynamoDB: $100
- S3: $20
- CloudFront: $150
- ElastiCache: $100
- OpenSearch: $150
- Route 53: $1
- **Total**: ~$771/month

## Global Accessibility

### How It Works
1. **CloudFront CDN**: Caches your content at 450+ edge locations worldwide
2. **Route 53**: Routes users to nearest server with low latency
3. **Auto-Scaling**: Automatically adds capacity during high traffic
4. **Health Checks**: Automatically replaces unhealthy instances

### Performance Expectations
- **US Users**: 50-100ms latency
- **European Users**: 100-200ms latency
- **Asian Users**: 150-250ms latency
- **Availability**: 99.99% uptime SLA

## Next Steps

Choose your deployment path:

1. **Quick Start** (Recommended for now)
   - Follow the Quick Start guide above
   - Deploy to Amplify + App Runner
   - Test with CloudFront CDN

2. **Manual Setup** (More control)
   - Follow detailed setup guides in `/deployment-guides/`
   - Configure each service individually
   - Custom configurations

3. **Automated IaC** (Production-ready)
   - Use AWS CDK templates
   - Version-controlled infrastructure
   - CI/CD pipelines

## Support Resources
- AWS Amplify Docs: https://docs.amplify.aws/
- AWS App Runner Docs: https://docs.aws.amazon.com/apprunner/
- CloudFront Docs: https://docs.aws.amazon.com/cloudfront/
- Route 53 Docs: https://docs.aws.amazon.com/route53/
