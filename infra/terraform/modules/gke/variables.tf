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

variable "network_id" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "master_cidr" {
  description = "CIDR for GKE control plane (must not overlap subnet/pod/service ranges)"
  type        = string
  default     = "172.16.0.0/28"
}

variable "deletion_protection" {
  description = "Prevent accidental cluster deletion"
  type        = bool
  default     = true
}
