variable "project_id" {
  type = string
}

variable "env" {
  type = string
}

# Secret names to create containers for (values populated out-of-band)
variable "secret_names" {
  description = "List of Secret Manager secret IDs to create"
  type        = list(string)
  default = [
    "ledger-database-url",
    "ledger-nextauth-secret",
    "ledger-nextauth-url",
    "ledger-anthropic-api-key",
    "ledger-cron-secret",
  ]
}

variable "accessor_gsa_email" {
  description = "GSA email that gets secretAccessor on all secrets"
  type        = string
}
