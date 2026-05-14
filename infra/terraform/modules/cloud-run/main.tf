# ---------------------------------------------------------------------------
# Cloud Run v2 service
# ---------------------------------------------------------------------------
# The image tag is managed by CI (gcloud run services update --image=...).
# Terraform owns everything except the image tag — see lifecycle ignore_changes.
# ---------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "app" {
  name     = "${var.service_name}-${var.env}"
  location = var.region
  project  = var.project_id

  # Accept traffic from the public internet
  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = var.service_account_email

    # Direct VPC Egress: required to reach private-IP Cloud SQL
    vpc_access {
      network_interfaces {
        subnetwork = var.subnet_id
      }
      egress = "PRIVATE_RANGES_ONLY"
    }

    # Built-in Cloud SQL Auth Proxy — creates a unix socket at
    # /cloudsql/<connection-name> inside the container. Works with
    # private-IP-only instances via IAM-authenticated Cloud SQL API.
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.cloud_sql_connection_name]
      }
    }

    containers {
      image = var.image

      ports {
        container_port = 3000
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      # ── Non-secret env vars ──────────────────────────────────────────────
      env { name = "NODE_ENV";               value = "production" }
      env { name = "NEXT_TELEMETRY_DISABLED"; value = "1" }
      env { name = "PORT";                   value = "3000" }

      # ── Secrets from Secret Manager ──────────────────────────────────────
      # The app GSA is granted secretmanager.secretAccessor by the
      # secret-manager module, so these refs will resolve at start time.
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = "ledger-database-url-${var.env}"
            version = "latest"
          }
        }
      }

      env {
        name = "NEXTAUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = "ledger-nextauth-secret-${var.env}"
            version = "latest"
          }
        }
      }

      # NEXTAUTH_URL must be seeded with the Cloud Run service URL after the
      # first deploy (chicken-and-egg). NextAuth v5 will auto-detect from the
      # request on first run; populate the secret once the URL is known:
      #   gcloud run services describe margot-app-dev --format='value(status.url)'
      #   gcloud secrets versions add ledger-nextauth-url-dev --data-file=<(echo "$URL")
      env {
        name = "NEXTAUTH_URL"
        value_source {
          secret_key_ref {
            secret  = "ledger-nextauth-url-${var.env}"
            version = "latest"
          }
        }
      }

      env {
        name = "ANTHROPIC_API_KEY"
        value_source {
          secret_key_ref {
            secret  = "ledger-anthropic-api-key-${var.env}"
            version = "latest"
          }
        }
      }

      env {
        name = "CRON_SECRET"
        value_source {
          secret_key_ref {
            secret  = "ledger-cron-secret-${var.env}"
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
        # Allow CPU to throttle when idle (required for scale-to-zero)
        cpu_idle = true
      }

      # Startup probe: gives the Next.js cold-start enough time to compile
      startup_probe {
        http_get {
          path = "/api/healthz"
          port = 3000
        }
        initial_delay_seconds = 10
        period_seconds        = 5
        failure_threshold     = 12 # 60 s total budget
        timeout_seconds       = 5
      }

      liveness_probe {
        http_get {
          path = "/api/healthz"
          port = 3000
        }
        initial_delay_seconds = 0
        period_seconds        = 30
        failure_threshold     = 3
        timeout_seconds       = 5
      }
    }

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }
  }

  # CI owns the image tag; prevent Terraform from overwriting it on every apply.
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
  }
}

# ---------------------------------------------------------------------------
# Allow unauthenticated public access (marketing site + auth is app-level)
# ---------------------------------------------------------------------------
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
