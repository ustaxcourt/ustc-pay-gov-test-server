variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name (used for ARN construction and tagging)"
  type        = string
  default     = "ustc-pay-gov-test-server"
}

variable "environment" {
  description = "Deployment environment (used for ARN construction and tagging)"
  type        = string
  default     = "dev"
  validation {
    condition     = contains(["dev"], var.environment)
    error_message = "Environment must be dev."
  }
}

variable "github_org" {
  description = "GitHub organization that owns the repository"
  type        = string
  default     = "ustaxcourt"
}

variable "github_repo" {
  description = "GitHub repository name (used in OIDC trust policy sub claim)"
  type        = string
  default     = "ustc-pay-gov-test-server"
}

variable "github_oidc_provider_arn" {
  description = "ARN of the GitHub OIDC provider in this AWS account"
  type        = string
}

variable "deploy_role_name" {
  description = "Name of the IAM role assumed by GitHub Actions"
  type        = string
  default     = "ustc-github-actions-oidc-deployer-role"
}

variable "tf_state_bucket_name" {
  description = "S3 bucket holding Terraform state (both this stack and the app stack)"
  type        = string
  default     = "ustc-pay-gov-terraform-state"
}
