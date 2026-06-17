#!/bin/bash
# Delegar al script de migraciones de producción unificado
exec bash scripts/migrate-prod-db.sh "$@"
