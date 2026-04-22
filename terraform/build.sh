#!/bin/bash

# Build script for Lambda deployment

set -e

echo "🔨 Building Lambda functions for deployment..."

# Change to project root directory
cd "$(dirname "$0")/.."

do_esbuild() {
  local input_file="$1"
  local output_file="$2"
  echo "  📦 Bundling $input_file to $output_file..."
  npx esbuild "$input_file" \
    --bundle \
    --platform=node \
    --target=node18 \
    --format=cjs \
    --outfile="$output_file" \
    --external:aws-sdk
  bundled_files+=("$output_file")
}

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

# Initialize bundled Lambda files array (populated by do_esbuild)
bundled_files=()

# Bundle each Lambda function individually using esbuild
echo "📦 Bundling Lambda functions with esbuild..."
do_esbuild src/lambdas/handleSoapRequestLambda.ts terraform/lambda-soap-api-bundled.js
do_esbuild src/lambdas/getResourceLambda.ts terraform/lambda-resource-bundled.js
do_esbuild src/lambdas/getPayPageLambda.ts terraform/lambda-pay-page-bundled.js
do_esbuild src/lambdas/getScriptLambda.ts terraform/lambda-script-bundled.js
do_esbuild src/lambdas/markPaymentStatusLambda.ts terraform/lambda-mark-payment-status-bundled.js

# Copy static files if they exist
if [ -d "src/static" ]; then
    echo "📄 Copying static files..."
    mkdir -p terraform/static
    cp -r src/static/* terraform/static/
fi

echo "✅ Build completed successfully!"
echo "📦 Bundled Lambda functions ready:"
for file in "${bundled_files[@]}"; do
    echo "  - $file"
done
