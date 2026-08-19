# Datak Horizon

Plataforma interna de Datak: la **fuente única de verdad** para las iniciativas
de producto e ingeniería. Centraliza necesidades, especificaciones vivas,
decisiones (ADR), planificación y entrega.

> **Estado Actual**: Esta versión cuenta con el primer núcleo funcional (MVP) de refinamiento colaborativo y preparación para IA completamente operativo. Consulta la carpeta [docs/](docs/) para obtener información detallada del diseño y objetivos del sistema.

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

## Autenticación y Control de Acceso (Allowlist)

La autenticación se delega en **Firebase Authentication** con Google Sign-In, pero el acceso a la plataforma está protegido mediante una **allowlist explícita server-side**. Autenticarse correctamente con Google **no** otorga acceso por defecto a Horizon si la cuenta no figura en la lista autorizada.

### Flujo de autorización server-side

1. El cliente inicia sesión en Google mediante Firebase (`app/plugins/firebase.client.ts` + `useAuth`) y obtiene un **ID token**.
2. Las peticiones a la API envían el header `Authorization: Bearer <token>`.
3. Todos los endpoints protegidos invocan `requireAuth(event)` (`server/utils/auth.ts`), el cual:
   - Valida la firma y expiración del ID token con **Firebase Admin SDK**.
   - Evalúa si el email del token pertenece a la **allowlist** de usuarios autorizados (`server/utils/allowlist.ts`).
   - Si el email no está en la allowlist o no existe, responde de inmediato con **HTTP 403 Forbidden** antes de procesar la lógica de negocio o interactuar con la base de datos.
4. Si el usuario está autorizado, `GET /api/me` obtiene o provisiona su perfil de aplicación en la tabla `users`.

### Dónde vive la allowlist y cómo agregar un usuario

La allowlist opera bajo dos mecanismos complementarios:

1. **Lista base versionada en el repositorio:**
   Ubicada en [`server/utils/allowlist.ts`](server/utils/allowlist.ts) (`DEFAULT_ALLOWED_EMAILS`). Contiene únicamente las cuentas reales de los miembros del equipo. Los usuarios semilla de `server/db/seed.ts` no van aquí: solo pueblan la base local y no pueden iniciar sesión. Para desarrollo local usa `NUXT_AUTH_ALLOWLIST`. Para autorizar un nuevo usuario de forma estándar:
   - Añade el email al array `DEFAULT_ALLOWED_EMAILS` en `server/utils/allowlist.ts`.
   - Realiza un commit en una rama y abre un PR.
   - Tras la aprobación y merge a `main`, haz deploy a Cloud Run.

2. **Variable de entorno en runtime (`NUXT_AUTH_ALLOWLIST`):**
   Permite autorizar emails adicionales dinámicamente mediante una lista separada por comas (por ejemplo: `NUXT_AUTH_ALLOWLIST="usuario1@datak.co,usuario2@datak.co"`), configurable en las variables de Cloud Run o en el archivo `.env`.

### Experiencia para usuarios no autorizados (UX)

Si un usuario con cuenta de Google válida pero no autorizada intenta acceder:
- Los endpoints de la API rechazan la petición con `403 Forbidden` y no exponen información interna.
- La aplicación muestra una alerta clara indicando que la cuenta no está autorizada para Datak Horizon.
- Se ofrece la opción de cerrar sesión de forma segura para cambiar de cuenta.

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
