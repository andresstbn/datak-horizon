#!/usr/bin/env bash
# Carga las versiones (valores) de los secretos de horizon en Secret Manager,
# leyéndolos de app.yaml. Los contenedores de secreto los crea Terraform; esto
# los rellena para no meter valores en el .tf ni en el state. Mismo patrón que
# core/infra/load_secrets.sh.
#
# Idempotente: sólo agrega una versión nueva si el valor cambió.
set -euo pipefail

PROJECT="${PROJECT:-datak-production}"
YAML="${YAML:-$(dirname "$0")/../app.yaml}"

MAP="
DATABASE_URL:horizon_db_url
NUXT_CONFLUENCE_API_TOKEN:horizon_confluence_api_token
NUXT_GITHUB_TOKEN:horizon_github_token
NUXT_SLACK_WEBHOOK_URL:horizon_slack_webhook_url
"

read_yaml() {
  line="$(grep -E "^[[:space:]]+$1:" "$YAML" | head -1)"
  RAWLINE="$line" python3 -c "import os;v=os.environ['RAWLINE'].split(':',1)[1].strip();print(v[1:-1] if len(v)>1 and v[0] in '\"'+chr(39) and v[-1]==v[0] else v)"
}

for pair in $MAP; do
  key="${pair%%:*}"
  secret="${pair##*:}"
  value="$(read_yaml "$key")"
  current="$(gcloud secrets versions access latest --secret="$secret" --project="$PROJECT" 2>/dev/null || true)"
  if [[ "$current" == "$value" ]]; then
    echo "= $secret (sin cambios)"
  else
    printf '%s' "$value" | gcloud secrets versions add "$secret" --data-file=- --project="$PROJECT" >/dev/null
    echo "+ $secret (versión nueva)"
  fi
done
