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
  description = "Kubernetes namespace the app runs in. Leave empty when deploying to Cloud Run."
  type        = string
  default     = ""
}

variable "gke_cluster_name" {
  description = "GKE cluster name. Leave empty when deploying to Cloud Run."
  type        = string
  default     = ""
}

variable "artifact_registry_url" {
  type = string
}
