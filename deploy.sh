#!/bin/bash

# Script de deploy para App Engine (datak-horizon)
# Uso: ./deploy.sh

set -e  # Salir si hay algún error

# Verificar el estado de Git antes de desplegar
check_git_status() {
    local has_warnings=false
    
    # 1. Check if we are on the 'main' branch
    local current_branch
    current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    if [ "$current_branch" != "main" ]; then
        printf "\033[1;33m⚠️  ADVERTENCIA: No estás en la rama 'main'. Rama actual: %s\033[0m\n" "$current_branch"
        has_warnings=true
    fi

    # 2. Check if local branch is behind remote
    local upstream
    upstream=$(git rev-parse --abbrev-ref @{u} 2>/dev/null || echo "")
    if [ -n "$upstream" ]; then
        local remote_name
        local remote_branch
        remote_name=$(echo "$upstream" | cut -d'/' -f1)
        remote_branch=$(echo "$upstream" | cut -d'/' -f2-)
        
        echo "🔍 Verificando cambios en el repositorio remoto ($upstream)..."
        if git fetch "$remote_name" "$remote_branch" --quiet 2>/dev/null; then
            local local_commit
            local remote_commit
            local_commit=$(git rev-parse HEAD 2>/dev/null || echo "")
            remote_commit=$(git rev-parse @{u} 2>/dev/null || echo "")
            
            if [ -n "$local_commit" ] && [ -n "$remote_commit" ] && [ "$local_commit" != "$remote_commit" ]; then
                local behind_commits
                behind_commits=$(git log HEAD..@{u} --oneline 2>/dev/null | wc -l || echo "0")
                behind_commits=$(echo "$behind_commits" | tr -d ' ')
                if [ "$behind_commits" -gt 0 ] 2>/dev/null; then
                    printf "\033[1;33m⚠️  ADVERTENCIA: Tu rama local está desactualizada por %s commit(s) respecto a %s.\033[0m\n" "$behind_commits" "$upstream"
                    echo "    Se recomienda ejecutar 'git pull' antes de desplegar."
                    has_warnings=true
                fi
            fi
        fi
    else
        printf "\033[1;33m⚠️  ADVERTENCIA: La rama actual '%s' no tiene una rama remota de seguimiento configurada.\033[0m\n" "$current_branch"
        has_warnings=true
    fi

    if [ "$has_warnings" = true ]; then
        echo ""
        if [ -t 0 ]; then
            read -p "¿Deseas continuar con el deploy de todas formas? (s/N): " response
            if [[ ! "$response" =~ ^[sS]$ ]]; then
                echo "❌ Deploy cancelado por el usuario."
                exit 1
            fi
        else
            echo "⚠️  Continuando deploy en modo no interactivo a pesar de las advertencias."
        fi
        echo ""
    fi
}

check_git_status

echo "🚀 Iniciando deploy para entorno de producción (horizon)"

echo "📦 Ejecutando build..."
pnpm run build

if [ $? -ne 0 ]; then
    echo "❌ Error en el build. Abortando deploy."
    exit 1
fi

echo "✅ Build completado exitosamente"

echo "📤 Desplegando en App Engine con app.yaml..."
gcloud app deploy app.yaml --quiet

if [ $? -eq 0 ]; then
    echo "🎉 Deploy completado exitosamente"
else
    echo "❌ Error en el deploy"
    exit 1
fi
