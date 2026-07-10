terraform {
  required_version = ">= 1.7"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  backend "gcs" {
    bucket = "datak-production-tfstate"
    prefix = "horizon/prod"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
