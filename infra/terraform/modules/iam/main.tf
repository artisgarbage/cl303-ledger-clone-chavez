# ---------------------------------------------------------------------------
# App runtime service account
# ---------------------------------------------------------------------------
resource "google_service_account" "app" {
  project      = var.project_id
  account_id   = "ledger-app-${var.env}"
  display_name = "Ledger App — ${var.env}"
}

resource "google_project_iam_member" "app_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.app.email}"
}

resource "google_project_iam_member" "app_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.app.email}"
}

resource "google_project_iam_member" "app_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.app.email}"
}

# ---------------------------------------------------------------------------
# Financials-reader service account (separate least-privilege GSA for GCS)
# ---------------------------------------------------------------------------
resource "google_service_account" "financials_reader" {
  project      = var.project_id
  account_id   = "ledger-financials-${var.env}"
  display_name = "Ledger Financials Reader — ${var.env}"
}

# ---------------------------------------------------------------------------
# CI/CD service account + Workload Identity Federation
# ---------------------------------------------------------------------------
resource "google_service_account" "ci" {
  project      = var.project_id
  account_id   = "ledger-ci"
  display_name = "Ledger CI/CD (GitHub Actions)"
  count        = var.env == "prod" ? 1 : 0 # create once at prod apply
}

# WIF Pool (created once, referenced by both envs)
resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
  count                     = var.env == "prod" ? 1 : 0
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github[0].workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  count                              = var.env == "prod" ? 1 : 0

  display_name = "GitHub Actions OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  # Only allow tokens from this exact repository
  attribute_condition = "attribute.repository == \"${var.github_repo}\""
}

resource "google_service_account_iam_member" "ci_wif" {
  service_account_id = google_service_account.ci[0].name
  role               = "roles/iam.workloadIdentityUser"
  count              = var.env == "prod" ? 1 : 0
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github[0].name}/attribute.repository/${var.github_repo}"
}

# CI needs to push images and deploy to both namespaces
resource "google_project_iam_member" "ci_ar_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.ci[0].email}"
  count   = var.env == "prod" ? 1 : 0
}

resource "google_project_iam_member" "ci_gke_developer" {
  project = var.project_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${google_service_account.ci[0].email}"
  count   = var.env == "prod" ? 1 : 0
}

# ---------------------------------------------------------------------------
# Workload Identity binding: KSA ledger-app in K8s namespace → app GSA
# ---------------------------------------------------------------------------
resource "google_service_account_iam_member" "workload_identity" {
  service_account_id = google_service_account.app.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${var.k8s_namespace}/ledger-app]"
}

# Same binding for the financials reader GSA
resource "google_service_account_iam_member" "financials_workload_identity" {
  service_account_id = google_service_account.financials_reader.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${var.k8s_namespace}/ledger-app]"
}
