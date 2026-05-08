locals {
  account_id = data.aws_caller_identity.current.account_id

  github_sub = "repo:${var.github_org}/${var.github_repo}:*"

  # Constructed ARN patterns. Bootstrap does not read app-stack state — these
  # patterns must match the app stack's resource naming conventions exactly.
  # See doc/PAY-303-plan.md for the inventory of cross-references resolved
  # this way and the env-first vs project-first ordering warning.

  # Lambda functions: ${project}-${env}-* (terraform/modules/lambda/lambda.tf)
  lambda_function_arn_pattern = "arn:aws:lambda:${var.aws_region}:${local.account_id}:function:${var.project_name}-${var.environment}-*"

  # Lambda execution role: ${project}-${env}-lambda-role (terraform/iam.tf:3)
  lambda_role_arn = "arn:aws:iam::${local.account_id}:role/${var.project_name}-${var.environment}-lambda-role"

  # App S3 bucket: ${env}-${project} (terraform/locals.tf:18) — note env-first ordering
  app_bucket_arn = "arn:aws:s3:::${var.environment}-${var.project_name}"

  # Lambda log groups: /aws/lambda/${project}-${env}-*
  log_group_arn_pattern = "arn:aws:logs:${var.aws_region}:${local.account_id}:log-group:/aws/lambda/${var.project_name}-${var.environment}-*"

  # Access token secret: ustc/pay-gov/${env}/access-token-* (Secrets Manager appends a 6-char suffix)
  access_token_secret_arn_pattern = "arn:aws:secretsmanager:${var.aws_region}:${local.account_id}:secret:ustc/pay-gov/${var.environment}/access-token-*"

  # Terraform state bucket
  tf_state_bucket_arn = "arn:aws:s3:::${var.tf_state_bucket_name}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform-bootstrap"
  }
}
