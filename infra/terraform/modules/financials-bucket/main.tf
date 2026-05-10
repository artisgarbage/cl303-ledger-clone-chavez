resource "google_storage_bucket" "financials" {
  name                        = "codelab303-ledger-financials-${var.env}"
  project                     = var.project_id
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  encryption {
    default_kms_key_name = var.kms_key_id
  }

  versioning {
    enabled = true
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      num_newer_versions = 10
      with_state         = "ARCHIVED"
    }
  }

  # Require a minimum retention on objects (30 days)
  retention_policy {
    retention_period = 2592000 # 30 days in seconds
  }

  logging {
    log_bucket        = google_storage_bucket.financials_logs.name
    log_object_prefix = "access/"
  }
}

# Separate bucket for access logs (no CMEK needed, no sensitive data)
resource "google_storage_bucket" "financials_logs" {
  name                        = "codelab303-ledger-financials-logs-${var.env}"
  project                     = var.project_id
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 365
    }
  }
}

# Only the designated reader GSA gets objectViewer — no project-level grants
resource "google_storage_bucket_iam_member" "reader" {
  bucket = google_storage_bucket.financials.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${var.reader_gsa_email}"
}

# The app GSA needs objectCreator to upload files to GCS (for the ingest flow)
resource "google_storage_bucket_iam_member" "creator" {
  bucket = google_storage_bucket.financials.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${var.reader_gsa_email}"
}

# Enable Data Access audit logs for this bucket
resource "google_project_iam_audit_config" "storage_data_access" {
  project = var.project_id
  service = "storage.googleapis.com"

  audit_log_config {
    log_type = "DATA_READ"
  }
  audit_log_config {
    log_type = "DATA_WRITE"
  }
}
