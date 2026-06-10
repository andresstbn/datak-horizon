# Datak Horizon

Plataforma interna de Datak: la **fuente única de verdad** para las iniciativas
de producto e ingeniería. Centraliza necesidades, especificaciones vivas,
decisiones (ADR), planificación y entrega.

> **Estado Actual**: Esta versión cuenta con el primer núcleo funcional (MVP) de refinamiento colaborativo y preparación para IA completamente operativo. Consulta la carpeta [docs/](file:///Users/daniel/Datak/datak-services/datak-horizon/docs/) para obtener información detallada del diseño y objetivos del sistema.

## Stack

- **Nuxt 4** + TypeScript
- **Nuxt UI 4** + Tailwind CSS 4
- **PostgreSQL 18** + **Drizzle ORM** / drizzle-kit
- **Firebase Authentication** (proveedor Google) + **Firebase Admin SDK**
- **Vitest** + `@nuxt/test-utils`

## Arquitectura

Backend por capas dentro de `server/` (los handlers quedan finos):

```txt
server/
  api/            # endpoints HTTP (finos: autentican y delegan)
  services/       # lógica de negocio / orquestación
  repositories/   # acceso a datos (único lugar que habla con la BD)
  db/             # esquema Drizzle, cliente, migraciones, seed
  utils/          # autenticación aislada (Firebase Admin, verificación de token)
```

En el frontend, la lógica de acceso HTTP vive en `app/services/`, la orquestación
reactiva en `app/composables/`, y los componentes solo renderizan (ver `RULES.md`).

## Requisitos previos

- Node 20+
- pnpm 11+
- Docker (para la base de datos local)

## Puesta en marcha local

1. **Instalar dependencias**

   ```bash
   pnpm install
   ```

2. **Configurar variables de entorno**

   ```bash
   cp .env.example .env
   ```

   Rellena las credenciales de Firebase. `DATABASE_URL` ya apunta a la base de
   datos local de Docker por defecto.

3. **Levantar PostgreSQL**

   ```bash
   pnpm db:up        # docker compose up -d
   ```

4. **Aplicar migraciones y sembrar datos**

   ```bash
   pnpm db:migrate   # aplica las migraciones SQL
   pnpm db:seed      # inserta datos de ejemplo
   ```

5. **Arrancar el servidor de desarrollo** en `http://localhost:3000`

   ```bash
   pnpm dev
   ```

## Scripts de base de datos

| Script             | Descripción                                            |
| ------------------ | ------------------------------------------------------ |
| `pnpm db:up`       | Arranca PostgreSQL con docker-compose                  |
| `pnpm db:down`     | Detiene y elimina el contenedor                        |
| `pnpm db:generate` | Genera migraciones SQL desde `server/db/schema.ts`     |
| `pnpm db:migrate`  | Aplica las migraciones pendientes                      |
| `pnpm db:push`     | Empuja el esquema directamente (desarrollo rápido)     |
| `pnpm db:studio`   | Abre Drizzle Studio                                    |
| `pnpm db:seed`     | Reinicia e inserta datos de ejemplo                    |

## Autenticación

La autenticación se delega en **Firebase Authentication** con Google Sign-In.

- El cliente inicia sesión (`app/plugins/firebase.client.ts` + `useAuth`) y obtiene
  un **ID token**.
- Las peticiones a la API envían `Authorization: Bearer <token>`.
- El servidor verifica el token con el **Admin SDK**
  (`server/utils/auth.ts` → `server/utils/firebaseAdmin.ts`).
- La tabla `users` guarda **solo el perfil de aplicación**, vinculado al
  `firebase_uid`; no almacena credenciales.

Endpoint protegido de ejemplo: `GET /api/me` devuelve el perfil del usuario
autenticado (creándolo en el primer inicio de sesión).

### Credenciales de Firebase

- **Cliente** (públicas): `NUXT_PUBLIC_FIREBASE_*`.
- **Admin** (privadas, solo servidor): el Admin SDK usa **Application Default
  Credentials**. En local, apunta `GOOGLE_APPLICATION_CREDENTIALS` al JSON de la
  cuenta de servicio (p. ej. `credentials/serviceAccount.json`); en GCP se toman
  automáticamente. El directorio `credentials/` está en `.gitignore` y **nunca**
  debe subirse al repositorio.

## Tests

```bash
pnpm test            # todos los proyectos (unit + nuxt)
pnpm test:unit       # solo unitarios (esquema, utilidad de auth)
```

## Datos del modelo

La entidad central es la **Iniciativa** (`Initiative`), a la cual se asocia todo el conocimiento técnico y de negocio mediante la siguiente estructura de dominio:

- **Conversación** (`Conversation`): Hilo de discusión o chat (manual, importación de Slack/WhatsApp, grabaciones, etc.).
- **Mensaje de Conversación** (`ConversationMessage`): Mensaje individual (soporta Markdown).
- **Insight** (`Insight`): Reglas de negocio, supuestos, restricciones y decisiones críticas que sobreviven a la discusión.
- **Requerimiento** (`Requirement`): Requerimientos refinados con prioridad (`must`, `should`, `could`, `wont`) y estado.
- **Artefacto IA** (`AIArtifact`): Plantillas funcionales, planes técnicos y prompts de desarrollo en Markdown (generados o manuales).

## Renovate

Instala la [app de Renovate](https://github.com/apps/renovate) en el repositorio.
