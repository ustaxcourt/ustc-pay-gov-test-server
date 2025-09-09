output "api_gateway_url" {
  description = "Base URL for API Gateway stage"
  value       = module.api_gateway.api_gateway_url
}

output "custom_domain_url" {
  description = "Custom domain URL"
  value       = var.custom_domain != "" ? "https://${var.custom_domain}" : ""
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = module.s3.bucket_name
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = module.s3.bucket_arn
}

output "lambda_function_names" {
  description = "Names of all Lambda functions"
  value = {
    soap_api      = module.lambda.soap_api_function_name
    soap_resource = module.lambda.soap_resource_function_name
    pay_page      = module.lambda.pay_page_function_name
  }
}

output "lambda_function_arns" {
  description = "ARNs of all Lambda functions"
  value = {
    soap_api      = module.lambda.soap_api_invoke_arn
    soap_resource = module.lambda.soap_resource_invoke_arn
    pay_page      = module.lambda.pay_page_invoke_arn
  }
}

output "iam_role_arn" {
  description = "ARN of the IAM role used by Lambda functions"
  value       = aws_iam_role.lambda_execution_role.arn
}

output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = module.api_gateway.api_gateway_id
}

output "deployment_info" {
  description = "Deployment information"
  value = {
    environment         = var.environment
    project_name        = var.project_name
    aws_region          = var.aws_region
    deployed_at         = timestamp()
    terraform_workspace = terraform.workspace
  }
}