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
  k8s_namespace         = var.k8s_namespace
  gke_cluster_name      = module.gke.cluster_name
  artifact_registry_url = module.artifact_registry.registry_url

  # WI pool (PROJECT.svc.id.goog) only exists after GKE cluster is created
  depends_on = [module.project_services, module.gke]
}

module "gke" {
  source              = "../../modules/gke"
  project_id          = var.project_id
  region              = var.region
  env                 = var.env
  network_id          = module.network.network_id
  subnet_id           = module.network.subnet_id
  master_cidr         = var.master_cidr
  deletion_protection = var.deletion_protection_gke

  depends_on = [module.network, module.project_services]
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

module "dns_cert" {
  source          = "../../modules/dns-cert"
  project_id      = var.project_id
  region          = var.region
  env             = var.env
  hostname        = var.hostname
  create_dns_zone = true  # zone doesn't exist yet; create it here

  depends_on = [module.project_services]
}

# ---------------------------------------------------------------------------
# Outputs used by CI / bootstrap
# ---------------------------------------------------------------------------
output "cluster_name" {
  value = module.gke.cluster_name
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
