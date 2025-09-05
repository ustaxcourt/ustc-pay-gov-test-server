#!/bin/bash

# Build script for Lambda deployment
# This script replaces the serverless-esbuild functionality

set -e

echo "🔨 Building Lambda functions for deployment..."

# Change to project root directory
cd "$(dirname "$0")/.."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -f terraform/lambda-*.js
rm -f terraform/lambda-*-deployment.zip

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci --production=false
fi

# Bundle each Lambda function individually using esbuild
echo "📦 Bundling Lambda functions with esbuild..."

# Bundle SOAP API Lambda
echo "  📦 Bundling handleSoapRequestLambda..."
npx esbuild src/lambdas/handleSoapRequestLambda.ts \
  --bundle \
  --platform=node \
  --target=node18 \
  --format=cjs \
  --outfile=terraform/lambda-soap-api-bundled.js \
  --external:aws-sdk

# Bundle Resource Lambda  
echo "  📦 Bundling getResourceLambda..."
npx esbuild src/lambdas/getResourceLambda.ts \
  --bundle \
  --platform=node \
  --target=node18 \
  --format=cjs \
  --outfile=terraform/lambda-resource-bundled.js \
  --external:aws-sdk

# Bundle Pay Page Lambda
echo "  📦 Bundling getPayPageLambda..."
npx esbuild src/lambdas/getPayPageLambda.ts \
  --bundle \
  --platform=node \
  --target=node18 \
  --format=cjs \
  --outfile=terraform/lambda-pay-page-bundled.js \
  --external:aws-sdk

# Copy static files if they exist
if [ -d "src/static" ]; then
    echo "📄 Copying static files..."
    mkdir -p terraform/static
    cp -r src/static/* terraform/static/
fi

echo "✅ Build completed successfully!"
echo "📦 Bundled Lambda functions ready:"
echo "  - terraform/lambda-soap-api-bundled.js"
echo "  - terraform/lambda-resource-bundled.js"  
echo "  - terraform/lambda-pay-page-bundled.js"