variable "project_id" {
  type    = string
  default = "datak-production"
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "image" {
  type        = string
  description = "Imagen a desplegar, us-central1-docker.pkg.dev/datak-production/horizon/horizon:<tag>. Se pasa en cada apply del deploy."
  default     = "placeholder"
}

variable "custom_domain" {
  type    = string
  default = "horizon.datak.co"
}

variable "cloudsql_instance" {
  type    = string
  default = "datak-production:us-central1:instance-db-main"
}
