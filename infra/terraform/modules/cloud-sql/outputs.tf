output "instance_name" {
  value = google_sql_database_instance.main.name
}

output "connection_name" {
  description = "Used as cloud-sql-proxy argument: PROJECT:REGION:INSTANCE"
  value       = google_sql_database_instance.main.connection_name
}

output "database_name" {
  value = google_sql_database.ledger.name
}

output "app_user" {
  value = google_sql_user.app.name
}

output "app_password" {
  value     = random_password.db_password.result
  sensitive = true
}

output "private_ip" {
  value = google_sql_database_instance.main.private_ip_address
}
