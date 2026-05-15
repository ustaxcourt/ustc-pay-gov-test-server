locals {
  environment              = "dev"
  custom_domain            = "pay-gov-dev.ustaxcourt.gov"
  access_token_secret_name = "ustc/pay-gov/dev/access-token"
  certificate_arn          = "arn:aws:acm:us-east-1:803663093283:certificate/bbe4dc79-cb7e-4c5a-9125-dc89995a82f0"

  # Derived locals used across modules
  common_tags = {
    Project     = var.project_name
    Environment = local.environment
    ManagedBy   = "terraform"
  }

  bucket_name = "${local.environment}-${var.project_name}"
}


