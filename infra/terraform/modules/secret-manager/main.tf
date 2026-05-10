# Create secret containers — values are populated out-of-band by the operator.
# Do NOT set a secret_data value here; that would embed plaintext in TF state.
resource "google_secret_manager_secret" "secrets" {
  for_each  = toset([for s in var.secret_names : "${s}-${var.env}"])
  project   = var.project_id
  secret_id = each.key

  replication {
    auto {}
  }

  labels = {
    env       = var.env
    managed   = "terraform"
    app       = "ledger"
  }
}

# Grant the app GSA accessor rights on every secret
resource "google_secret_manager_secret_iam_member" "accessor" {
  for_each  = google_secret_manager_secret.secrets
  project   = var.project_id
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.accessor_gsa_email}"
}
