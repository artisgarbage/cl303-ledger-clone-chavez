data "google_project" "project" {
  project_id = var.project_id
}

resource "google_kms_key_ring" "main" {
  name     = "ledger-keyring"
  location = var.region
  project  = var.project_id
}

resource "google_kms_crypto_key" "cmek" {
  name            = "ledger-cmek"
  key_ring        = google_kms_key_ring.main.id
  rotation_period = var.rotation_period
  purpose         = "ENCRYPT_DECRYPT"

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "SOFTWARE"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Explicitly create the service identities so their SA emails exist before we
# grant them KMS access. GCP creates these lazily; Terraform must force it.
resource "google_project_service_identity" "storage_sa" {
  provider = google-beta
  project  = var.project_id
  service  = "storage.googleapis.com"
}

resource "google_project_service_identity" "cloudsql_sa" {
  provider = google-beta
  project  = var.project_id
  service  = "sqladmin.googleapis.com"
}

# Grant Cloud Storage service agent encrypt/decrypt.
# The storage service identity doesn't expose .email (null), so we use the
# well-known format after ensuring the SA is initialized via service_identity.
resource "google_kms_crypto_key_iam_member" "storage_agent" {
  crypto_key_id = google_kms_crypto_key.cmek.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:service-${data.google_project.project.number}@gs-project-accounts.iam.gserviceaccount.com"

  depends_on = [google_project_service_identity.storage_sa]
}

# Grant Cloud SQL service agent encrypt/decrypt
resource "google_kms_crypto_key_iam_member" "cloudsql_agent" {
  crypto_key_id = google_kms_crypto_key.cmek.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${google_project_service_identity.cloudsql_sa.email}"

  depends_on = [google_project_service_identity.cloudsql_sa]
}
