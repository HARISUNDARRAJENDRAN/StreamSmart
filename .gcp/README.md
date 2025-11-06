# StreamSmart GCP Deployment Guide

## Overview
This directory contains configuration files and scripts for deploying StreamSmart to Google Cloud Platform (GCP).

## Prerequisites
- ✅ Google Cloud SDK installed
- ✅ Docker installed
- ✅ Firebase CLI installed
- GCP account with billing enabled
- Domain name (optional, can use Cloud Run URLs initially)

## Quick Start

### Phase 1: Initial Setup (Current Phase)

1. **Run the setup script:**
   ```powershell
   cd .gcp
   .\setup-script.ps1
   ```

2. **What the script does:**
   - Authenticates with GCP
   - Creates/selects project
   - Enables required APIs
   - Creates service accounts
   - Stores API keys in Secret Manager
   - Sets up Artifact Registry

3. **After setup:**
   - Review `project-info.json` for your project details
   - Update `config.yaml` with your specific settings

## Configuration Files

### `config.yaml`
Main configuration file with all GCP settings:
- Project information
- Service configurations (memory, CPU, scaling)
- Network settings
- Storage buckets
- Hybrid AWS/GCP service mapping

### `project-info.json`
Auto-generated file containing your project details.

### `setup-script.ps1`
PowerShell script for initial GCP setup.

## Hybrid AWS/GCP Architecture

StreamSmart uses a hybrid approach:

### AWS Services (Kept)
- **Bedrock**: ML models and embeddings
- **SageMaker**: ML pipelines
- **DynamoDB**: Database (during migration)
- **S3**: Storage (during migration)

### GCP Services (Migrated To)
- **Cloud Run**: Frontend & Backend hosting
- **Firestore**: Primary database
- **Cloud Storage**: File storage
- **Firebase Auth**: Authentication
- **Cloud CDN**: Content delivery
- **Memorystore**: Redis caching

## Next Steps

After completing Phase 1 setup:

### Phase 2: Containerization
- Create Dockerfiles for backend/frontend
- Build and test containers locally
- Push to Artifact Registry

### Phase 3: Backend Deployment
- Update backend code for GCP compatibility
- Deploy to Cloud Run
- Configure environment variables

### Phase 4: Frontend Deployment
- Update frontend for Firebase Auth
- Deploy to Cloud Run
- Set up custom domain

### Phase 5: Data Migration (Optional)
- Migrate DynamoDB to Firestore
- Migrate S3 to Cloud Storage
- Update application to use new services

## Useful Commands

### Authentication
```bash
# Login to GCP
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# View current config
gcloud config list
```

### Service Management
```bash
# List Cloud Run services
gcloud run services list

# View service logs
gcloud run services logs read streamsmart-backend

# Describe service
gcloud run services describe streamsmart-backend --region=us-central1
```

### Secret Management
```bash
# List secrets
gcloud secrets list

# Add new secret
echo "your-secret-value" | gcloud secrets create secret-name --data-file=-

# Access secret
gcloud secrets versions access latest --secret="secret-name"
```

### Docker & Artifact Registry
```bash
# Configure Docker auth
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build image
docker build -t us-central1-docker.pkg.dev/PROJECT_ID/streamsmart-docker/backend:latest .

# Push image
docker push us-central1-docker.pkg.dev/PROJECT_ID/streamsmart-docker/backend:latest
```

## Cost Monitoring

Expected monthly costs (moderate traffic):
- Cloud Run: $60-200
- Firestore: $10-30
- Cloud Storage: $2-10
- Memorystore: $150
- Vertex AI: $50-100
- CDN: $80
- **Total**: ~$350-570/month

Set up budget alerts:
```bash
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="StreamSmart Monthly Budget" \
  --budget-amount=500USD \
  --threshold-rule=percent=90
```

## Troubleshooting

### Common Issues

**1. API Not Enabled**
```bash
gcloud services enable SERVICE_NAME.googleapis.com
```

**2. Permission Denied**
Check service account roles:
```bash
gcloud projects get-iam-policy PROJECT_ID
```

**3. Docker Push Failed**
Re-authenticate Docker:
```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

**4. Cloud Run Deployment Failed**
Check logs:
```bash
gcloud run services logs read SERVICE_NAME --region=us-central1 --limit=50
```

## Support

- GCP Documentation: https://cloud.google.com/docs
- Cloud Run Docs: https://cloud.google.com/run/docs
- Firebase Docs: https://firebase.google.com/docs

## Security Notes

- Never commit `project-info.json` with sensitive data
- Use Secret Manager for all API keys and credentials
- Enable IAP (Identity-Aware Proxy) for production
- Regularly rotate service account keys
- Monitor audit logs in Cloud Logging
