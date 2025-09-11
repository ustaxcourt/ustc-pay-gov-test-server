# Lambda deployment packages - bundled with esbuild

# SOAP API Lambda - bundled with dependencies
data "archive_file" "lambda_soap_api_zip" {
  type        = "zip"
  output_path = "${path.root}/lambda-soap-api-deployment.zip"

  source {
    content  = file("${path.root}/lambda-soap-api-bundled.js")
    filename = "src/lambdas/handleSoapRequestLambda.js"
  }
}

# Resource Lambda - bundled with dependencies
data "archive_file" "lambda_resource_zip" {
  type        = "zip"
  output_path = "${path.root}/lambda-resource-deployment.zip"

  source {
    content  = file("${path.root}/lambda-resource-bundled.js")
    filename = "src/lambdas/getResourceLambda.js"
  }
}

# Pay Page Lambda - bundled with dependencies
data "archive_file" "lambda_pay_page_zip" {
  type        = "zip"
  output_path = "${path.root}/lambda-pay-page-deployment.zip"

  source {
    content  = file("${path.root}/lambda-pay-page-bundled.js")
    filename = "src/lambdas/getPayPageLambda.js"
  }
}

# Common environment variables for all Lambda functions
locals {
  lambda_environment = {
    BASE_URL     = var.base_url != "" ? var.base_url : var.custom_domain
    BUCKET_NAME  = var.s3_bucket_id
    ACCESS_TOKEN = var.access_token
    NODE_ENV     = var.node_env
  }
}

# Lambda function: soap_api
resource "aws_lambda_function" "soap_api" {
  filename         = data.archive_file.lambda_soap_api_zip.output_path
  function_name    = "${var.project_name}-${var.environment}-soap-api"
  role            = var.lambda_execution_role_arn
  handler         = "src/lambdas/handleSoapRequestLambda.handler"
  source_code_hash = data.archive_file.lambda_soap_api_zip.output_base64sha256
  runtime         = var.lambda_runtime
  timeout         = var.lambda_timeout
  memory_size     = var.lambda_memory_size

  environment {
    variables = local.lambda_environment
  }

  depends_on = [
    aws_cloudwatch_log_group.soap_api,
  ]

  tags = var.common_tags
}

# Lambda function: soap_resource
resource "aws_lambda_function" "soap_resource" {
  filename         = data.archive_file.lambda_resource_zip.output_path
  function_name    = "${var.project_name}-${var.environment}-soap-resource"
  role            = var.lambda_execution_role_arn
  handler         = "src/lambdas/getResourceLambda.handler"
  source_code_hash = data.archive_file.lambda_resource_zip.output_base64sha256
  runtime         = var.lambda_runtime
  timeout         = var.lambda_timeout
  memory_size     = var.lambda_memory_size

  environment {
    variables = local.lambda_environment
  }

  depends_on = [
    aws_cloudwatch_log_group.soap_resource,
  ]

  tags = var.common_tags
}

# Lambda function: pay_page
resource "aws_lambda_function" "pay_page" {
  filename         = data.archive_file.lambda_pay_page_zip.output_path
  function_name    = "${var.project_name}-${var.environment}-pay-page"
  role            = var.lambda_execution_role_arn
  handler         = "src/lambdas/getPayPageLambda.handler"
  source_code_hash = data.archive_file.lambda_pay_page_zip.output_base64sha256
  runtime         = var.lambda_runtime
  timeout         = var.lambda_timeout
  memory_size     = var.lambda_memory_size

  environment {
    variables = local.lambda_environment
  }

  depends_on = [
    aws_cloudwatch_log_group.pay_page,
  ]

  tags = var.common_tags
}

# CloudWatch Log Groups for Lambda functions
resource "aws_cloudwatch_log_group" "soap_api" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-soap-api"
  retention_in_days = 14
  tags              = var.common_tags
}

resource "aws_cloudwatch_log_group" "soap_resource" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-soap-resource"
  retention_in_days = 14
  tags              = var.common_tags
}

resource "aws_cloudwatch_log_group" "pay_page" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-pay-page"
  retention_in_days = 14
  tags              = var.common_tags
}