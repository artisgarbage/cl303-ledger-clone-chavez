output "certificate_map_id" {
  description = "Used in GKE Gateway annotation gke.googleapis.com/google-managed-certs-map"
  value       = google_certificate_manager_certificate_map.app.id
}

output "dns_authorization_cname_name" {
  value = google_certificate_manager_dns_authorization.app.dns_resource_record[0].name
}

output "nameservers" {
  description = "Update your domain registrar to use these nameservers (prod only)"
  value       = var.env == "prod" ? google_dns_managed_zone.main[0].name_servers : []
}
