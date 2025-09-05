# Custom domain configuration for API Gateway
# Note: Domain and certificate exist in different AWS account
# Skipping domain creation - will be managed externally

# resource "aws_api_gateway_domain_name" "main" {
#   count = var.certificate_arn != "" ? 1 : 0
#
#   domain_name              = var.custom_domain
#   regional_certificate_arn = var.certificate_arn
#
#   endpoint_configuration {
#     types = ["REGIONAL"]
#   }
#
#   tags = local.common_tags
# }

# Base path mapping to connect domain to API Gateway
# resource "aws_api_gateway_base_path_mapping" "main" {
#   count = var.certificate_arn != "" ? 1 : 0
#
#   api_id      = module.api_gateway.api_gateway_id
#   stage_name  = var.api_gateway_stage_name
#   domain_name = aws_api_gateway_domain_name.main[0].domain_name
# }

# Route53 record to point domain to API Gateway
# Commented out since domain is managed in different AWS account
# resource "aws_route53_record" "main" {
#   count = var.certificate_arn != "" && var.route53_zone_id != "" ? 1 : 0
#
#   zone_id = var.route53_zone_id
#   name    = var.custom_domain
#   type    = "A"
#
#   alias {
#     name                   = aws_api_gateway_domain_name.main[0].regional_domain_name
#     zone_id                = aws_api_gateway_domain_name.main[0].regional_zone_id
#     evaluate_target_health = false
#   }
# }

# Outputs for domain configuration
output "domain_configuration" {
  description = "Domain configuration information"
  value = {
    message         = "Domain managed externally in different AWS account"
    api_gateway_url = "https://${module.api_gateway.api_gateway_id}.execute-api.${var.aws_region}.amazonaws.com/${var.api_gateway_stage_name}"
  }
}