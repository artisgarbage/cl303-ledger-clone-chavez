project_id = "codelab303-ledger"
region     = "us-central1"
env        = "dev"

# Network
subnet_cidr           = "10.0.0.0/20"
pods_cidr             = "10.100.0.0/16"
services_cidr         = "10.101.0.0/20"
private_services_cidr = "10.200.0.0/16"
master_cidr           = "172.16.0.0/28"

# GKE
deletion_protection_gke = false # allow cluster teardown in dev

# Cloud SQL
sql_tier     = "db-custom-1-3840"
pitr_enabled = false
deletion_protection_sql = false

# App
k8s_namespace = "ledger-dev"
hostname      = "ledger-dev.codelab303.io"
