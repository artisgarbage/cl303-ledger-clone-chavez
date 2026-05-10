resource "google_container_cluster" "primary" {
  name     = "ledger-cluster-${var.env}"
  location = var.region
  project  = var.project_id

  enable_autopilot    = true
  deletion_protection = var.deletion_protection

  network    = var.network_id
  subnetwork = var.subnet_id

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false # allow kubectl from developer machines
    master_ipv4_cidr_block  = var.master_cidr
  }

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  release_channel {
    channel = "REGULAR"
  }

  # Enable Gateway API
  gateway_api_config {
    channel = "CHANNEL_STANDARD"
  }

  # Enable Secret Manager addon for Autopilot
  addons_config {
    gcs_fuse_csi_driver_config {
      enabled = true
    }
  }

  # Binary Authorization for supply chain security
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }

  # Shielded nodes for Autopilot are managed automatically
  # Daily 4h window — satisfies GKE requirement of ≥4h every ≤32 days
  maintenance_policy {
    recurring_window {
      start_time = "2025-01-01T04:00:00Z"
      end_time   = "2025-01-01T08:00:00Z"
      recurrence = "FREQ=DAILY"
    }
  }

  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }

  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS"]

    managed_prometheus {
      enabled = true
    }
  }
}

# Namespaces are created by `kubectl create namespace` in the CI deploy step
# or by Helm's --create-namespace flag. No Terraform resource needed.
