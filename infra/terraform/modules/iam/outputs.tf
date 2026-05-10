output "app_gsa_email" {
  value = google_service_account.app.email
}

output "financials_reader_gsa_email" {
  value = google_service_account.financials_reader.email
}

output "ci_gsa_email" {
  value = var.env == "prod" ? google_service_account.ci[0].email : null
}

output "wif_pool_name" {
  value = var.env == "prod" ? google_iam_workload_identity_pool.github[0].name : null
}

output "wif_provider_name" {
  value = var.env == "prod" ? google_iam_workload_identity_pool_provider.github[0].name : null
}
