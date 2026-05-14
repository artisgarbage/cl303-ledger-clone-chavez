provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

module "project_services" {
  source     = "../../modules/project-services"
  project_id = var.project_id
}

module "kms" {
  source     = "../../modules/kms"
  project_id = var.project_id
  region     = var.region

  depends_on = [module.project_services]
}

# Network is kept because Cloud SQL is private-IP only and Cloud Run
# accesses it via Direct VPC Egress through this subnet.
module "network" {
  source                = "../../modules/network"
  project_id            = var.project_id
  region                = var.region
  env                   = var.env
  subnet_cidr           = var.subnet_cidr
  pods_cidr             = var.pods_cidr
  services_cidr         = var.services_cidr
  private_services_cidr = var.private_services_cidr

  depends_on = [module.project_services]
}

module "iam" {
  source                = "../../modules/iam"
  project_id            = var.project_id
  region                = var.region
  env                   = var.env
  # k8s_namespace / gke_cluster_name omitted — Cloud Run deployment, no GKE
  artifact_registry_url = module.artifact_registry.registry_url

  depends_on = [module.project_services]
}

module "cloud_sql" {
  source                         = "../../modules/cloud-sql"
  project_id                     = var.project_id
  region                         = var.region
  env                            = var.env
  network_self_link              = module.network.network_self_link
  kms_key_id                     = module.kms.cmek_key_id
  tier                           = var.sql_tier
  pitr_enabled                   = var.pitr_enabled
  deletion_protection            = var.deletion_protection_sql
  private_services_connection_id = module.network.private_services_connection

  depends_on = [module.network, module.kms, module.project_services]
}

module "artifact_registry" {
  source     = "../../modules/artifact-registry"
  project_id = var.project_id
  region     = var.region

  depends_on = [module.project_services]
}

module "secret_manager" {
  source             = "../../modules/secret-manager"
  project_id         = var.project_id
  env                = var.env
  accessor_gsa_email = module.iam.app_gsa_email

  depends_on = [module.project_services, module.iam]
}

module "financials_bucket" {
  source           = "../../modules/financials-bucket"
  project_id       = var.project_id
  region           = var.region
  env              = var.env
  kms_key_id       = module.kms.cmek_key_id
  reader_gsa_email = module.iam.financials_reader_gsa_email

  depends_on = [module.kms, module.iam, module.project_services]
}

module "audit_logging" {
  source     = "../../modules/audit-logging"
  project_id = var.project_id

  depends_on = [module.project_services]
}

# ---------------------------------------------------------------------------
# Cloud Run service (replaces GKE + Gateway + Certificate Manager + Cloud DNS)
# The *.run.app URL is available immediately — no DNS updates required.
# ---------------------------------------------------------------------------
module "cloud_run" {
  source                    = "../../modules/cloud-run"
  project_id                = var.project_id
  region                    = var.region
  env                       = var.env
  # Placeholder image — CI updates this via `gcloud run services update --image`
  image                     = "us-docker.pkg.dev/cloudrun/container/hello"
  service_account_email     = module.iam.app_gsa_email
  cloud_sql_connection_name = module.cloud_sql.connection_name
  subnet_id                 = module.network.subnet_id

  depends_on = [module.iam, module.cloud_sql, module.network, module.secret_manager]
}

# ---------------------------------------------------------------------------
# Outputs used by CI / bootstrap
# ---------------------------------------------------------------------------
output "service_url" {
  value       = module.cloud_run.service_url
  description = "Cloud Run *.run.app URL. Seed ledger-nextauth-url-dev with this value."
}

output "sql_connection_name" {
  value = module.cloud_sql.connection_name
}

output "registry_url" {
  value = module.artifact_registry.registry_url
}

output "financials_bucket" {
  value = module.financials_bucket.bucket_name
}

output "app_gsa_email" {
  value = module.iam.app_gsa_email
}

output "db_password" {
  value     = module.cloud_sql.app_password
  sensitive = true
}

output "db_user" {
  value = module.cloud_sql.app_user
}

output "db_name" {
  value = module.cloud_sql.database_name
}
