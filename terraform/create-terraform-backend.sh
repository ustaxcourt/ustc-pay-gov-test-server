#!/bin/bash

# Script to create S3 bucket and DynamoDB table for Terraform state management
# Usage: ./create-terraform-backend.sh

set -e

BUCKET_NAME="ustc-pay-gov-terraform-state"
DYNAMODB_TABLE="ustc-pay-gov-terraform-locks"
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

# Check if DynamoDB table exists
echo "Checking if DynamoDB table '$DYNAMODB_TABLE' exists..."
if aws dynamodb describe-table --table-name "$DYNAMODB_TABLE" --region "$REGION" >/dev/null 2>&1; then
    echo "✓ DynamoDB table '$DYNAMODB_TABLE' already exists"
else
    echo "Creating DynamoDB table '$DYNAMODB_TABLE'..."
    aws dynamodb create-table \
        --table-name "$DYNAMODB_TABLE" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --region "$REGION"
    
    echo "Waiting for DynamoDB table to be active..."
    aws dynamodb wait table-exists --table-name "$DYNAMODB_TABLE" --region "$REGION"
    
    echo "✓ DynamoDB table '$DYNAMODB_TABLE' created successfully"
fi

echo ""
echo "✓ Terraform backend infrastructure is ready!"
echo ""
echo "You can now run:"
echo "terraform init -backend-config=\"bucket=$BUCKET_NAME\" \\"
echo "              -backend-config=\"key=ustc-pay-gov-test-server/terraform.tfstate\" \\"
echo "              -backend-config=\"region=$REGION\" \\"
echo "              -backend-config=\"dynamodb_table=$DYNAMODB_TABLE\" \\"
echo "              -backend-config=\"encrypt=true\""
