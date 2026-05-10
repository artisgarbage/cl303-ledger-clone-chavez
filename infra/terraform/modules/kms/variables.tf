variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "rotation_period" {
  description = "KMS key rotation period in seconds (default 90 days)"
  type        = string
  default     = "7776000s"
}
