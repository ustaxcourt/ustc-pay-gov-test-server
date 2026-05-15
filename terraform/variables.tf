variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev)"
  type        = string
  default     = "dev"
  validation {
    condition     = contains(["dev"], var.environment)
    error_message = "Environment must be dev."
  }
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "ustc-pay-gov-test-server"
}

variable "custom_domain" {
  description = "Custom domain name for the API"
  type        = string
  default     = "pay-gov-dev.ustaxcourt.gov"
}

variable "base_url" {
  description = "Base URL for the application"
  type        = string
  default     = ""
}

variable "node_env" {
  description = "Node.js runtime mode. One of: development, production, test."
  type        = string
  validation {
    condition     = contains(["development", "production", "test"], var.node_env)
    error_message = "node_env must be one of: development, production, test."
  }
}

variable "app_env" {
  description = "Deployment topology of this service. One of: local, dev, test."
  type        = string
  validation {
    condition     = contains(["local", "dev", "test"], var.app_env)
    error_message = "app_env must be one of: local, dev, test."
  }
}

# Lambda Configuration
variable "lambda_runtime" {
  description = "Runtime for Lambda functions"
  type        = string
  default     = "nodejs24.x"
}

variable "lambda_timeout" {
  description = "Timeout for Lambda functions in seconds"
  type        = number
  default     = 30
}

variable "lambda_memory_size" {
  description = "Memory size for Lambda functions in MB"
  type        = number
  default     = 512
}

# S3 Configuration
variable "s3_force_destroy" {
  description = "Force destroy S3 bucket even if it contains objects"
  type        = bool
  default     = false
}

# API Gateway Configuration
variable "api_gateway_stage_name" {
  description = "Stage name for API Gateway deployment"
  type        = string
  default     = "dev"
}

# Domain and SSL Configuration
variable "certificate_arn" {
  description = "ARN of the SSL certificate for custom domain (leave empty to skip domain setup)"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for the domain"
  type        = string
  default     = ""
}
