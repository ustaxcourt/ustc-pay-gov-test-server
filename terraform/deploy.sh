#!/bin/bash

# Deployment script for Terraform infrastructure

set -e

ENVIRONMENT=${1:-dev}
AUTO_APPROVE=${2:-false}

echo "🚀 Deploying USTC Pay Gov Test Server to $ENVIRONMENT environment..."

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging)$ ]]; then
    echo "❌ Error: Environment must be 'dev' or 'staging'"
    echo "Usage: $0 [dev|staging] [auto-approve]"
    exit 1
fi

# Change to terraform directory
cd "$(dirname "$0")"

# Build Lambda functions
echo "🔨 Building Lambda functions..."
./build.sh

# Check if terraform is initialized
if [ ! -d ".terraform" ]; then
    echo "⚠️  Terraform not initialized. Please run 'terraform init' first."
    echo "Refer to README.md for initialization instructions."
    exit 1
fi

# Use root terraform.tfvars file
TFVARS_FILE="terraform.tfvars"

if [ ! -f "$TFVARS_FILE" ]; then
    echo "❌ Error: Variables file not found: $TFVARS_FILE"
    exit 1
fi

echo "📋 Using variables file: $TFVARS_FILE"

# Check for required environment variables
if [ -z "$TF_VAR_access_token" ]; then
    echo "⚠️  Warning: TF_VAR_access_token not set. Make sure to set sensitive variables."
fi

# Plan deployment
echo "📝 Planning deployment..."
terraform plan -var-file="$TFVARS_FILE" -out="tfplan-${ENVIRONMENT}"

# Apply deployment
if [ "$AUTO_APPROVE" = "auto-approve" ]; then
    echo "🚀 Applying deployment (auto-approved)..."
    terraform apply "tfplan-${ENVIRONMENT}"
else
    echo "🚀 Ready to apply deployment. Review the plan above."
    terraform apply "tfplan-${ENVIRONMENT}"
fi

# Clean up plan file
rm -f "tfplan-${ENVIRONMENT}"

echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Deployment outputs:"
terraform output
