output "repository_id" {
  value = google_artifact_registry_repository.app.repository_id
}

output "registry_url" {
  description = "Base URL for image pushes: REGION-docker.pkg.dev/PROJECT/REPO"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${var.repository_id}"
}
