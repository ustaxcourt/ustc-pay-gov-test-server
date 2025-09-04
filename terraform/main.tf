provider "aws" {
  region = "us-west-2"
}

resource "aws_s3_bucket" "s3_bucket" {
  bucket = "ustc-pay-gov-test-server-dev"

  tags = {
    Environment = "Dev"
  }
}

