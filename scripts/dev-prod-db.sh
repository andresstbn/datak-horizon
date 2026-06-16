#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env.production"
INSTANCE="datak-production:us-central1:instance-db-main"
PROXY_PORT=5434

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Falta $ENV_FILE — pídelo al equipo o sácalo del vault."
  exit 1
fi

if [ ! -x "./cloud-sql-proxy" ]; then
  echo "❌ No se encuentra ./cloud-sql-proxy ejecutable."
  exit 1
fi

if lsof -ti :"$PROXY_PORT" &>/dev/null; then
  echo "❌ Puerto $PROXY_PORT ocupado. Libéralo con: kill \$(lsof -ti :$PROXY_PORT)"
  exit 1
fi

echo "🔌 Iniciando Cloud SQL Proxy → $INSTANCE en puerto $PROXY_PORT..."
./cloud-sql-proxy "$INSTANCE" --port "$PROXY_PORT" &
PROXY_PID=$!
trap 'echo ""; echo "🛑 Deteniendo proxy..."; kill $PROXY_PID 2>/dev/null; wait $PROXY_PID 2>/dev/null || true' EXIT INT TERM

# Esperar a que el proxy levante (máx 10s)
echo "⏳ Esperando que el proxy esté listo..."
for i in $(seq 1 10); do
  lsof -ti :"$PROXY_PORT" &>/dev/null && break
  kill -0 "$PROXY_PID" 2>/dev/null || { echo "❌ El proxy murió. Revisa: gcloud auth application-default login"; exit 1; }
  sleep 1
done

lsof -ti :"$PROXY_PORT" &>/dev/null || { echo "❌ El proxy no levantó en 10 segundos."; exit 1; }
echo "✅ Proxy listo"

echo "🚀 Arrancando Nuxt apuntando a DB de producción..."
set -a; source "$ENV_FILE"; set +a
pnpm nuxt dev
