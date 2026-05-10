resource "google_sql_database_instance" "main" {
  name                = "ledger-postgres-${var.env}"
  project             = var.project_id
  database_version    = "POSTGRES_16"
  region              = var.region
  deletion_protection = var.deletion_protection

  encryption_key_name = var.kms_key_id

  settings {
    tier              = var.tier
    availability_type = var.env == "prod" ? "REGIONAL" : "ZONAL"

    disk_autoresize       = true
    disk_autoresize_limit = 100
    disk_size             = 20
    disk_type             = "PD_SSD"

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = var.network_self_link
      enable_private_path_for_google_cloud_services = true
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = var.pitr_enabled
      start_time                     = "03:00"
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 14
        retention_unit   = "COUNT"
      }
    }

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }

    database_flags {
      name  = "log_disconnections"
      value = "on"
    }

    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 1024
      record_application_tags = false
      record_client_address   = false
    }
  }

  depends_on = [var.private_services_connection_id]
}

resource "google_sql_database" "ledger" {
  name     = "ledger_${var.env}"
  instance = google_sql_database_instance.main.name
  project  = var.project_id
}

# Password-based user for the application (stored in Secret Manager)
resource "google_sql_user" "app" {
  name     = "ledger_app_${var.env}"
  instance = google_sql_database_instance.main.name
  project  = var.project_id
  password = random_password.db_password.result
}

resource "random_password" "db_password" {
  length  = 32
  special = false
}
