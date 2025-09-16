#only create domain name if we have custom domain and cert arn (they are in locals)
resource "aws_api_gateway_domain_name" "custom" {
  count = local.custom_domain != "" && local.certificate_arn != "" ? 1 : 0

  domain_name     = local.custom_domain
  certificate_arn = local.certificate_arn

  endpoint_configuration {
    types = ["EDGE"]
  }

}

#if domain isn't created, mapping isn't created
resource "aws_api_gateway_base_path_mapping" "root" {
  count = local.custom_domain != "" && local.certificate_arn != "" ? 1 : 0

  api_id      = module.api_gateway.api_gateway_id
  stage_name  = var.api_gateway_stage_name
  domain_name = aws_api_gateway_domain_name.custom[0].domain_name
  base_path   = ""
}
