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
rm -f terraform/lambda-deployment.zip

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci --production=false
fi

# Build TypeScript
echo "🔧 Compiling TypeScript..."
npx tsc

# Install production dependencies in dist
echo "📦 Installing production dependencies..."
cp package.json dist/
cd dist/
npm ci --production --silent
cd ..

# Copy static files if they exist
if [ -d "src/static" ]; then
    echo "📄 Copying static files..."
    cp -r src/static dist/src/
fi

echo "✅ Build completed successfully!"
echo "📦 Lambda deployment package ready at: terraform/lambda-deployment.zip"