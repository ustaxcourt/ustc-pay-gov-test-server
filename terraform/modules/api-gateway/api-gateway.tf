# Data source for current AWS region
data "aws_region" "current" {}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-${var.environment}"
  description = "USTC Pay Gov Test Server API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = var.common_tags
}

# API Gateway Resources
resource "aws_api_gateway_resource" "wsdl" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "wsdl"
}

resource "aws_api_gateway_resource" "wsdl_filename" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.wsdl.id
  path_part   = "{filename}"
}

resource "aws_api_gateway_resource" "pay" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "pay"
}

# Methods and Integrations for soap_api (POST /wsdl)
resource "aws_api_gateway_method" "soap_api_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.wsdl.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "soap_api_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.wsdl.id
  http_method = aws_api_gateway_method.soap_api_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = var.soap_api_invoke_arn
}

# Methods and Integrations for soap_resource (GET /wsdl and GET /wsdl/{filename})
resource "aws_api_gateway_method" "soap_resource_get_wsdl" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.wsdl.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "soap_resource_get_wsdl" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.wsdl.id
  http_method = aws_api_gateway_method.soap_resource_get_wsdl.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = var.soap_resource_invoke_arn
}

resource "aws_api_gateway_method" "soap_resource_get_filename" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.wsdl_filename.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "soap_resource_get_filename" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.wsdl_filename.id
  http_method = aws_api_gateway_method.soap_resource_get_filename.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = var.soap_resource_invoke_arn
}

# Methods and Integrations for pay_page (GET /pay)
resource "aws_api_gateway_method" "pay_page_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.pay.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "pay_page_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.pay.id
  http_method = aws_api_gateway_method.pay_page_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = var.pay_page_invoke_arn
}

# Lambda permissions for API Gateway
resource "aws_lambda_permission" "soap_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.soap_api_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/${aws_api_gateway_stage.main.stage_name}/*/*"
}

resource "aws_lambda_permission" "soap_resource" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.soap_resource_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/${aws_api_gateway_stage.main.stage_name}/*/*"
}

resource "aws_lambda_permission" "pay_page" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.pay_page_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/${aws_api_gateway_stage.main.stage_name}/*/*"
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "main" {
  depends_on = [
    aws_api_gateway_method.soap_api_post,
    aws_api_gateway_integration.soap_api_post,
    aws_api_gateway_method.soap_resource_get_wsdl,
    aws_api_gateway_integration.soap_resource_get_wsdl,
    aws_api_gateway_method.soap_resource_get_filename,
    aws_api_gateway_integration.soap_resource_get_filename,
    aws_api_gateway_method.pay_page_get,
    aws_api_gateway_integration.pay_page_get,
  ]

  rest_api_id = aws_api_gateway_rest_api.main.id

  # Force new deployment when Lambda functions change
  triggers = {
    redeployment = sha256(jsonencode({
      methods = [
        aws_api_gateway_method.soap_api_post.id,
        aws_api_gateway_method.soap_resource_get_wsdl.id,
        aws_api_gateway_method.soap_resource_get_filename.id,
        aws_api_gateway_method.pay_page_get.id,
      ]
      integrations = [
        aws_api_gateway_integration.soap_api_post.id,
        aws_api_gateway_integration.soap_resource_get_wsdl.id,
        aws_api_gateway_integration.soap_resource_get_filename.id,
        aws_api_gateway_integration.pay_page_get.id,
      ]
      function_names = [
        var.soap_api_function_name,
        var.soap_resource_function_name,
        var.pay_page_function_name,
      ]
      stage = var.api_gateway_stage_name
    }))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Separate stage resource
resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.api_gateway_stage_name
}
