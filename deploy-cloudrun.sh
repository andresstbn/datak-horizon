#!/bin/bash
# Deploy de horizon a Cloud Run + notificación a Slack.
# Uso: ./deploy-cloudrun.sh
#
# Convive con deploy.sh (GAE) hasta el corte de DNS — ver
# docs/refactor/cloud-run-horizon-cutover.md. Construye la imagen, la sube a
# Artifact Registry y actualiza el servicio Cloud Run. La infra del servicio
# (SA, Secret Manager, Cloud SQL, dominio) la maneja Terraform en infra/; este
# script SOLO rota la imagen.
set -euo pipefail

PROJECT="datak-production"
REGION="us-central1"
REPO="us-central1-docker.pkg.dev/${PROJECT}/horizon"
SERVICE="horizon"
COMPONENT_NAME="datak-horizon"
# Sin valor por defecto a propósito (push protection de GitHub bloquea un
# webhook hardcodeado, con razón). Toma la de Secret Manager si no viene ya
# en el entorno; sin ninguna de las dos, la notificación simplemente se salta.
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-$(gcloud secrets versions access latest --secret=horizon_slack_webhook_url --project=datak-production 2>/dev/null || true)}"

notify_slack() {  # $1 = start|success|failure
  [ -z "${SLACK_WEBHOOK_URL:-}" ] && return 0
  local branch text
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  case "$1" in
    start)   text="🚀 Iniciando despliegue de *${COMPONENT_NAME}* a Cloud Run\n• Rama: \`${branch}\`" ;;
    success) text="✅ Despliegue exitoso de *${COMPONENT_NAME}* (Cloud Run)\n• Rama: \`${branch}\`\n• URL: ${URL:-?}" ;;
    failure) text="❌ Falló el despliegue de *${COMPONENT_NAME}* a Cloud Run\n• Rama: \`${branch}\`" ;;
    *) return 0 ;;
  esac
  curl -s -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"${text}\"}" "${SLACK_WEBHOOK_URL}" >/dev/null || true
}

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "⚠️  Deploy a PROD (servicio Cloud Run '${SERVICE}', DB de producción)."
[ "$BRANCH" != "main" ] && echo "⚠️  No estás en main (rama: ${BRANCH})."
if [ -t 0 ]; then
  read -r -p "¿Continuar? (s/N): " r; [[ "$r" =~ ^[sS]$ ]] || { echo "Cancelado."; exit 0; }
fi

trap 'notify_slack failure' ERR

TAG="$(git rev-parse --short HEAD)"
if [ -n "$(git status --porcelain)" ]; then TAG="${TAG}-dirty"; fi
IMG="${REPO}/${SERVICE}:${TAG}"

notify_slack start

echo "🔨 Build ${IMG} locally..."
gcloud auth configure-docker us-central1-docker.pkg.dev --quiet >/dev/null 2>&1
docker build --platform linux/amd64 -t "$IMG" .

echo "📤 Push"
docker push "$IMG"

echo "🚀 Deploy a ${SERVICE}"
gcloud run services update "$SERVICE" \
  --image="$IMG" --region="$REGION" --project="$PROJECT" --quiet

URL="$(gcloud run services describe "$SERVICE" --region="$REGION" --project="$PROJECT" --format='value(status.url)')"
echo "✅ ${SERVICE} desplegado: ${URL}"
notify_slack success
