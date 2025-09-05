output "soap_api_function_name" {
  description = "Name of the soap_api Lambda function"
  value       = aws_lambda_function.soap_api.function_name
}

output "soap_api_invoke_arn" {
  description = "Invoke ARN of the soap_api Lambda function"
  value       = aws_lambda_function.soap_api.invoke_arn
}

output "soap_resource_function_name" {
  description = "Name of the soap_resource Lambda function"
  value       = aws_lambda_function.soap_resource.function_name
}

output "soap_resource_invoke_arn" {
  description = "Invoke ARN of the soap_resource Lambda function"
  value       = aws_lambda_function.soap_resource.invoke_arn
}

output "pay_page_function_name" {
  description = "Name of the pay_page Lambda function"
  value       = aws_lambda_function.pay_page.function_name
}

output "pay_page_invoke_arn" {
  description = "Invoke ARN of the pay_page Lambda function"
  value       = aws_lambda_function.pay_page.invoke_arn
}