# Cloud DNS managed zone — created by whoever applies first.
# Both dev and prod create their own zone lookup; the zone itself is created
# once (controlled by create_dns_zone var, default true).
resource "google_dns_managed_zone" "main" {
  count       = var.create_dns_zone ? 1 : 0
  name        = var.dns_zone_name
  dns_name    = var.dns_zone_domain
  project     = var.project_id
  description = "codelab303 primary DNS zone"

  dnssec_config {
    state = "on"
  }
}

locals {
  zone_name = var.create_dns_zone ? google_dns_managed_zone.main[0].name : var.dns_zone_name
}

# The actual A record is managed by the Gateway provisioner after the
# external IP is assigned. Terraform creates a placeholder record that
# CI updates once the load balancer IP is known.
resource "google_dns_record_set" "app" {
  name         = "${var.hostname}."
  managed_zone = local.zone_name
  type         = "A"
  ttl          = 300
  project      = var.project_id

  # Placeholder — replaced after first helm install
  rrdatas = ["0.0.0.0"]

  lifecycle {
    ignore_changes = [rrdatas]
  }
}

# Google Certificate Manager certificate (used by GKE Gateway)
resource "google_certificate_manager_certificate" "app" {
  name    = "ledger-cert-${var.env}"
  project = var.project_id
  scope   = "DEFAULT"

  managed {
    domains = [var.hostname]
    dns_authorizations = [
      google_certificate_manager_dns_authorization.app.id
    ]
  }
}

resource "google_certificate_manager_dns_authorization" "app" {
  name    = "ledger-dns-auth-${var.env}"
  project = var.project_id
  domain  = var.hostname
}

# Add the CNAME record that Certificate Manager requires for DNS auth
resource "google_dns_record_set" "cert_auth" {
  name         = google_certificate_manager_dns_authorization.app.dns_resource_record[0].name
  managed_zone = local.zone_name
  type         = google_certificate_manager_dns_authorization.app.dns_resource_record[0].type
  ttl          = 300
  project      = var.project_id
  rrdatas      = [google_certificate_manager_dns_authorization.app.dns_resource_record[0].data]
}

# Certificate map + entry (GKE Gateway references the map)
resource "google_certificate_manager_certificate_map" "app" {
  name    = "ledger-cert-map-${var.env}"
  project = var.project_id
}

resource "google_certificate_manager_certificate_map_entry" "app" {
  name         = "ledger-cert-entry-${var.env}"
  project      = var.project_id
  map          = google_certificate_manager_certificate_map.app.name
  certificates = [google_certificate_manager_certificate.app.id]
  hostname     = var.hostname
}
