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

variable "github_repo" {
  description = "GitHub repo in org/repo format"
  type        = string
  default     = "artisgarbage/cl303-ledger-clone-chavez"
}

variable "k8s_namespace" {
  description = "Kubernetes namespace the app runs in"
  type        = string
}

variable "gke_cluster_name" {
  type = string
}

variable "artifact_registry_url" {
  type = string
}
