output "enabled_apis" {
  description = "Set of enabled API service names"
  value       = keys(google_project_service.apis)
}
