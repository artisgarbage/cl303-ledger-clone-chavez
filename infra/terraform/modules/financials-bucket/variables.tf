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

variable "kms_key_id" {
  description = "Full ID of the CMEK key (google_kms_crypto_key.id)"
  type        = string
}

variable "reader_gsa_email" {
  description = "Email of the GSA that gets objectViewer on the bucket"
  type        = string
}
