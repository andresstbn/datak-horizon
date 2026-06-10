#!/bin/bash
set -e

PROJECT_ID="datak-production"
INSTANCE_NAME="instance-db-main"
DB_NAME="datak_horizon"
DB_USER="horizon_app_user"
SA_NAME="horizon-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Asegurarse de que el gcloud CLI esté usando el proyecto correcto
gcloud config set project $PROJECT_ID

echo "🚀 Configurando recursos de GCP para datak-horizon en el proyecto $PROJECT_ID..."
echo "--------------------------------------------------------------------------------"

# 1. Crear Service Account
echo "👤 1/4 Creando Service Account: $SA_EMAIL"
if gcloud iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "   [i] El Service Account ya existe."
else
    gcloud iam service-accounts create $SA_NAME \
        --display-name="Service Account para Datak Horizon (App Engine)" \
        --project=$PROJECT_ID
    echo "   [✓] Service Account creado."
fi

# 2. Asignar roles al Service Account
echo "🔐 2/4 Asignando roles al Service Account..."
# Permisos para conectar a Cloud SQL
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/cloudsql.client" \
    --condition=None >/dev/null
# Permisos para Firebase Admin SDK (por ejemplo, para interactuar con Auth, opcional pero útil)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/firebase.admin" \
    --condition=None >/dev/null
echo "   [✓] Roles de cloudsql.client y firebase.admin asignados."

# 3. Crear base de datos en Cloud SQL
echo "🗄️ 3/4 Creando base de datos: $DB_NAME en la instancia $INSTANCE_NAME..."
if gcloud sql databases describe $DB_NAME --instance=$INSTANCE_NAME --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "   [i] La base de datos ya existe."
else
    gcloud sql databases create $DB_NAME \
        --instance=$INSTANCE_NAME \
        --project=$PROJECT_ID
    echo "   [✓] Base de datos creada."
fi

# 4. Crear usuario de base de datos
echo "👤 4/4 Creando/Actualizando usuario de base de datos: $DB_USER..."
# Generamos una contraseña segura de 20 caracteres
DB_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20)

if gcloud sql users list --instance=$INSTANCE_NAME --project=$PROJECT_ID | grep -q "$DB_USER"; then
    echo "   [i] El usuario ya existe. Actualizando su contraseña..."
    gcloud sql users set-password $DB_USER \
        --instance=$INSTANCE_NAME \
        --password="$DB_PASSWORD" \
        --project=$PROJECT_ID
    echo "   [✓] Contraseña actualizada."
else
    gcloud sql users create $DB_USER \
        --instance=$INSTANCE_NAME \
        --password="$DB_PASSWORD" \
        --project=$PROJECT_ID
    echo "   [✓] Usuario creado."
fi

echo "--------------------------------------------------------------------------------"
echo "✅ Configuración de GCP completada exitosamente!"
echo ""
echo "================================================================================"
echo "⚠️  ACCIÓN REQUERIDA: ACTUALIZA TU app.yaml"
echo "================================================================================"
echo "Guarda esta contraseña de base de datos de forma segura."
echo "La misma ha sido asignada al usuario $DB_USER en la instancia $INSTANCE_NAME."
echo ""
echo "🔑 Contraseña: $DB_PASSWORD"
echo ""
echo "Abre el archivo datak-horizon/app.yaml y asegúrate de actualizar la variable DATABASE_URL:"
echo "DATABASE_URL: \"postgresql://${DB_USER}:${DB_PASSWORD}@/datak_horizon?host=/cloudsql/${PROJECT_ID}:us-central1:${INSTANCE_NAME}\""
echo ""
echo "App Engine usará la cuenta de servicio (service_account):"
echo "$SA_EMAIL"
echo "================================================================================"
