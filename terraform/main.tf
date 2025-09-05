terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  backend "s3" {
    # Backend configuration will be provided via backend config file
    # or command line arguments during terraform init
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Local values
locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  bucket_name = "${var.environment}-${var.project_name}"
}

# S3 Module
module "s3" {
  source = "./modules/s3"

  project_name              = var.project_name
  environment               = var.environment
  s3_force_destroy          = var.s3_force_destroy
  bucket_name               = local.bucket_name
  lambda_execution_role_arn = aws_iam_role.lambda_execution_role.arn
  common_tags               = local.common_tags
}

# Lambda Module
module "lambda" {
  source = "./modules/lambda"

  project_name              = var.project_name
  environment               = var.environment
  lambda_runtime            = var.lambda_runtime
  lambda_timeout            = var.lambda_timeout
  lambda_memory_size        = var.lambda_memory_size
  lambda_execution_role_arn = aws_iam_role.lambda_execution_role.arn
  s3_bucket_id              = module.s3.bucket_id
  base_url                  = var.base_url
  custom_domain             = var.custom_domain
  access_token              = var.access_token
  node_env                  = var.node_env
  common_tags               = local.common_tags
}

# API Gateway Module
module "api_gateway" {
  source = "./modules/api-gateway"

  project_name                = var.project_name
  environment                 = var.environment
  api_gateway_stage_name      = var.api_gateway_stage_name
  soap_api_function_name      = module.lambda.soap_api_function_name
  soap_api_invoke_arn         = module.lambda.soap_api_invoke_arn
  soap_resource_function_name = module.lambda.soap_resource_function_name
  soap_resource_invoke_arn    = module.lambda.soap_resource_invoke_arn
  pay_page_function_name      = module.lambda.pay_page_function_name
  pay_page_invoke_arn         = module.lambda.pay_page_invoke_arn
  common_tags                 = local.common_tags
}