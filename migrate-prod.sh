#!/bin/bash

# Script para migrar la base de datos de PRODUCCIÓN (Cloud SQL), sin seeds.
# Uso: ./migrate-prod.sh
#
# Qué hace:
#   1. Lee la DATABASE_URL de producción desde app.yaml (no hardcodea secretos).
#   2. Baja el Postgres local de Docker si está ocupando el puerto 5432.
#   3. Levanta el Cloud SQL Auth Proxy y espera a que escuche.
#   4. Corre las migraciones de drizzle (pnpm db:migrate) contra Cloud SQL.
#   5. Apaga el proxy al terminar (pase lo que pase) y reporta el resultado.
#
# Lección aprendida: si el Postgres de Docker local está arriba, ocupa el 5432
# y el proxy no puede bindearlo -> las migraciones golpean la DB LOCAL por error.
# Por eso este script baja Docker antes de arrancar el proxy.

set -euo pipefail

INSTANCE_CONNECTION="datak-production:us-central1:instance-db-main"
PROXY_BIN="./cloud-sql-proxy"
LOCAL_PORT=5432
APP_YAML="app.yaml"

red()    { printf "\033[1;31m%s\033[0m\n" "$1"; }
green()  { printf "\033[1;32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[1;33m%s\033[0m\n" "$1"; }

# --- 1. Extraer la DATABASE_URL de producción desde app.yaml ----------------
if [ ! -f "$APP_YAML" ]; then
    red "❌ No se encontró $APP_YAML en el directorio actual."
    exit 1
fi

PROD_URL=$(grep -E '^\s*DATABASE_URL:' "$APP_YAML" | head -1 | sed -E 's/^[^"]*"//; s/"\s*$//')
if [ -z "$PROD_URL" ]; then
    red "❌ No se pudo leer DATABASE_URL desde $APP_YAML."
    exit 1
fi

# La URL de prod usa el socket Unix (%2Fcloudsql%2F...). La convertimos a la
# forma TCP localhost que entiende el proxy:
#   postgresql://user:pass@%2Fcloudsql%2F<conn>/db  ->  postgresql://user:pass@localhost:5432/db
USER_PASS=$(echo "$PROD_URL" | sed -E 's#^postgresql://([^@]+)@.*#\1#')
DB_NAME=$(echo "$PROD_URL" | sed -E 's#.*/([^/]+)$#\1#')
LOCAL_URL="postgresql://${USER_PASS}@localhost:${LOCAL_PORT}/${DB_NAME}"

yellow "🎯 Migrando base de datos: ${DB_NAME} (Cloud SQL: ${INSTANCE_CONNECTION})"

# --- 2. Liberar el puerto 5432 si Docker lo tiene ocupado -------------------
if lsof -nP -iTCP:${LOCAL_PORT} -sTCP:LISTEN >/dev/null 2>&1; then
    yellow "⚠️  Algo escucha en el puerto ${LOCAL_PORT}. Bajando Postgres local de Docker..."
    pnpm db:down >/dev/null 2>&1 || true
    sleep 1
    if lsof -nP -iTCP:${LOCAL_PORT} -sTCP:LISTEN >/dev/null 2>&1; then
        red "❌ El puerto ${LOCAL_PORT} sigue ocupado por otro proceso. Libéralo y reintenta."
        lsof -nP -iTCP:${LOCAL_PORT} -sTCP:LISTEN
        exit 1
    fi
fi

# --- 3. Levantar el proxy ---------------------------------------------------
if [ ! -x "$PROXY_BIN" ]; then
    red "❌ No se encontró el binario del proxy en $PROXY_BIN."
    exit 1
fi

yellow "🔌 Levantando Cloud SQL Auth Proxy..."
"$PROXY_BIN" "$INSTANCE_CONNECTION" >/tmp/cloud-sql-proxy.log 2>&1 &
PROXY_PID=$!

# Asegurar que el proxy se apague al salir, sea éxito o error.
cleanup() {
    if kill -0 "$PROXY_PID" 2>/dev/null; then
        yellow "🛑 Apagando el proxy (PID ${PROXY_PID})..."
        kill "$PROXY_PID" 2>/dev/null || true
        wait "$PROXY_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT

# Esperar hasta 15s a que el proxy esté escuchando.
for i in $(seq 1 30); do
    if grep -q "ready for new connections" /tmp/cloud-sql-proxy.log 2>/dev/null; then
        break
    fi
    if ! kill -0 "$PROXY_PID" 2>/dev/null; then
        red "❌ El proxy murió al arrancar. Log:"
        cat /tmp/cloud-sql-proxy.log
        exit 1
    fi
    sleep 0.5
done

if ! grep -q "ready for new connections" /tmp/cloud-sql-proxy.log 2>/dev/null; then
    red "❌ El proxy no quedó listo a tiempo. Log:"
    cat /tmp/cloud-sql-proxy.log
    exit 1
fi
green "✅ Proxy escuchando en 127.0.0.1:${LOCAL_PORT}"

# --- 4. Correr las migraciones (sin seeds) ----------------------------------
yellow "📦 Migrando... (pnpm db:migrate)"
if DATABASE_URL="$LOCAL_URL" pnpm db:migrate; then
    green "🎉 Migraciones aplicadas exitosamente contra producción."
else
    red "❌ Falló la migración. Revisa el error de arriba."
    exit 1
fi
