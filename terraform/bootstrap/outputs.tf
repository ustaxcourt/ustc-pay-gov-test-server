output "deployer_role_arn" {
  description = "ARN of the GitHub Actions deployer role. Inspection only — the app stack constructs this from naming convention rather than reading it from here."
  value       = aws_iam_role.github_actions_deployer.arn
}

output "deployer_role_name" {
  description = "Name of the GitHub Actions deployer role."
  value       = aws_iam_role.github_actions_deployer.name
}
