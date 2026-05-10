project_id = "codelab303-ledger"
region     = "us-central1"
env        = "prod"

# Network (different CIDR blocks from dev to avoid overlap)
subnet_cidr           = "10.10.0.0/20"
pods_cidr             = "10.110.0.0/16"
services_cidr         = "10.111.0.0/20"
private_services_cidr = "10.210.0.0/16"
master_cidr           = "172.17.0.0/28"

# GKE
deletion_protection_gke = true

# Cloud SQL
sql_tier                = "db-custom-2-7680"
pitr_enabled            = true
deletion_protection_sql = true

# App
k8s_namespace = "ledger-prod"
hostname      = "ledger.codelab303.io"
