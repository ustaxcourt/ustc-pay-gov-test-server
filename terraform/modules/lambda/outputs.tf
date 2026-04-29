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

output "get_script_function_name" {
  description = "Name of the get_script Lambda function"
  value       = aws_lambda_function.get_script.function_name
}

output "get_script_invoke_arn" {
  description = "Invoke ARN of the get_script Lambda function"
  value       = aws_lambda_function.get_script.invoke_arn
}

output "mark_payment_status_function_name" {
  description = "Name of the mark_payment_status Lambda function"
  value       = aws_lambda_function.mark_payment_status.function_name
}

output "mark_payment_status_invoke_arn" {
  description = "Invoke ARN of the mark_payment_status Lambda function"
  value       = aws_lambda_function.mark_payment_status.invoke_arn
}
