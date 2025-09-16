locals {
  github_sub = "repo:${var.github_org}/${var.github_repo}:*"
}

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
          Federated = local.github_oidc_provider_arn
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
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "lambda:CreateFunction",
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:GetFunction",
          "lambda:ListVersionsByFunction",
          "lambda:TagResource",
          "lambda:UntagResource"
        ],
        Resource = "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${var.project_name}-${var.environment}-*"
      },

      # Allow Terraform to read IAM roles it references (self and lambda exec role)
      {
        Effect = "Allow",
        Action = [
          "iam:GetRole",
          "iam:ListRolePolicies",
          "iam:GetRolePolicy",
          "iam:ListAttachedRolePolicies"
        ],
        Resource = [
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.deploy_role_name}",
          aws_iam_role.lambda_execution_role.arn
        ]
      },

      #to allow OIDC role to attach lambda exec role to the resource it creates/updates
      {
        Effect   = "Allow",
        Action   = ["iam:PassRole"],
        Resource = aws_iam_role.lambda_execution_role.arn
      },

      # API Gateway management (scoped to REST APIs, domains, and mappings)
      {
        Effect = "Allow",
        Action = [
          "apigateway:GET",
          "apigateway:POST",
          "apigateway:PUT",
          "apigateway:PATCH",
          "apigateway:DELETE"
        ],
        Resource = [
          "arn:aws:apigateway:${var.aws_region}::/restapis*",
          "arn:aws:apigateway:${var.aws_region}::/domainnames*",
          "arn:aws:apigateway:${var.aws_region}::/basepathmappings*",
          "arn:aws:apigateway:${var.aws_region}::/deployments*"
        ]
      },

      # S3 access for application bucket (wsdl/html)
      {
        Effect   = "Allow",
        Action   = ["s3:ListBucket"],
        Resource = module.s3.bucket_arn
      },
      {
        Effect   = "Allow",
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        Resource = "${module.s3.bucket_arn}/*"
      },

      # Read-only access to the access token secret (used to set Lambda env ACCESS_TOKEN)
      {
        Effect = "Allow",
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetResourcePolicy"
        ],
        Resource = aws_secretsmanager_secret.access_token.arn
      },

      #Backend state access (s3 and dynamodb)
      {
        Effect = "Allow",
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
        Resource = [
          "arn:aws:s3:::${local.tf_state_bucket_name}",
          "arn:aws:s3:::${local.tf_state_bucket_name}/*"
        ]
      },
      {
        Effect = "Allow",
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ],
        Resource = "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${local.tf_lock_table_name}"
      },
      {
        Effect = "Allow",
        Action = [
            "logs:DescribeLogGroups",
            "logs:ListTagsForResource"
        ],
        Resource = "*"
      },
      {
        Effect = "Allow",
        Action = [
            "s3:GetBucketPolicy",
            "s3:GetBucketAcl"
        ],
        Resource = "arn:aws:s3:::${local.bucket_name}"           
        
      }
    ]
  })
}



