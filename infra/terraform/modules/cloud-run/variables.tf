variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "env" {
  type = string
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "margot-app"
}

variable "image" {
  description = "Full image URI with tag"
  type        = string
}

variable "service_account_email" {
  description = "GSA email the Cloud Run service runs as"
  type        = string
}

variable "cloud_sql_connection_name" {
  description = "Cloud SQL instance connection name (PROJECT:REGION:INSTANCE)"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID for Direct VPC Egress (needed to reach private-IP Cloud SQL)"
  type        = string
}

variable "min_instances" {
  description = "Minimum number of instances (0 = scale to zero)"
  type        = number
  default     = 0
}

variable "max_instances" {
  type    = number
  default = 3
}

variable "cpu" {
  type    = string
  default = "1000m"
}

variable "memory" {
  type    = string
  default = "1Gi"
}
