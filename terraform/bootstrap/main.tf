terraform {
  backend "s3" {
    # Backend configuration provided via -backend-config=backend.hcl
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

data "aws_caller_identity" "current" {}

resource "aws_iam_role" "github_actions_deployer" {
  name = var.deploy_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Sid    = "GithubOIDCAssumeRole"
        Principal = {
          Federated = var.github_oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = local.github_sub
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "github_actions_permissions" {
  name = "${var.project_name}-${var.environment}-ci-deployer"
  role = aws_iam_role.github_actions_deployer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:CreateFunction",
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:GetFunction*",
          "lambda:GetPolicy",
          "lambda:ListVersionsByFunction",
          "lambda:TagResource",
          "lambda:UntagResource"
        ]
        Resource = local.lambda_function_arn_pattern
      },

      # Read IAM roles the deployer references (itself and the Lambda exec role)
      {
        Effect = "Allow"
        Action = [
          "iam:GetRole",
          "iam:ListRolePolicies",
          "iam:GetRolePolicy",
          "iam:ListAttachedRolePolicies"
        ]
        Resource = [
          "arn:aws:iam::${local.account_id}:role/${var.deploy_role_name}",
          local.lambda_role_arn
        ]
      },

      # PassRole so the deployer can attach the Lambda exec role to functions it creates/updates
      {
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = local.lambda_role_arn
      },

      # API Gateway management (REST APIs, domains, mappings, deployments)
      {
        Effect = "Allow"
        Action = [
          "apigateway:GET",
          "apigateway:POST",
          "apigateway:PUT",
          "apigateway:PATCH",
          "apigateway:DELETE"
        ]
        Resource = [
          "arn:aws:apigateway:${var.aws_region}::/restapis*",
          "arn:aws:apigateway:${var.aws_region}::/domainnames*",
          "arn:aws:apigateway:${var.aws_region}::/basepathmappings*",
          "arn:aws:apigateway:${var.aws_region}::/deployments*"
        ]
      },

      # App S3 bucket (wsdl/html assets uploaded during deploy)
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = local.app_bucket_arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${local.app_bucket_arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:Get*",
          "s3:List*"
        ]
        Resource = local.app_bucket_arn
      },

      # Read-only access to the access token secret (used to set Lambda env ACCESS_TOKEN)
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetResourcePolicy"
        ]
        Resource = local.access_token_secret_arn_pattern
      },

      # CloudWatch Logs — full lifecycle for Lambda log groups.
      # PAY-303 added CreateLogGroup et al. to fix the failed deployment that
      # triggered this work — previously only Describe/ListTags were granted.
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:DeleteLogGroup",
          "logs:PutRetentionPolicy",
          "logs:TagResource",
          "logs:UntagResource",
          "logs:DescribeLogStreams"
        ]
        Resource = local.log_group_arn_pattern
      },

      # Account-level log-group describe (no resource-level scoping available)
      {
        Effect = "Allow"
        Action = [
          "logs:DescribeLogGroups",
          "logs:ListTagsForResource"
        ]
        Resource = "*"
      },

      # Terraform state backend (S3 with native locking via use_lockfile)
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          local.tf_state_bucket_arn,
          "${local.tf_state_bucket_arn}/*"
        ]
      }
    ]
  })
}
