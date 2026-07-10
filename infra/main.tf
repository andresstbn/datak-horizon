# ---------------------------------------------------------------------------
# horizon — servicio Cloud Run `horizon` (dashboard interno, sin split dev/prod
# en GAE, así que tampoco aquí: un solo ambiente, igual que hoy).
#
# Reusa la SA existente `horizon-sa` (ya tiene cloudsql.client + firebase.admin
# aplicados manualmente) en vez de crear una nueva y adivinar el IAM.
# ---------------------------------------------------------------------------

locals {
  service_name    = "horizon"
  runtime_sa_email = "horizon-sa@${var.project_id}.iam.gserviceaccount.com"

  # Espeja env_variables de app.yaml, menos lo sensible (abajo, Secret Manager).
  plain_env = {
    ENV                            = "PRODUCTION"
    NUXT_PUBLIC_FIREBASE_API_KEY   = "AIzaSyC7ROaqdYOhTcMJ0Vk_Xy3z1i4mwJ_h6Rs"
    NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "datak-production.firebaseapp.com"
    NUXT_PUBLIC_FIREBASE_PROJECT_ID  = "datak-production"
    NUXT_PUBLIC_FIREBASE_APP_ID    = "1:585446102303:web:b8ed150ad157cd0c584c2a"
    NUXT_SITE_URL                  = "https://${var.custom_domain}"
    NUXT_CONFLUENCE_DOMAIN         = "datak.atlassian.net"
    NUXT_CONFLUENCE_EMAIL          = "daniel@datak.co"
  }

  # GitHub push protection bloqueó un intento anterior de dejar el webhook de
  # Slack en texto plano (SÍ es un secreto: cualquiera con la URL puede postear
  # en el canal) — a Secret Manager, no repetir el patrón de deploy.sh viejo.
  secret_env = {
    DATABASE_URL              = google_secret_manager_secret.db_url.secret_id
    NUXT_CONFLUENCE_API_TOKEN = google_secret_manager_secret.confluence_api_token.secret_id
    NUXT_SLACK_WEBHOOK_URL    = google_secret_manager_secret.slack_webhook_url.secret_id
  }
}

# ---------------------------------------------------------------------------
# Artifact Registry
# ---------------------------------------------------------------------------
resource "google_artifact_registry_repository" "horizon" {
  repository_id = "horizon"
  location      = var.region
  format        = "DOCKER"
  description   = "Imágenes de horizon (Cloud Run)"
}

# ---------------------------------------------------------------------------
# Secret Manager — contenedores; las versiones (valores) se cargan fuera de
# Terraform con infra/load_secrets.sh, igual que core.
# ---------------------------------------------------------------------------
resource "google_secret_manager_secret" "db_url" {
  secret_id = "horizon_db_url"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "confluence_api_token" {
  secret_id = "horizon_confluence_api_token"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "slack_webhook_url" {
  secret_id = "horizon_slack_webhook_url"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_iam_member" "run_accessor" {
  for_each = toset([
    google_secret_manager_secret.db_url.secret_id,
    google_secret_manager_secret.slack_webhook_url.secret_id,
    google_secret_manager_secret.confluence_api_token.secret_id,
  ])
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.runtime_sa_email}"
}

# ---------------------------------------------------------------------------
# Cloud Run service
# ---------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "horizon" {
  name                = local.service_name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account                  = local.runtime_sa_email
    max_instance_request_concurrency = 80

    scaling {
      min_instance_count = 0
      max_instance_count = 5 # mismo techo que automatic_scaling.max_instances en app.yaml
    }

    containers {
      image = var.image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      dynamic "env" {
        for_each = local.plain_env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = local.secret_env
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.cloudsql_instance]
      }
    }
  }

  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }

  depends_on = [google_secret_manager_secret_iam_member.run_accessor]
}

# Interno, no público: hoy GAE lo sirve con `secure: always` pero sin IAP;
# el acceso real lo controla Firebase Auth a nivel app. Mismo criterio: allUsers.
resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.horizon.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ---------------------------------------------------------------------------
# Domain mapping — SOLO en la ventana de corte.
# ---------------------------------------------------------------------------
variable "enable_domain_mapping" {
  type    = bool
  default = false
}

resource "google_cloud_run_domain_mapping" "horizon" {
  count    = var.enable_domain_mapping ? 1 : 0
  name     = var.custom_domain
  location = var.region

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.horizon.name
  }
}

output "service_uri" {
  value = google_cloud_run_v2_service.horizon.uri
}

output "run_service_account" {
  value = local.runtime_sa_email
}
