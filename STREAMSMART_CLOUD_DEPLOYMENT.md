STREAMSMART - GOOGLE CLOUD PLATFORM DEPLOYMENT PLAN
EXECUTIVE SUMMARY
This document provides a comprehensive deployment strategy for migrating and deploying the StreamSmart AI-powered YouTube learning platform to Google Cloud Platform (GCP). StreamSmart is a full-stack application consisting of a Next.js frontend, FastAPI backend, browser extension, and multiple AWS services that need to be migrated to GCP equivalents.

TABLE OF CONTENTS
Current Architecture Overview
GCP Service Mapping
Prerequisites & Requirements
Phase 1: Environment Setup
Phase 2: Database Migration
Phase 3: Storage & CDN Setup
Phase 4: Backend Deployment
Phase 5: Frontend Deployment
Phase 6: AI/ML Services Integration
Phase 7: Authentication Migration
Phase 8: Monitoring & Logging
Phase 9: CI/CD Pipeline
Phase 10: Testing & Go-Live
Cost Optimization Strategies
Rollback Plan
Post-Deployment Checklist
1. CURRENT ARCHITECTURE OVERVIEW
Application Components
Frontend: Next.js 15.1.3 + React 18 + TypeScript
Backend: FastAPI (Python) with Uvicorn server
Browser Extension: Manifest V3 (Chrome/Edge/Firefox)
Database: AWS DynamoDB (5 tables)
Storage: AWS S3 (transcripts, metadata)
Cache: AWS ElastiCache (Redis)
Search: AWS OpenSearch (vector embeddings)
Auth: AWS Cognito
AI/ML: Google Gemini, OpenAI, Amazon Bedrock
Current AWS Services in Use
DynamoDB (Users, Playlists, Videos, Activities, Transcripts)
S3 (Transcript storage)
Cognito (User authentication)
OpenSearch (Vector search with embeddings)
ElastiCache (Redis caching layer)
CloudWatch (Logging and monitoring)
Bedrock (Amazon Titan embeddings and LLM)
Lex V2 (Voice chat)
SageMaker (ML pipeline - optional)
2. GCP SERVICE MAPPING
AWS to GCP Migration Map
| AWS Service | GCP Equivalent | Migration Complexity | |-------------|---------------|---------------------| | DynamoDB | Firestore (Native mode) | Medium | | S3 | Cloud Storage | Low | | Cognito | Firebase Authentication | Medium-High | | OpenSearch | Vertex AI Vector Search | Medium | | ElastiCache Redis | Memorystore for Redis | Low | | CloudWatch | Cloud Logging + Monitoring | Low | | Bedrock Titan | Vertex AI (text-bison, embeddings) | Medium | | Lex V2 | Dialogflow CX | High | | Lambda | Cloud Functions / Cloud Run | Low | | API Gateway | Cloud Endpoints / API Gateway | Low | | SageMaker | Vertex AI Workbench | High |

Recommended GCP Architecture
Frontend Layer:

Primary Option: Cloud Run (containerized Next.js)
Alternative: Firebase Hosting + Cloud Functions
CDN: Cloud CDN for global distribution
Backend Layer:

API Server: Cloud Run (containerized FastAPI)
Serverless Functions: Cloud Functions (Gen 2)
Load Balancing: Cloud Load Balancer
Data Layer:

Primary Database: Firestore (Native mode)
Vector Search: Vertex AI Vector Search
Caching: Memorystore for Redis (Standard tier)
Storage: Cloud Storage (Standard class)
AI/ML Layer:

LLM: Vertex AI (Gemini Pro, text-bison)
Embeddings: Vertex AI Text Embeddings API
Voice Chat: Dialogflow CX
ML Pipeline: Vertex AI Pipelines
Security & Auth:

Authentication: Firebase Authentication
API Security: Identity-Aware Proxy (IAP)
Secrets Management: Secret Manager
SSL/TLS: Managed SSL certificates
DevOps:

CI/CD: Cloud Build + Artifact Registry
Monitoring: Cloud Monitoring + Cloud Logging
Error Tracking: Error Reporting
Infrastructure as Code: Terraform or Deployment Manager
3. PREREQUISITES & REQUIREMENTS
Google Cloud Account Setup
Create GCP Project

Project Name: streamsmart-production
Project ID: streamsmart-prod-[unique-id]
Billing Account: Link valid billing account
Enable Required APIs

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  storage-api.googleapis.com \
  redis.googleapis.com \
  aiplatform.googleapis.com \
  secretmanager.googleapis.com \
  cloudidentity.googleapis.com \
  firebase.googleapis.com \
  compute.googleapis.com \
  vpcaccess.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com
Set Up Service Accounts

streamsmart-backend-sa (Backend API access)
streamsmart-frontend-sa (Frontend services)
streamsmart-cicd-sa (CI/CD pipelines)
streamsmart-ml-sa (AI/ML operations)
Local Development Tools
Install Google Cloud SDK

# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
gcloud auth login
gcloud config set project streamsmart-prod-[unique-id]
Install Docker

# For containerizing applications
docker --version  # Should be 20.x or higher
Install Firebase CLI

npm install -g firebase-tools
firebase login
Install Terraform (Optional)

# For Infrastructure as Code
brew install terraform  # macOS
# or download from terraform.io
Domain and DNS Setup
Register Domain (if not already owned)

Recommended: streamsmart.app or streamsmart.io
Register via Google Domains or Cloudflare
DNS Configuration

Point nameservers to Cloud DNS
Create DNS zone in GCP
SSL Certificates

Use Google-managed SSL certificates
Automatic renewal enabled
4. PHASE 1: ENVIRONMENT SETUP
Step 1.1: Project Initialization
# Set project variables
export PROJECT_ID="streamsmart-prod"
export REGION="us-central1"
export ZONE="us-central1-a"

# Configure gcloud
gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION
gcloud config set compute/zone $ZONE
Step 1.2: Create VPC Network
# Create custom VPC
gcloud compute networks create streamsmart-vpc \
  --subnet-mode=custom \
  --bgp-routing-mode=regional

# Create subnets
gcloud compute networks subnets create streamsmart-subnet-us \
  --network=streamsmart-vpc \
  --region=us-central1 \
  --range=10.0.0.0/24 \
  --enable-private-ip-google-access

gcloud compute networks subnets create streamsmart-subnet-asia \
  --network=streamsmart-vpc \
  --region=asia-south1 \
  --range=10.1.0.0/24 \
  --enable-private-ip-google-access

# Create VPC connector for Cloud Run
gcloud compute networks vpc-access connectors create streamsmart-connector \
  --region=us-central1 \
  --network=streamsmart-vpc \
  --range=10.8.0.0/28
Step 1.3: Set Up Artifact Registry
# Create Docker repository
gcloud artifacts repositories create streamsmart-docker \
  --repository-format=docker \
  --location=us-central1 \
  --description="StreamSmart Docker images"

# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev
Step 1.4: Secret Manager Configuration
# Create secrets for sensitive data
gcloud secrets create openai-api-key --data-file=- <<< "$OPENAI_API_KEY"
gcloud secrets create gemini-api-key --data-file=- <<< "$GEMINI_API_KEY"
gcloud secrets create youtube-api-key --data-file=- <<< "$YOUTUBE_API_KEY"
gcloud secrets create redis-password --replication-policy="automatic"

# Grant access to service accounts
gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:streamsmart-backend-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
5. PHASE 2: DATABASE MIGRATION
Step 2.1: Firestore Setup
# Create Firestore database in Native mode
gcloud firestore databases create \
  --location=us-central1 \
  --type=firestore-native

# Create indexes (create indexes.json first)
gcloud firestore indexes composite create --collection-group=users \
  --field-config field-path=email,order=ASCENDING \
  --field-config field-path=createdAt,order=DESCENDING

gcloud firestore indexes composite create --collection-group=playlists \
  --field-config field-path=userId,order=ASCENDING \
  --field-config field-path=createdAt,order=DESCENDING

gcloud firestore indexes composite create --collection-group=activities \
  --field-config field-path=userId,order=ASCENDING \
  --field-config field-path=timestamp,order=DESCENDING
Step 2.2: Database Schema Design (Firestore)
Collection Structure:

/users/{userId}
  - email: string
  - name: string
  - cognitoId: string (for backward compatibility during migration)
  - profile: map
  - preferences: map
  - weeklyGoal: number
  - achievements: array
  - createdAt: timestamp
  - updatedAt: timestamp

/playlists/{playlistId}
  - userId: string (indexed)
  - title: string
  - description: string
  - videos: array<map>
  - isPublic: boolean
  - createdAt: timestamp
  - updatedAt: timestamp

/videos/{videoId}
  - playlistId: string (indexed)
  - title: string
  - description: string
  - duration: number
  - thumbnail: string
  - url: string
  - transcript: string (or reference to Cloud Storage)
  - metadata: map
  - createdAt: timestamp

/activities/{activityId}
  - userId: string (indexed)
  - videoId: string
  - action: string
  - timestamp: timestamp
  - duration: number
  - metadata: map

/transcripts/{videoId}
  - videoId: string
  - content: string (or Cloud Storage path)
  - s3Path: string (legacy, migrate to gsPath)
  - gsPath: string (Cloud Storage path)
  - uploadedBy: string
  - uploadedAt: timestamp
  - metadata: map
Step 2.3: Data Migration Script
Create migration/dynamodb-to-firestore.py:

#!/usr/bin/env python3
"""
DynamoDB to Firestore Migration Script
Migrates all data from AWS DynamoDB to Google Cloud Firestore
"""

import boto3
from google.cloud import firestore
from datetime import datetime
import os
from tqdm import tqdm

# Initialize clients
dynamodb = boto3.resource('dynamodb', region_name='ap-south-2')
db = firestore.Client(project='streamsmart-prod')

# Table mappings
TABLES = {
    'users': 'users',
    'playlists': 'playlists',
    'videos': 'videos',
    'activities': 'activities',
    'transcripts': 'transcripts'
}

def migrate_table(dynamodb_table_name, firestore_collection_name):
    """Migrate a single DynamoDB table to Firestore collection"""
    print(f"\nMigrating {dynamodb_table_name} -> {firestore_collection_name}")
    
    table = dynamodb.Table(dynamodb_table_name)
    collection = db.collection(firestore_collection_name)
    
    # Scan DynamoDB table
    response = table.scan()
    items = response['Items']
    
    # Handle pagination
    while 'LastEvaluatedKey' in response:
        response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response['Items'])
    
    print(f"Found {len(items)} items to migrate")
    
    # Batch write to Firestore
    batch = db.batch()
    batch_count = 0
    
    for item in tqdm(items):
        # Convert DynamoDB item to Firestore document
        doc_id = item.get('id', item.get('videoId', str(uuid.uuid4())))
        doc_ref = collection.document(doc_id)
        
        # Clean and convert data
        clean_item = convert_dynamodb_to_firestore(item)
        
        batch.set(doc_ref, clean_item)
        batch_count += 1
        
        # Commit batch every 500 documents
        if batch_count >= 500:
            batch.commit()
            batch = db.batch()
            batch_count = 0
    
    # Commit remaining
    if batch_count > 0:
        batch.commit()
    
    print(f"✓ Migrated {len(items)} documents")

def convert_dynamodb_to_firestore(item):
    """Convert DynamoDB item format to Firestore format"""
    clean_item = {}
    
    for key, value in item.items():
        # Handle Decimal types (DynamoDB uses Decimal, Firestore uses float)
        if isinstance(value, Decimal):
            clean_item[key] = float(value)
        # Convert datetime strings to timestamps
        elif isinstance(value, str) and 'T' in value:  # ISO datetime
            try:
                clean_item[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
            except:
                clean_item[key] = value
        else:
            clean_item[key] = value
    
    return clean_item

def main():
    print("Starting DynamoDB to Firestore migration...")
    
    for dynamo_table, firestore_collection in TABLES.items():
        try:
            migrate_table(dynamo_table, firestore_collection)
        except Exception as e:
            print(f"✗ Error migrating {dynamo_table}: {e}")
            continue
    
    print("\n✓ Migration complete!")

if __name__ == "__main__":
    main()
Step 2.4: Run Migration
# Install dependencies
pip install google-cloud-firestore boto3 tqdm

# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
export AWS_PROFILE="streamsmart-admin"

# Run migration
python migration/dynamodb-to-firestore.py

# Verify migration
gcloud firestore export gs://streamsmart-backup/firestore-backup-$(date +%Y%m%d)
6. PHASE 3: STORAGE & CDN SETUP
Step 3.1: Create Cloud Storage Buckets
# Create primary storage bucket
gcloud storage buckets create gs://streamsmart-transcripts \
  --location=us-central1 \
  --uniform-bucket-level-access

# Create backup bucket
gcloud storage buckets create gs://streamsmart-backups \
  --location=us-central1 \
  --uniform-bucket-level-access

# Create static assets bucket
gcloud storage buckets create gs://streamsmart-assets \
  --location=us-central1 \
  --uniform-bucket-level-access \
  --public-access-prevention

# Enable versioning
gcloud storage buckets update gs://streamsmart-transcripts \
  --versioning

# Set lifecycle policy
cat > lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 90,
          "isLive": false
        }
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {
          "age": 30,
          "matchesStorageClass": ["STANDARD"]
        }
      }
    ]
  }
}
EOF

gcloud storage buckets update gs://streamsmart-transcripts \
  --lifecycle-file=lifecycle.json
Step 3.2: Migrate S3 Data to Cloud Storage
# Install gsutil transfer tool
pip install gsutil

# Configure AWS credentials
aws configure

# Transfer data using gsutil
gsutil -m rsync -r s3://streamsmart-transcripts-560271561936 gs://streamsmart-transcripts

# Verify transfer
gsutil du -sh gs://streamsmart-transcripts
Step 3.3: Set Up Cloud CDN
# Create backend bucket
gcloud compute backend-buckets create streamsmart-cdn-backend \
  --gcs-bucket-name=streamsmart-assets \
  --enable-cdn

# Create URL map
gcloud compute url-maps create streamsmart-cdn-map \
  --default-backend-bucket=streamsmart-cdn-backend

# Create SSL certificate
gcloud compute ssl-certificates create streamsmart-cert \
  --domains=cdn.streamsmart.app

# Create HTTPS proxy
gcloud compute target-https-proxies create streamsmart-cdn-proxy \
  --url-map=streamsmart-cdn-map \
  --ssl-certificates=streamsmart-cert

# Create forwarding rule
gcloud compute forwarding-rules create streamsmart-cdn-https \
  --global \
  --target-https-proxy=streamsmart-cdn-proxy \
  --ports=443
7. PHASE 4: BACKEND DEPLOYMENT
Step 4.1: Prepare Backend for Cloud Run
Create python_backend/Dockerfile:

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
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8080

# Run the application
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1
Create python_backend/.dockerignore:

__pycache__
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.env
.env.local
*.log
.DS_Store
Step 4.2: Update Backend for GCP
Create python_backend/config/gcp_config.py:

"""
GCP Configuration Module
Replaces AWS-specific code with GCP equivalents
"""

import os
from google.cloud import firestore, storage, secretmanager
from google.cloud.firestore_v1.base_query import FieldFilter
import redis

# Initialize clients
db = firestore.Client()
storage_client = storage.Client()
secrets_client = secretmanager.SecretManagerServiceClient()

# Project configuration
PROJECT_ID = os.getenv('GCP_PROJECT_ID', 'streamsmart-prod')
REGION = os.getenv('GCP_REGION', 'us-central1')

# Firestore collections
USERS_COLLECTION = 'users'
PLAYLISTS_COLLECTION = 'playlists'
VIDEOS_COLLECTION = 'videos'
ACTIVITIES_COLLECTION = 'activities'
TRANSCRIPTS_COLLECTION = 'transcripts'

# Cloud Storage
TRANSCRIPTS_BUCKET = 'streamsmart-transcripts'
ASSETS_BUCKET = 'streamsmart-assets'

# Memorystore Redis
REDIS_HOST = os.getenv('REDIS_HOST')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = get_secret('redis-password')

# Initialize Redis
redis_client = redis.StrictRedis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    password=REDIS_PASSWORD,
    ssl=True,
    decode_responses=True
)

def get_secret(secret_id: str) -> str:
    """Retrieve secret from Secret Manager"""
    name = f"projects/{PROJECT_ID}/secrets/{secret_id}/versions/latest"
    response = secrets_client.access_secret_version(request={"name": name})
    return response.payload.data.decode('UTF-8')

# API Keys
OPENAI_API_KEY = get_secret('openai-api-key')
GEMINI_API_KEY = get_secret('gemini-api-key')
YOUTUBE_API_KEY = get_secret('youtube-api-key')
Step 4.3: Update Database Operations
Create python_backend/db/firestore_operations.py:

"""
Firestore Database Operations
Replaces DynamoDB operations with Firestore equivalents
"""

from google.cloud import firestore
from typing import Dict, List, Optional
from datetime import datetime
import uuid

db = firestore.Client()

class FirestoreOperations:
    
    @staticmethod
    def create_user(user_data: Dict) -> str:
        """Create a new user"""
        user_id = str(uuid.uuid4())
        user_data['id'] = user_id
        user_data['createdAt'] = datetime.utcnow()
        user_data['updatedAt'] = datetime.utcnow()
        
        db.collection('users').document(user_id).set(user_data)
        return user_id
    
    @staticmethod
    def get_user(user_id: str) -> Optional[Dict]:
        """Get user by ID"""
        doc = db.collection('users').document(user_id).get()
        return doc.to_dict() if doc.exists else None
    
    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict]:
        """Get user by email"""
        users = db.collection('users').where('email', '==', email).limit(1).stream()
        for user in users:
            return user.to_dict()
        return None
    
    @staticmethod
    def update_user(user_id: str, updates: Dict) -> bool:
        """Update user data"""
        updates['updatedAt'] = datetime.utcnow()
        db.collection('users').document(user_id).update(updates)
        return True
    
    @staticmethod
    def create_playlist(playlist_data: Dict) -> str:
        """Create a new playlist"""
        playlist_id = str(uuid.uuid4())
        playlist_data['id'] = playlist_id
        playlist_data['createdAt'] = datetime.utcnow()
        playlist_data['updatedAt'] = datetime.utcnow()
        
        db.collection('playlists').document(playlist_id).set(playlist_data)
        return playlist_id
    
    @staticmethod
    def get_user_playlists(user_id: str) -> List[Dict]:
        """Get all playlists for a user"""
        playlists = db.collection('playlists') \
            .where('userId', '==', user_id) \
            .order_by('createdAt', direction=firestore.Query.DESCENDING) \
            .stream()
        
        return [playlist.to_dict() for playlist in playlists]
    
    @staticmethod
    def save_activity(activity_data: Dict) -> str:
        """Save user activity"""
        activity_id = str(uuid.uuid4())
        activity_data['id'] = activity_id
        activity_data['timestamp'] = datetime.utcnow()
        
        db.collection('activities').document(activity_id).set(activity_data)
        return activity_id
    
    @staticmethod
    def get_user_activities(user_id: str, limit: int = 50) -> List[Dict]:
        """Get user activities"""
        activities = db.collection('activities') \
            .where('userId', '==', user_id) \
            .order_by('timestamp', direction=firestore.Query.DESCENDING) \
            .limit(limit) \
            .stream()
        
        return [activity.to_dict() for activity in activities]
Step 4.4: Build and Push Docker Image
# Navigate to backend directory
cd python_backend

# Build Docker image
docker build -t us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/backend:latest .

# Test locally
docker run -p 8080:8080 \
  -e GCP_PROJECT_ID=$PROJECT_ID \
  us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/backend:latest

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/backend:latest
Step 4.5: Deploy to Cloud Run
# Deploy backend service
gcloud run deploy streamsmart-backend \
  --image=us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/backend:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --service-account=streamsmart-backend-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars="GCP_PROJECT_ID=$PROJECT_ID,GCP_REGION=us-central1" \
  --set-secrets="OPENAI_API_KEY=openai-api-key:latest,GEMINI_API_KEY=gemini-api-key:latest,YOUTUBE_API_KEY=youtube-api-key:latest" \
  --vpc-connector=streamsmart-connector \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300 \
  --max-instances=100 \
  --min-instances=1 \
  --concurrency=80

# Get service URL
gcloud run services describe streamsmart-backend \
  --region=us-central1 \
  --format='value(status.url)'
Step 4.6: Set Up Custom Domain for Backend
# Map custom domain
gcloud run domain-mappings create \
  --service=streamsmart-backend \
  --domain=api.streamsmart.app \
  --region=us-central1

# Update DNS (in Cloud DNS)
gcloud dns record-sets create api.streamsmart.app \
  --zone=streamsmart-zone \
  --type=CNAME \
  --ttl=300 \
  --rrdatas="ghs.googlehosted.com."
8. PHASE 5: FRONTEND DEPLOYMENT
Step 8.1: Update Frontend Configuration
Update src/lib/gcp-config.ts:

/**
 * GCP Configuration
 * Replaces AWS-specific configurations with GCP equivalents
 */

export const gcpConfig = {
  projectId: process.env.NEXT_PUBLIC_GCP_PROJECT_ID || 'streamsmart-prod',
  region: process.env.NEXT_PUBLIC_GCP_REGION || 'us-central1',
  
  // Firebase Configuration
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_GCP_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  },
  
  // Backend API
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.streamsmart.app',
  
  // Cloud Storage
  storageBucket: 'streamsmart-transcripts',
  cdnUrl: 'https://cdn.streamsmart.app',
  
  // AI Services
  vertexAI: {
    location: 'us-central1',
    model: 'gemini-pro',
  },
};
Update .env.production:

# GCP Configuration
NEXT_PUBLIC_GCP_PROJECT_ID=streamsmart-prod
NEXT_PUBLIC_GCP_REGION=us-central1

# Firebase Authentication
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=streamsmart-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=streamsmart-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Backend API
NEXT_PUBLIC_BACKEND_URL=https://api.streamsmart.app

# AI APIs (keep existing)
NEXT_PUBLIC_YOUTUBE_API_KEY=your-youtube-key
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key

# Cloud Storage
NEXT_PUBLIC_CDN_URL=https://cdn.streamsmart.app
Step 8.2: Replace AWS Amplify with Firebase
Create src/lib/firebase.ts:

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { gcpConfig } from './gcp-config';

// Initialize Firebase
const app = initializeApp(gcpConfig.firebase);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Auth helpers
export const signIn = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signUp = (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const logOut = () => {
  return signOut(auth);
};

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const onAuthChange = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};
Update src/contexts/AuthContext.tsx:

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, signIn, signUp, logOut, signInWithGoogle, onAuthChange } from '@/lib/firebase';
import { User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
Step 8.3: Create Frontend Dockerfile
Create Dockerfile:

# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build application
RUN npm run build

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
Update next.config.ts:

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Enable for Docker deployment
  
  // ... rest of existing config
};

export default nextConfig;
Step 8.4: Build and Deploy Frontend
# Build Docker image
docker build -t us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/frontend:latest .

# Test locally
docker run -p 3000:3000 \
  --env-file .env.production \
  us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/frontend:latest

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/frontend:latest

# Deploy to Cloud Run
gcloud run deploy streamsmart-frontend \
  --image=us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/frontend:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --service-account=streamsmart-frontend-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars="NEXT_PUBLIC_BACKEND_URL=https://api.streamsmart.app,NEXT_PUBLIC_GCP_PROJECT_ID=$PROJECT_ID" \
  --memory=1Gi \
  --cpu=1 \
  --timeout=60 \
  --max-instances=50 \
  --min-instances=1 \
  --concurrency=100

# Map custom domain
gcloud run domain-mappings create \
  --service=streamsmart-frontend \
  --domain=streamsmart.app \
  --region=us-central1

# Also map www subdomain
gcloud run domain-mappings create \
  --service=streamsmart-frontend \
  --domain=www.streamsmart.app \
  --region=us-central1
Step 8.5: Alternative: Deploy to Firebase Hosting
# Initialize Firebase in project
firebase init hosting

# Select project: streamsmart-prod
# Public directory: out
# Single-page app: Yes
# GitHub integration: Yes (optional)

# Update firebase.json
cat > firebase.json <<EOF
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "streamsmart-backend",
          "region": "us-central1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|woff|woff2|ttf)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000, immutable"
          }
        ]
      }
    ]
  }
}
EOF

# Build for static export
npm run build

# Deploy
firebase deploy --only hosting
9. PHASE 6: AI/ML SERVICES INTEGRATION
Step 9.1: Set Up Vertex AI
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Create Vertex AI endpoint region
export VERTEX_REGION="us-central1"

# Grant permissions to service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:streamsmart-backend-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
Step 9.2: Implement Vertex AI Integration
Create python_backend/services/vertex_ai_service.py:

"""
Vertex AI Service
Handles AI/ML operations using Google Cloud Vertex AI
"""

import vertexai
from vertexai.language_models import TextGenerationModel, TextEmbeddingModel
from vertexai.generative_models import GenerativeModel
from google.cloud import aiplatform
import os

PROJECT_ID = os.getenv('GCP_PROJECT_ID')
REGION = os.getenv('GCP_REGION', 'us-central1')

# Initialize Vertex AI
vertexai.init(project=PROJECT_ID, location=REGION)

class VertexAIService:
    
    def __init__(self):
        self.embedding_model = TextEmbeddingModel.from_pretrained("textembedding-gecko@003")
        self.generation_model = GenerativeModel("gemini-pro")
        self.text_model = TextGenerationModel.from_pretrained("text-bison@002")
    
    def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for text using Vertex AI"""
        embeddings = self.embedding_model.get_embeddings(texts)
        return [embedding.values for embedding in embeddings]
    
    def generate_text(self, prompt: str, max_tokens: int = 1024) -> str:
        """Generate text using Gemini Pro"""
        response = self.generation_model.generate_content(
            prompt,
            generation_config={
                "max_output_tokens": max_tokens,
                "temperature": 0.7,
                "top_p": 0.9,
            }
        )
        return response.text
    
    def generate_mindmap(self, video_data: dict) -> dict:
        """Generate mind map from video content"""
        prompt = f"""
        Create a comprehensive mind map structure for the following educational video:
        
        Title: {video_data.get('title')}
        Description: {video_data.get('description')}
        Transcript: {video_data.get('transcript', '')[:4000]}
        
        Return a JSON structure with nodes and edges for visualization.
        """
        
        response = self.generate_text(prompt)
        return self._parse_mindmap_response(response)
    
    def generate_quiz(self, transcript: str, difficulty: str = "medium") -> list:
        """Generate quiz questions from transcript"""
        prompt = f"""
        Generate 10 {difficulty} difficulty quiz questions from this transcript:
        
        {transcript[:3000]}
        
        Return a JSON array with questions, options, and correct answers.
        """
        
        response = self.generate_text(prompt)
        return self._parse_quiz_response(response)
    
    def _parse_mindmap_response(self, response: str) -> dict:
        """Parse mind map response"""
        import json
        try:
            return json.loads(response)
        except:
            return {"nodes": [], "edges": []}
    
    def _parse_quiz_response(self, response: str) -> list:
        """Parse quiz response"""
        import json
        try:
            return json.loads(response)
        except:
            return []

# Singleton instance
vertex_ai_service = VertexAIService()
Step 9.3: Set Up Vector Search
# Create Vector Search index
gcloud ai indexes create \
  --display-name=streamsmart-vector-index \
  --description="Vector embeddings for transcript search" \
  --metadata-file=vector-index-config.json \
  --region=us-central1

# Create endpoint
gcloud ai index-endpoints create \
  --display-name=streamsmart-vector-endpoint \
  --region=us-central1
Create vector-index-config.json:

{
  "contentsDeltaUri": "gs://streamsmart-transcripts/embeddings/",
  "config": {
    "dimensions": 768,
    "approximateNeighborsCount": 150,
    "distanceMeasureType": "COSINE_DISTANCE",
    "algorithmConfig": {
      "treeAhConfig": {
        "leafNodeEmbeddingCount": 10000,
        "leafNodesToSearchPercent": 7
      }
    }
  }
}
Step 9.4: Replace OpenSearch with Vector Search
Create python_backend/services/vector_search_service.py:

"""
Vector Search Service using Vertex AI Vector Search
Replaces AWS OpenSearch functionality
"""

from google.cloud import aiplatform
from google.cloud.aiplatform.matching_engine import MatchingEngineIndexEndpoint
import numpy as np
from typing import List, Dict
import os

PROJECT_ID = os.getenv('GCP_PROJECT_ID')
REGION = os.getenv('GCP_REGION', 'us-central1')
INDEX_ENDPOINT_NAME = os.getenv('VECTOR_SEARCH_ENDPOINT')

class VectorSearchService:
    
    def __init__(self):
        aiplatform.init(project=PROJECT_ID, location=REGION)
        self.endpoint = MatchingEngineIndexEndpoint(INDEX_ENDPOINT_NAME)
    
    def search_similar_videos(self, query_embedding: List[float], top_k: int = 10) -> List[Dict]:
        """Search for similar videos using vector similarity"""
        response = self.endpoint.find_neighbors(
            deployed_index_id="deployed_index_id",
            queries=[query_embedding],
            num_neighbors=top_k
        )
        
        results = []
        for neighbor in response[0]:
            results.append({
                'video_id': neighbor.id,
                'score': neighbor.distance,
            })
        
        return results
    
    def index_video_transcript(self, video_id: str, transcript: str, metadata: Dict):
        """Index a video transcript for vector search"""
        # Generate embedding
        from services.vertex_ai_service import vertex_ai_service
        embedding = vertex_ai_service.generate_embeddings([transcript])[0]
        
        # Store in Cloud Storage for batch indexing
        from google.cloud import storage
        storage_client = storage.Client()
        bucket = storage_client.bucket('streamsmart-transcripts')
        
        # Create JSONL entry
        import json
        entry = {
            'id': video_id,
            'embedding': embedding,
            'restricts': [],
            'crowding_tag': metadata.get('category', 'general')
        }
        
        blob = bucket.blob(f'embeddings/{video_id}.json')
        blob.upload_from_string(json.dumps(entry))
        
        return True

vector_search_service = VectorSearchService()
Step 9.5: Set Up Dialogflow CX (Replace Lex)
# Enable Dialogflow API
gcloud services enable dialogflow.googleapis.com

# Create Dialogflow CX agent
gcloud alpha dialogflow cx agents create \
  --display-name="StreamSmart Voice Assistant" \
  --default-language-code=en \
  --time-zone="America/New_York" \
  --location=us-central1
10. PHASE 7: AUTHENTICATION MIGRATION
Step 10.1: Set Up Firebase Authentication
# Enable Firebase Authentication
firebase init auth

# Enable authentication methods in Firebase Console:
# - Email/Password
# - Google OAuth

# Configure OAuth consent screen
gcloud alpha iap oauth-brands create \
  --application_title="StreamSmart" \
  --support_email="support@streamsmart.app"
Step 10.2: Migrate Users from Cognito to Firebase
Create migration/cognito-to-firebase.py:

"""
Migrate users from AWS Cognito to Firebase Authentication
"""

import boto3
import firebase_admin
from firebase_admin import auth, credentials
import os
from tqdm import tqdm

# Initialize Firebase Admin
cred = credentials.Certificate('path/to/serviceAccountKey.json')
firebase_admin.initialize_app(cred)

# Initialize Cognito
cognito = boto3.client('cognito-idp', region_name='ap-south-2')
USER_POOL_ID = os.getenv('COGNITO_USER_POOL_ID')

def get_cognito_users():
    """Fetch all users from Cognito"""
    users = []
    pagination_token = None
    
    while True:
        if pagination_token:
            response = cognito.list_users(
                UserPoolId=USER_POOL_ID,
                PaginationToken=pagination_token
            )
        else:
            response = cognito.list_users(UserPoolId=USER_POOL_ID)
        
        users.extend(response['Users'])
        
        if 'PaginationToken' not in response:
            break
        
        pagination_token = response['PaginationToken']
    
    return users

def migrate_user(cognito_user):
    """Migrate a single user to Firebase"""
    # Extract user attributes
    attributes = {attr['Name']: attr['Value'] for attr in cognito_user.get('Attributes', [])}
    
    email = attributes.get('email')
    email_verified = attributes.get('email_verified', 'false') == 'true'
    name = attributes.get('name', '')
    
    if not email:
        print(f"Skipping user without email: {cognito_user.get('Username')}")
        return False
    
    try:
        # Create user in Firebase
        user = auth.create_user(
            email=email,
            email_verified=email_verified,
            display_name=name,
            disabled=cognito_user.get('Enabled', True) == False,
            uid=cognito_user.get('Username')  # Preserve Cognito user ID
        )
        
        # Send password reset email
        reset_link = auth.generate_password_reset_link(email)
        print(f"✓ Migrated {email} - Password reset: {reset_link}")
        
        return True
        
    except auth.EmailAlreadyExistsError:
        print(f"✗ User already exists: {email}")
        return False
    except Exception as e:
        print(f"✗ Error migrating {email}: {e}")
        return False

def main():
    print("Starting Cognito to Firebase user migration...")
    
    cognito_users = get_cognito_users()
    print(f"Found {len(cognito_users)} users in Cognito")
    
    success_count = 0
    for user in tqdm(cognito_users):
        if migrate_user(user):
            success_count += 1
    
    print(f"\n✓ Successfully migrated {success_count}/{len(cognito_users)} users")

if __name__ == "__main__":
    main()
Step 10.3: Update Authentication Endpoints
Update backend authentication to support both Cognito and Firebase during transition:

"""
python_backend/auth/auth_service.py
Dual authentication support during migration
"""

from firebase_admin import auth as firebase_auth
import boto3
from typing import Optional, Dict

class AuthService:
    
    def __init__(self):
        self.cognito_client = boto3.client('cognito-idp')
        self.use_firebase = os.getenv('USE_FIREBASE_AUTH', 'true') == 'true'
    
    async def verify_token(self, token: str) -> Optional[Dict]:
        """Verify authentication token from either Firebase or Cognito"""
        
        if self.use_firebase:
            try:
                decoded_token = firebase_auth.verify_id_token(token)
                return {
                    'user_id': decoded_token['uid'],
                    'email': decoded_token.get('email'),
                    'provider': 'firebase'
                }
            except Exception as e:
                print(f"Firebase token verification failed: {e}")
        
        # Fallback to Cognito
        try:
            response = self.cognito_client.get_user(AccessToken=token)
            user_attributes = {attr['Name']: attr['Value'] 
                             for attr in response['UserAttributes']}
            return {
                'user_id': response['Username'],
                'email': user_attributes.get('email'),
                'provider': 'cognito'
            }
        except Exception as e:
            print(f"Cognito token verification failed: {e}")
            return None

auth_service = AuthService()
11. PHASE 8: CACHING WITH MEMORYSTORE
Step 11.1: Create Redis Instance
# Create Memorystore Redis instance
gcloud redis instances create streamsmart-cache \
  --size=5 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --tier=standard \
  --network=streamsmart-vpc \
  --connect-mode=PRIVATE_SERVICE_ACCESS \
  --enable-auth

# Get connection info
gcloud redis instances describe streamsmart-cache \
  --region=us-central1 \
  --format="value(host,port,authString)"
Step 11.2: Update Backend to Use Memorystore
Update python_backend/cache/redis_client.py:

"""
Redis Cache Client for Memorystore
"""

import redis
import json
import os
from typing import Optional, Any
from functools import wraps

REDIS_HOST = os.getenv('REDIS_HOST')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD')

# Initialize Redis client
redis_client = redis.StrictRedis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    password=REDIS_PASSWORD,
    ssl=False,  # Private connection within VPC
    decode_responses=True,
    socket_connect_timeout=5,
    socket_keepalive=True,
    retry_on_timeout=True
)

class CacheService:
    
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            value = redis_client.get(key)
            return json.loads(value) if value else None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    @staticmethod
    def set(key: str, value: Any, ttl: int = 3600):
        """Set value in cache with TTL"""
        try:
            redis_client.setex(key, ttl, json.dumps(value))
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False
    
    @staticmethod
    def delete(key: str):
        """Delete key from cache"""
        try:
            redis_client.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False
    
    @staticmethod
    def cache_decorator(ttl: int = 3600):
        """Decorator for caching function results"""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Generate cache key
                cache_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
                
                # Try to get from cache
                cached_result = CacheService.get(cache_key)
                if cached_result is not None:
                    return cached_result
                
                # Execute function
                result = await func(*args, **kwargs)
                
                # Cache result
                CacheService.set(cache_key, result, ttl)
                
                return result
            return wrapper
        return decorator

cache_service = CacheService()
12. PHASE 9: MONITORING & LOGGING
Step 12.1: Set Up Cloud Monitoring
# Create notification channels
gcloud alpha monitoring channels create \
  --display-name="StreamSmart Email Alerts" \
  --type=email \
  --channel-labels=email_address=alerts@streamsmart.app

# Create uptime check
gcloud monitoring uptime create streamsmart-frontend-check \
  --resource-type=uptime-url \
  --host=streamsmart.app \
  --path=/ \
  --check-interval=60s

gcloud monitoring uptime create streamsmart-backend-check \
  --resource-type=uptime-url \
  --host=api.streamsmart.app \
  --path=/health \
  --check-interval=60s
Step 12.2: Create Alert Policies
# Create alert policy for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High Error Rate Alert" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s

# Create alert for high latency
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High Latency Alert" \
  --condition-display-name="P95 latency > 2s" \
  --condition-threshold-value=2000 \
  --condition-threshold-duration=300s
Step 12.3: Set Up Cloud Logging
Update backend with structured logging:

"""
python_backend/logging_config.py
Structured logging for Cloud Logging
"""

import logging
import google.cloud.logging
from google.cloud.logging.handlers import CloudLoggingHandler

# Initialize Cloud Logging
client = google.cloud.logging.Client()
handler = CloudLoggingHandler(client, name="streamsmart-backend")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()
logger.addHandler(handler)

class StructuredLogger:
    
    @staticmethod
    def info(message: str, **kwargs):
        """Log info with structured data"""
        logger.info(message, extra={'json_fields': kwargs})
    
    @staticmethod
    def error(message: str, error: Exception = None, **kwargs):
        """Log error with context"""
        extra_data = {'json_fields': kwargs}
        if error:
            extra_data['json_fields']['error'] = str(error)
        logger.error(message, extra=extra_data)
    
    @staticmethod
    def warning(message: str, **kwargs):
        """Log warning with context"""
        logger.warning(message, extra={'json_fields': kwargs})

structured_logger = StructuredLogger()
Step 12.4: Create Custom Dashboards
# Export dashboard configuration
cat > monitoring-dashboard.json <<EOF
{
  "displayName": "StreamSmart Production Dashboard",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Backend Request Rate",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"streamsmart-backend\""
                }
              }
            }]
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Backend Error Rate",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
                }
              }
            }]
          }
        }
      }
    ]
  }
}
EOF

# Create dashboard
gcloud monitoring dashboards create --config-from-file=monitoring-dashboard.json
13. PHASE 10: CI/CD PIPELINE
Step 13.1: Set Up Cloud Build
Create cloudbuild.yaml:

# CloudBuild configuration for StreamSmart
steps:
  # Step 1: Build Backend
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-backend'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/backend:$COMMIT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/backend:latest'
      - '-f'
      - 'python_backend/Dockerfile'
      - './python_backend'
  
  # Step 2: Push Backend Image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'push-backend'
    args:
      - 'push'
      - '--all-tags'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/backend'
    waitFor: ['build-backend']
  
  # Step 3: Build Frontend
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-frontend'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/frontend:$COMMIT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/frontend:latest'
      - '-f'
      - 'Dockerfile'
      - '.'
    env:
      - 'NEXT_PUBLIC_BACKEND_URL=https://api.streamsmart.app'
      - 'NEXT_PUBLIC_GCP_PROJECT_ID=$PROJECT_ID'
  
  # Step 4: Push Frontend Image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'push-frontend'
    args:
      - 'push'
      - '--all-tags'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/frontend'
    waitFor: ['build-frontend']
  
  # Step 5: Deploy Backend to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy-backend'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'streamsmart-backend'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/backend:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
    waitFor: ['push-backend']
  
  # Step 6: Deploy Frontend to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy-frontend'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'streamsmart-frontend'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/frontend:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
    waitFor: ['push-frontend']
  
  # Step 7: Run Tests
  - name: 'node:18'
    id: 'run-tests'
    entrypoint: 'npm'
    args: ['test']
    env:
      - 'CI=true'

# Build configuration
timeout: '1800s'
options:
  machineType: 'E2_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY

# Artifacts
images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/backend:$COMMIT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/frontend:$COMMIT_SHA'
Step 13.2: Create Build Triggers
# Create trigger for main branch
gcloud builds triggers create github \
  --name="streamsmart-production-deploy" \
  --repo-name="StreamSmart" \
  --repo-owner="HARISUNDARRAJENDRAN" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml"

# Create trigger for development branch
gcloud builds triggers create github \
  --name="streamsmart-staging-deploy" \
  --repo-name="StreamSmart" \
  --repo-owner="HARISUNDARRAJENDRAN" \
  --branch-pattern="^develop$" \
  --build-config="cloudbuild-staging.yaml"
Step 13.3: Set Up GitHub Actions (Alternative)
Create .github/workflows/deploy-gcp.yml:

name: Deploy to Google Cloud Platform

on:
  push:
    branches:
      - main
      - develop

env:
  PROJECT_ID: streamsmart-prod
  REGION: us-central1
  BACKEND_SERVICE: streamsmart-backend
  FRONTEND_SERVICE: streamsmart-frontend

jobs:
  setup-build-deploy:
    name: Setup, Build, and Deploy
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ env.PROJECT_ID }}
      
      - name: Configure Docker
        run: |
          gcloud auth configure-docker us-central1-docker.pkg.dev
      
      - name: Build Backend Image
        run: |
          docker build \
            -t us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/backend:$GITHUB_SHA \
            -t us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/backend:latest \
            -f python_backend/Dockerfile \
            ./python_backend
      
      - name: Build Frontend Image
        run: |
          docker build \
            -t us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/frontend:$GITHUB_SHA \
            -t us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/frontend:latest \
            -f Dockerfile \
            .
      
      - name: Push Images
        run: |
          docker push us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/backend:$GITHUB_SHA
          docker push us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/backend:latest
          docker push us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/frontend:$GITHUB_SHA
          docker push us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/frontend:latest
      
      - name: Deploy Backend
        run: |
          gcloud run deploy $BACKEND_SERVICE \
            --image=us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/backend:$GITHUB_SHA \
            --region=$REGION \
            --platform=managed
      
      - name: Deploy Frontend
        run: |
          gcloud run deploy $FRONTEND_SERVICE \
            --image=us-central1-docker.pkg.dev/$PROJECT_ID/streamsmart-docker/frontend:$GITHUB_SHA \
            --region=$REGION \
            --platform=managed
      
      - name: Verify Deployment
        run: |
          gcloud run services describe $BACKEND_SERVICE --region=$REGION
          gcloud run services describe $FRONTEND_SERVICE --region=$REGION
14. COST OPTIMIZATION STRATEGIES
14.1: Resource Optimization
Cloud Run Optimization:

# Use minimum instances only for production-critical services
gcloud run services update streamsmart-backend \
  --min-instances=1 \
  --max-instances=10

# No minimum instances for development
gcloud run services update streamsmart-backend-dev \
  --min-instances=0 \
  --max-instances=5
Memorystore Optimization:

# Use basic tier for development
gcloud redis instances create streamsmart-cache-dev \
  --size=1 \
  --tier=basic \
  --region=us-central1
Cloud Storage Optimization:

# Apply lifecycle policies
cat > lifecycle-policy.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {"age": 30}
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
        "condition": {"age": 90}
      },
      {
        "action": {"type": "Delete"},
        "condition": {"age": 365}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle-policy.json gs://streamsmart-transcripts
14.2: Cost Monitoring
# Create budget alert
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="StreamSmart Monthly Budget" \
  --budget-amount=500USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
14.3: Estimated Monthly Costs
Production Environment (Moderate Traffic):

| Service | Configuration | Est. Monthly Cost | |---------|--------------|------------------| | Cloud Run (Frontend) | 1-10 instances, 1GB RAM | $20-80 | | Cloud Run (Backend) | 1-10 instances, 2GB RAM | $40-120 | | Firestore | 1GB storage, 1M reads, 500K writes | $10-30 | | Cloud Storage | 100GB, 10K operations | $2.50 | | Memorystore Redis | Standard tier, 5GB | $150 | | Vertex AI | 1M tokens/month | $50-100 | | Cloud CDN | 1TB egress | $80 | | Cloud Monitoring | Standard metrics | $10 | | Firebase Auth | 50K MAU | Free | | Total Estimated | | $362-572/month |

Cost Optimization Tips:

Use Cloud Run with min-instances=0 for non-critical services
Implement aggressive caching to reduce Firestore reads
Use Cloud CDN to reduce egress costs
Optimize AI model usage with caching
Use committed use discounts for predictable workloads
15. TESTING & GO-LIVE
Step 15.1: Pre-Deployment Testing
# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Load testing with Artillery
cat > load-test.yml <<EOF
config:
  target: 'https://api.streamsmart.app'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"

scenarios:
  - name: "Get user playlists"
    flow:
      - get:
          url: "/api/playlists"
          headers:
            Authorization: "Bearer {{ token }}"
  
  - name: "Search videos"
    flow:
      - post:
          url: "/api/recommendations/search"
          json:
            query: "machine learning"
EOF

# Run load test
artillery run load-test.yml
Step 15.2: Smoke Tests
#!/bin/bash
# smoke-tests.sh

echo "Running smoke tests..."

# Test backend health
echo "Testing backend health..."
response=$(curl -s -o /dev/null -w "%{http_code}" https://api.streamsmart.app/health)
if [ $response -eq 200 ]; then
  echo "✓ Backend health check passed"
else
  echo "✗ Backend health check failed (HTTP $response)"
  exit 1
fi

# Test frontend
echo "Testing frontend..."
response=$(curl -s -o /dev/null -w "%{http_code}" https://streamsmart.app)
if [ $response -eq 200 ]; then
  echo "✓ Frontend check passed"
else
  echo "✗ Frontend check failed (HTTP $response)"
  exit 1
fi

# Test API endpoints
echo "Testing API endpoints..."
response=$(curl -s https://api.streamsmart.app/api/genres)
if [ ! -z "$response" ]; then
  echo "✓ API endpoints accessible"
else
  echo "✗ API endpoints failed"
  exit 1
fi

echo "✓ All smoke tests passed!"
Step 15.3: Go-Live Checklist
Pre-Launch (1 Week Before):


All data migrated from AWS to GCP

Database indexes created and optimized

All environment variables configured

SSL certificates provisioned

DNS records updated

CDN configured and tested

Monitoring dashboards created

Alert policies configured

Backup strategy implemented

Load testing completed

Security audit completed
Launch Day:


Final data sync from AWS

Update DNS to point to GCP services

Monitor error rates and latency

Verify authentication working

Test critical user flows

Monitor costs in real-time

Communicate with users about migration
Post-Launch (1 Week After):


Monitor system performance

Analyze error logs

Optimize based on real traffic

Collect user feedback

Document any issues and resolutions

Review and optimize costs

Decommission AWS resources (after 30 days)
16. ROLLBACK PLAN
Emergency Rollback Procedure
If critical issues arise within 24 hours:

#!/bin/bash
# rollback.sh - Emergency rollback script

echo "Initiating rollback procedure..."

# Step 1: Revert DNS to AWS
echo "Reverting DNS..."
gcloud dns record-sets update streamsmart.app \
  --zone=streamsmart-zone \
  --type=A \
  --ttl=300 \
  --rrdatas="OLD_AWS_IP"

gcloud dns record-sets update api.streamsmart.app \
  --zone=streamsmart-zone \
  --type=A \
  --ttl=300 \
  --rrdatas="OLD_AWS_API_IP"

# Step 2: Re-enable AWS services
echo "Re-enabling AWS services..."
aws elasticbeanstalk update-environment \
  --environment-name streamsmart-backend-prod \
  --option-settings Namespace=aws:autoscaling:asg,OptionName=MinSize,Value=2

# Step 3: Sync recent data back to AWS
echo "Syncing recent data to AWS..."
python scripts/sync-firestore-to-dynamodb.py --since="1 hour ago"

# Step 4: Notify team
echo "Sending notifications..."
curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
  -H 'Content-Type: application/json' \
  -d '{"text":"🚨 Rollback to AWS completed. All traffic reverted."}'

echo "✓ Rollback complete"
Gradual Migration Strategy (Recommended)
Instead of full cutover, use gradual traffic shifting:

# Week 1: 10% traffic to GCP
gcloud compute url-maps add-path-matcher streamsmart-lb \
  --path-matcher-name=split-traffic \
  --default-service=aws-backend \
  --backend-service-path-rules="/api/*=gcp-backend:0.1"

# Week 2: 25% traffic to GCP
# Week 3: 50% traffic to GCP
# Week 4: 75% traffic to GCP
# Week 5: 100% traffic to GCP
17. POST-DEPLOYMENT OPTIMIZATION
Performance Optimization
# Enable HTTP/2 and HTTP/3
gcloud compute backend-services update streamsmart-backend \
  --enable-cdn \
  --cache-mode=CACHE_ALL_STATIC \
  --default-ttl=3600

# Enable compression
gcloud compute backend-services update streamsmart-backend \
  --compression-mode=AUTOMATIC
Security Hardening
# Enable Cloud Armor
gcloud compute security-policies create streamsmart-security-policy \
  --description="DDoS and OWASP protection"

# Add rate limiting rule
gcloud compute security-policies rules create 1000 \
  --security-policy=streamsmart-security-policy \
  --expression="true" \
  --action=rate-based-ban \
  --rate-limit-threshold-count=100 \
  --rate-limit-threshold-interval-sec=60 \
  --ban-duration-sec=600

# Block known bad IPs
gcloud compute security-policies rules create 2000 \
  --security-policy=streamsmart-security-policy \
  --src-ip-ranges="IP_RANGE_TO_BLOCK" \
  --action=deny-403
DEPLOYMENT TIMELINE
Phase 1-2 (Week 1-2): Infrastructure Setup

Set up GCP project and networking
Create service accounts and permissions
Set up Firestore and migrate data
Total: 10-15 days
Phase 3-4 (Week 3): Storage and Backend

Migrate S3 to Cloud Storage
Deploy backend to Cloud Run
Test backend APIs
Total: 5-7 days
Phase 5-6 (Week 4): Frontend and AI

Deploy frontend to Cloud Run
Integrate Vertex AI services
Test end-to-end flows
Total: 5-7 days
Phase 7-8 (Week 5): Auth and Monitoring

Migrate to Firebase Auth
Set up monitoring and alerts
Test authentication flows
Total: 5-7 days
Phase 9-10 (Week 6): CI/CD and Testing

Set up Cloud Build pipelines
Comprehensive testing
Performance optimization
Total: 5-7 days
Phase 11 (Week 7): Go-Live

Final data sync
DNS cutover
Monitor and optimize
Total: 7 days
Total Estimated Timeline: 6-7 weeks

SUPPORT AND RESOURCES
GCP Documentation:

Cloud Run: https://cloud.google.com/run/docs
Firestore: https://cloud.google.com/firestore/docs
Vertex AI: https://cloud.google.com/vertex-ai/docs
Firebase: https://firebase.google.com/docs
Monitoring:

Cloud Monitoring: https://console.cloud.google.com/monitoring
Cloud Logging: https://console.cloud.google.com/logs
Error Reporting: https://console.cloud.google.com/errors
Cost Management:

Pricing Calculator: https://cloud.google.com/products/calculator
Billing Dashboard: https://console.cloud.google.com/billing
Support Channels:

GCP Support: https://cloud.google.com/support
Stack Overflow: Tag [google-cloud-platform]
Community: https://www.googlecloudcommunity.com/
CONCLUSION
This deployment plan provides a comprehensive roadmap for migrating StreamSmart from AWS to Google Cloud Platform. The phased approach ensures minimal downtime and risk, while the gradual migration strategy allows for testing and validation at each step.

Key success factors:

Thorough testing at each phase
Data integrity verification
Performance monitoring
Cost optimization from day one
Clear rollback procedures
Team training on GCP services
The estimated timeline is 6-7 weeks, with total monthly operational costs of $362-572 for moderate traffic levels. This plan balances performance, scalability, and cost-effectiveness while leveraging Google Cloud's powerful AI/ML capabilities.