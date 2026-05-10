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

# Grant Cloud Storage service agent encrypt/decrypt
resource "google_kms_crypto_key_iam_member" "storage_agent" {
  crypto_key_id = google_kms_crypto_key.cmek.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:service-${data.google_project.project.number}@gs-project-accounts.iam.gserviceaccount.com"
}

# Grant Cloud SQL service agent encrypt/decrypt
resource "google_kms_crypto_key_iam_member" "cloudsql_agent" {
  crypto_key_id = google_kms_crypto_key.cmek.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-cloud-sql.iam.gserviceaccount.com"
}
