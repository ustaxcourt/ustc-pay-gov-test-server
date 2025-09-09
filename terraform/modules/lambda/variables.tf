variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev)"
  type        = string
}

variable "lambda_runtime" {
  description = "Runtime for Lambda functions"
  type        = string
}

variable "lambda_timeout" {
  description = "Timeout for Lambda functions in seconds"
  type        = number
}

variable "lambda_memory_size" {
  description = "Memory size for Lambda functions in MB"
  type        = number
}

variable "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role"
  type        = string
}

variable "s3_bucket_id" {
  description = "ID of the S3 bucket"
  type        = string
}

variable "base_url" {
  description = "Base URL for the application"
  type        = string
}

variable "custom_domain" {
  description = "Custom domain name for the API"
  type        = string
}

variable "access_token" {
  description = "Access token for the application"
  type        = string
  sensitive   = true
}

variable "node_env" {
  description = "Node.js environment"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to resources"
  type        = map(string)
}