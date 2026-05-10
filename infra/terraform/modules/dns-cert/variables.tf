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

variable "dns_zone_name" {
  description = "Name of the Cloud DNS managed zone (e.g. codelab303-io)"
  type        = string
  default     = "codelab303-io"
}

variable "dns_zone_domain" {
  description = "DNS domain for the managed zone (must end with .)"
  type        = string
  default     = "codelab303.io."
}

variable "hostname" {
  description = "Full hostname for the app (e.g. ledger.codelab303.io)"
  type        = string
  default     = "ledger.codelab303.io"
}
