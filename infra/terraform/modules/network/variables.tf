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

variable "subnet_cidr" {
  type    = string
  default = "10.0.0.0/20"
}

variable "pods_cidr" {
  type    = string
  default = "10.100.0.0/16"
}

variable "services_cidr" {
  type    = string
  default = "10.101.0.0/20"
}

variable "private_services_cidr" {
  type    = string
  default = "10.200.0.0/16"
}
