# Corte de `horizon` a Cloud Run

Mismo patrón que `datak-app`/`core`/`datak-contabilidad-clara`. Diferencias
relevantes acá:

- **Sin split dev/prod**: GAE solo tiene `app.yaml` (servicio `horizon`, sin
  `app-dev.yaml`). Un solo ambiente en Cloud Run también.
- **Tiene estado real**: Cloud SQL (`instance-db-main`, DB `datak_horizon`,
  compartida con `core` — ver memoria "Cloud SQL prod compartida y pequeña",
  1 vCPU repartida entre ~10 servicios) y secretos reales (`DATABASE_URL`,
  token de Confluence). Por eso usa Secret Manager + volumen `/cloudsql`,
  igual que `core`, no el patrón "todo env plano" de `app`/website.
- **SA reusada**: `horizon-sa@datak-production.iam.gserviceaccount.com` ya
  existe con `cloudsql.client` + `firebase.admin` aplicados a mano — Terraform
  NO crea una SA nueva, solo referencia el email.
- **`horizon.datak.co` es subdominio** (CNAME a `ghs.googlehosted.com.`, igual
  que `app`/`core`) → el corte de DNS es gratis, sin tocar GoDaddy.

## Pendiente antes de desplegar

```
cd infra
terraform init
# 1er apply: crea Artifact Registry + secretos (falla el servicio con
# image=placeholder, esperado — mismo bootstrap que datak-contabilidad-clara).
terraform apply
# Cargar los valores de los secretos (lee DATABASE_URL y
# NUXT_CONFLUENCE_API_TOKEN de app.yaml):
./load_secrets.sh
# Build + push manual de la primera imagen real, luego:
terraform apply -var="image=<tag real>"
```

Después de eso, `./deploy-cloudrun.sh` rota la imagen (requiere que el
servicio ya exista).

## Validación en `*.run.app` (antes de tocar dominio)

- [ ] `GET /` → 200.
- [ ] Login Firebase funciona.
- [ ] Una vista que pegue a Postgres (Cloud SQL vía `/cloudsql`) responde bien
      — confirma el volumen y el `cloudsql.client` de la SA reusada.
- [ ] Alguna acción que use el token de Confluence (si aplica) responde bien.
- [ ] El webhook de Slack dispara (si hay una acción que lo use).

## Runbook del corte

1. Anotar DNS actual de `horizon.datak.co` (CNAME → `ghs.googlehosted.com.`,
   no se toca).
2. `gcloud app domain-mappings delete horizon.datak.co --project=datak-production`
3. `terraform apply -var="image=<tag>" -var="enable_domain_mapping=true"`
4. Verificar cert (`gcloud beta run domain-mappings describe --domain=horizon.datak.co ...`,
   condiciones `Ready`/`CertificateProvisioned` en `True` — dado el corte de
   `datak.co` ya hecho, esto suele tardar 10-15 min, no siempre el rango
   completo de 15-60).
5. Smoke funcional en `https://horizon.datak.co`.

**Post-corte:**
- [ ] Quitar la regla `horizon.datak.co -> horizon` de `dispatch.yaml` (ya no
      aplica: el dominio no pasa por GAE).
- [ ] `gcloud app services delete horizon --project=datak-production` (a
      diferencia de `default`, `horizon` SÍ se puede borrar por completo,
      no es el servicio default).

**Rollback:** recrear el mapping en GAE
(`gcloud app domain-mappings create horizon.datak.co --project=datak-production`)
y `terraform apply -var="enable_domain_mapping=false"`.
