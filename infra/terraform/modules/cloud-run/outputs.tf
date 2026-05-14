output "service_name" {
  value = google_cloud_run_v2_service.app.name
}

output "service_url" {
  value       = google_cloud_run_v2_service.app.uri
  description = "The *.run.app URL assigned to the service. Seed ledger-nextauth-url-<env> with this value."
}
