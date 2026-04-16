#!/bin/bash

# Script to create S3 bucket for Terraform state management
# State locking is handled natively by S3 via use_lockfile = true (Terraform >= 1.10)
# Usage: ./create-terraform-backend.sh

set -e

BUCKET_NAME="ustc-pay-gov-terraform-state"
REGION="us-east-1"

echo "Creating Terraform backend infrastructure..."

# Check if S3 bucket exists
echo "Checking if S3 bucket '$BUCKET_NAME' exists..."
if aws s3api head-bucket --bucket "$BUCKET_NAME" --region "$REGION" 2>/dev/null; then
    echo "✓ S3 bucket '$BUCKET_NAME' already exists"
else
    echo "Creating S3 bucket '$BUCKET_NAME'..."
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION"
    
    # Enable versioning
    echo "Enabling versioning on S3 bucket..."
    aws s3api put-bucket-versioning \
        --bucket "$BUCKET_NAME" \
        --versioning-configuration Status=Enabled
    
    # Enable encryption
    echo "Enabling encryption on S3 bucket..."
    aws s3api put-bucket-encryption \
        --bucket "$BUCKET_NAME" \
        --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    },
                    "BucketKeyEnabled": false
                }
            ]
        }'
    
    # Block public access
    echo "Blocking public access to S3 bucket..."
    aws s3api put-public-access-block \
        --bucket "$BUCKET_NAME" \
        --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
    
    echo "✓ S3 bucket '$BUCKET_NAME' created successfully"
fi

echo ""
echo "✓ Terraform backend infrastructure is ready!"
echo ""
echo "You can now run:"
echo "terraform init -backend-config=backend-dev.hcl"
