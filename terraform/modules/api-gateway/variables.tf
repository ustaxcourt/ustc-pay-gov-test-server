variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev)"
  type        = string
}

variable "api_gateway_stage_name" {
  description = "Stage name for API Gateway deployment"
  type        = string
}

variable "soap_api_function_name" {
  description = "Name of the soap_api Lambda function"
  type        = string
}

variable "soap_api_invoke_arn" {
  description = "Invoke ARN of the soap_api Lambda function"
  type        = string
}

variable "soap_resource_function_name" {
  description = "Name of the soap_resource Lambda function"
  type        = string
}

variable "soap_resource_invoke_arn" {
  description = "Invoke ARN of the soap_resource Lambda function"
  type        = string
}

variable "pay_page_function_name" {
  description = "Name of the pay_page Lambda function"
  type        = string
}

variable "pay_page_invoke_arn" {
  description = "Invoke ARN of the pay_page Lambda function"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to resources"
  type        = map(string)
}