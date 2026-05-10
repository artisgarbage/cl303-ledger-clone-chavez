output "network_id" {
  value = google_compute_network.vpc.id
}

output "network_self_link" {
  value = google_compute_network.vpc.self_link
}

output "subnet_id" {
  value = google_compute_subnetwork.main.id
}

output "subnet_self_link" {
  value = google_compute_subnetwork.main.self_link
}

output "private_services_connection" {
  value = google_service_networking_connection.private_vpc.id
}
