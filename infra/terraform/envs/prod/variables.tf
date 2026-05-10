variable "project_id" { type = string }
variable "region" { type = string; default = "us-central1" }
variable "env" { type = string }
variable "subnet_cidr" { type = string }
variable "pods_cidr" { type = string }
variable "services_cidr" { type = string }
variable "private_services_cidr" { type = string }
variable "master_cidr" { type = string }
variable "deletion_protection_gke" { type = bool; default = true }
variable "sql_tier" { type = string }
variable "pitr_enabled" { type = bool; default = true }
variable "deletion_protection_sql" { type = bool; default = true }
variable "k8s_namespace" { type = string }
variable "hostname" { type = string }
