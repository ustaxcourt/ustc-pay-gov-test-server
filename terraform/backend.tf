# Backend configuration for Terraform state
# 
# Usage:
# 1. Create S3 bucket and DynamoDB table for state management:
#    - S3 bucket: ustc-pay-gov-terraform-state
#    - DynamoDB table: ustc-pay-gov-terraform-locks
#
# 2. Initialize with backend config:
#    terraform init -backend-config="bucket=ustc-pay-gov-terraform-state" \
#                   -backend-config="key=ustc-pay-gov-test-server/terraform.tfstate" \
#                   -backend-config="region=us-east-1" \
#                   -backend-config="dynamodb_table=ustc-pay-gov-terraform-locks" \
#                   -backend-config="encrypt=true"

# Uncomment and customize the backend configuration below if you prefer 
# to include it directly in the configuration:

# terraform {
#   backend "s3" {
#     bucket         = "ustc-pay-gov-terraform-state"
#     key            = "ustc-pay-gov-test-server/terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "ustc-pay-gov-terraform-locks"
#     encrypt        = true
#   }
# }