# Terraform Infrastructure for USTC Pay Gov Test Server

This directory contains complete Terraform configurations to manage the infrastructure for the USTC Pay Gov Test Server, migrated from the Serverless Framework.

## Migration Status: Complete

**Serverless Framework → Terraform migration complete with simplified single-environment structure!**

## Directory Structure

```
terraform/
├── main.tf                    # Main Terraform configuration and providers
├── variables.tf               # Variable definitions with validation
├── outputs.tf                 # Output definitions for API endpoints
├── terraform.tfvars           # Configuration variables
├── terraform.tfvars.template  # Variable template
├── iam.tf                     # Lambda execution roles and policies
├── build.sh                   # Lambda build script (replaces serverless-esbuild)
├── deploy.sh                  # Automated deployment script (replaces serverless deploy)
├── create-terraform-backend.sh # Backend setup automation script
└── modules/                   # Reusable infrastructure modules
    ├── s3/
    │   ├── s3.tf              # S3 bucket resources
    │   ├── variables.tf       # S3 module variables
    │   └── outputs.tf         # S3 module outputs
    ├── lambda/
    │   ├── lambda.tf          # Lambda function resources
    │   ├── variables.tf       # Lambda module variables
    │   └── outputs.tf         # Lambda module outputs
    └── api-gateway/
        ├── api-gateway.tf     # API Gateway resources
        ├── variables.tf       # API Gateway variables
        └── outputs.tf         # API Gateway outputs
```

## Infrastructure Overview

This Terraform configuration provides a complete 1:1 replacement for the existing `serverless.yml`:

| Component | Serverless Framework | Terraform Resource | Status |
|-----------|---------------------|-------------------|---------|
| **Lambda Functions** | `functions: soap_api, soap_resource, pay_page` | `aws_lambda_function` × 3 (optimized packaging) | Complete |
| **API Gateway** | `events: http` | `aws_api_gateway_*` | Complete |
| **S3 Bucket** | `resources: MyS3Bucket` | `aws_s3_bucket` | Complete |
| **IAM Roles** | `provider.iam.role` | `aws_iam_role` | Complete |
| **Custom Domain** | `custom.customDomain` | `aws_api_gateway_domain_name` | Complete |
| **Environment Variables** | `environment:` | `aws_lambda_function.environment` | Complete |
| **Build Process** | `serverless-esbuild` | `build.sh` script | Complete |
| **Deployment** | `serverless deploy` | `deploy.sh` script | Complete |

## Prerequisites

1. **AWS CLI configured** with appropriate credentials
2. **Terraform installed** (>= 1.0) - [Installation Guide](https://learn.hashicorp.com/tutorials/terraform/install-cli)
3. **Node.js and npm** for Lambda function builds
4. **S3 bucket** for Terraform state storage (optional but recommended)
5. **DynamoDB table** for state locking (optional but recommended)

### Install Terraform
```bash
# Using tfenv (recommended)
brew install tfenv
tfenv install latest
tfenv use latest

# Or install directly
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

## Quick Start

### 1. Backend State Management (Recommended)

Create S3 bucket and DynamoDB table for Terraform state management:

```bash
# Use the automated script (recommended)
./create-terraform-backend.sh

# Or create manually if needed:
# aws s3 mb s3://ustc-pay-gov-terraform-state --region us-east-1
# aws dynamodb create-table --table-name ustc-pay-gov-terraform-locks ...
```

### 2. Initialize Terraform

```bash
cd terraform/

# Initialize with backend configuration
terraform init -backend-config=backend.hcl
```

### 3. Configure Variables

Use the existing `terraform.tfvars` file or copy from template if needed:

```bash
# Use existing terraform.tfvars or copy from template if needed
cp terraform.tfvars.template terraform.tfvars  # if needed
# Edit terraform.tfvars with your specific values

# Plan deployment with configured variables
terraform plan
```

### 4. Set Sensitive Variables

Set the access token via environment variable (recommended):
```bash
export TF_VAR_access_token="your-actual-access-token"
```

## Deployment

### Quick Deployment (Recommended)

```bash
# Deploy to development environment
./deploy.sh dev

# Deploy with auto-approval (for CI/CD)
./deploy.sh dev auto-approve
```

### Manual Deployment

```bash
# Build Lambda functions
./build.sh

# Plan deployment
terraform plan

# Apply changes
terraform apply

# Destroy resources (use with caution)
terraform destroy
```

## Environment Configuration

### Development Environment
- Environment: `dev` (single environment setup)
- Stage: `dev`
- S3 force destroy: `true`
- Memory: 512MB
- Timeout: 30s
- Configuration: `terraform.tfvars` (root level)

## Resource Mapping

| Serverless Framework | Terraform Equivalent | File |
|---------------------|---------------------|------|
| `functions.soap_api` | `module.lambda.soap_api` | modules/lambda/lambda.tf |
| `functions.soap_resource` | `module.lambda.soap_resource` | modules/lambda/lambda.tf |
| `functions.pay_page` | `module.lambda.pay_page` | modules/lambda/lambda.tf |
| `resources.MyS3Bucket` | `module.s3.main` | modules/s3/s3.tf |
| `provider.iam.role` | `aws_iam_role.lambda_execution_role` | iam.tf |
| `events.http` | `module.api_gateway.*` resources | modules/api-gateway/api-gateway.tf |
| `custom.customDomain` | `aws_api_gateway_domain_name.main` | domain.tf |

## Command Reference

### Validation Commands
```bash
# Validate configuration
terraform validate

# Format code
terraform fmt

# Plan changes
terraform plan

# Show current state
terraform show

# List resources
terraform state list
```

### Build and Test
```bash
# Build Lambda functions
./build.sh

# Check what will be created/changed
terraform plan

# Check deployment outputs
terraform output
```

### Troubleshoot
```bash
# Get specific resource details
terraform state show aws_lambda_function.soap_api

# Show current state
terraform show
```

## Troubleshooting

### Common Issues

1. **Missing access_token**
   ```bash
   export TF_VAR_access_token="your-token"
   ```

2. **Build failures**
   ```bash
   # Ensure TypeScript builds successfully
   npm run build
   
   # Check dist/ directory exists
   ls -la dist/
   ```

3. **Custom domain issues**
   - Verify certificate_arn is set
   - Ensure Route53 zone exists (AWS Account: ustc-aws-isd-prod)
   - Check domain ownership

4. **Backend initialization fails**: Ensure S3 bucket and DynamoDB table exist
5. **Permission errors**: Verify AWS credentials have required permissions
6. **State conflicts**: Check for concurrent Terraform operations

### Required AWS Permissions

The AWS credentials used must have permissions for:
- **Lambda**: `lambda:*` (functions, permissions, event source mappings)
- **API Gateway**: `apigateway:*` (REST APIs, resources, methods, deployments)
- **S3**: `s3:*` (bucket management, object operations, policies)
- **IAM**: `iam:*` (roles, policies, attachments)
- **CloudWatch**: `logs:*` (log groups, log streams)
- **Route53**: `route53:*` (for custom domain configuration)
- **ACM**: `acm:*` (for SSL certificates)


## Security Notes

- **Never commit sensitive values** to version control
- Use environment variables or AWS Secrets Manager for secrets
- The `access_token` variable is marked as sensitive
- Consider using AWS IAM roles instead of long-lived access keys

## What's Ready Now

**All infrastructure is code-complete and ready for deployment:**

- **Lambda Functions**: All 3 functions with optimized single-file packaging and environment variables
- **API Gateway**: Complete REST API with all endpoints (`POST /wsdl`, `GET /wsdl`, `GET /wsdl/{filename}`, `GET /pay`)
- **S3 Bucket**: Storage with encryption, versioning, and proper IAM policies
- **IAM Roles**: Lambda execution role with S3 permissions matching serverless config
- **Custom Domain**: SSL certificate and Route53 configuration
- **Build Automation**: `build.sh` replaces `serverless-esbuild` 
- **Deployment Automation**: `deploy.sh` replaces `serverless deploy`

## Next Steps

1. **CI/CD Integration**: Update GitHub Actions to use Terraform
2. **Monitoring**: Set up CloudWatch dashboards and alarms  
3. **Testing**: Implement infrastructure testing
4. **Optimization**: Review costs and performance

## Support

For issues with this Terraform configuration:
1. Check the troubleshooting section above
2. Validate Terraform syntax: `terraform validate`
3. Review AWS permissions
4. Check CloudWatch logs for Lambda execution errors

## Additional Resources

- **[Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)**: Complete resource reference
- **[AWS Lambda with Terraform Tutorial](https://learn.hashicorp.com/tutorials/terraform/lambda-api-gateway)**