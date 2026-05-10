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

variable "network_self_link" {
  type = string
}

variable "kms_key_id" {
  description = "Full CMEK key ID for disk encryption"
  type        = string
}

variable "tier" {
  description = "Cloud SQL machine tier"
  type        = string
  # dev: db-g1-small, prod: db-custom-2-7680 or higher
}

variable "pitr_enabled" {
  description = "Enable point-in-time recovery (prod only)"
  type        = bool
  default     = false
}

variable "deletion_protection" {
  type    = bool
  default = true
}

variable "private_services_connection_id" {
  description = "ID of the google_service_networking_connection (depends_on)"
  type        = string
}
