project_id = "codelab303-ledger"
region     = "us-central1"
env        = "dev"

# Network
subnet_cidr           = "10.0.0.0/20"
pods_cidr             = "10.100.0.0/16"
services_cidr         = "10.101.0.0/20"
private_services_cidr = "10.200.0.0/16"

# GKE (not used for Cloud Run deployment; kept for easy re-enable)
deletion_protection_gke = false

# Cloud SQL
sql_tier     = "db-custom-1-3840"
pitr_enabled = false
deletion_protection_sql = false
