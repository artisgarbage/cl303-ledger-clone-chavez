# Cloud DNS managed zone (created once, shared across envs via subdomains)
resource "google_dns_managed_zone" "main" {
  name        = var.dns_zone_name
  dns_name    = var.dns_zone_domain
  project     = var.project_id
  description = "codelab303 primary DNS zone"
  count       = var.env == "prod" ? 1 : 0 # create zone once from prod workspace

  dnssec_config {
    state = "on"
  }
}

# The actual A record is managed by the Gateway provisioner after the
# external IP is assigned. Terraform creates a placeholder record that
# CI updates once the load balancer IP is known.
#
# Operators: after first `helm install`, run:
#   kubectl get gateway ledger-gateway -n ledger-ENV -o jsonpath='{.status.addresses[0].value}'
# then update this resource or let external-dns manage it.
resource "google_dns_record_set" "app" {
  name         = "${var.hostname}."
  managed_zone = var.env == "prod" ? google_dns_managed_zone.main[0].name : var.dns_zone_name
  type         = "A"
  ttl          = 300
  project      = var.project_id

  # Placeholder — replaced by external-dns controller or manual update
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
  managed_zone = var.env == "prod" ? google_dns_managed_zone.main[0].name : var.dns_zone_name
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
