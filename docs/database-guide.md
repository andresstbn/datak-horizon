# Guía de Base de Datos y Operación Local — Datak Horizon

Esta guía cubre todo lo relacionado con la base de datos local y los comandos de desarrollo para operar la plataforma **Datak Horizon**.

---

## Conexión y Configuración

La aplicación utiliza **PostgreSQL** administrado a través de **Drizzle ORM**.

La configuración se lee desde las variables de entorno en el archivo `.env` en la raíz del proyecto:

```bash
# Dirección de conexión a PostgreSQL
DATABASE_URL="postgres://postgres:postgres@localhost:5432/datak_horizon_dev"
```

El cliente Drizzle se encuentra configurado en `server/db/client.ts` y provee el singleton `getDb()` para realizar operaciones tipadas sobre el esquema.

---

## Gestión de Datos Local

Dado que el producto está en etapa temprana y no hay datos reales de producción, puedes realizar operaciones destructivas y cambios de esquema directos.

### 1. Iniciar PostgreSQL local (Docker)
Antes de ejecutar la aplicación, debes levantar el contenedor de Docker para PostgreSQL:
```bash
pnpm db:up
```
*Si deseas apagar la base de datos:*
```bash
pnpm db:down
```

### 2. Borrar / Resetear la base de datos por completo
Si deseas realizar una limpieza absoluta y recrear la base de datos desde cero:
```bash
pnpm db:down -v    # Apaga PostgreSQL y remueve el volumen de Docker
pnpm db:up         # Vuelve a crear la base de datos vacía
```

### 3. Aplicar Migraciones
Las migraciones de Drizzle son archivos SQL que definen el estado de la base de datos y se ubican en `server/db/migrations/`.

- **Generar migración**: Si modificas `server/db/schema.ts`, ejecuta el siguiente comando para calcular la diferencia y generar el nuevo archivo SQL:
  ```bash
  pnpm db:generate
  ```
- **Aplicar migración**: Para empujar y aplicar todos los cambios de base de datos pendientes:
  ```bash
  pnpm db:migrate
  ```

### 4. Sembrar Datos (Seed)
Para poblar la base de datos con datos simulados (usuarios base, la iniciativa `"IVA diferencial"` de ejemplo, conversaciones markdown, insights y requerimientos de prueba):
```bash
pnpm db:seed
```
*Nota: El script de semilla (`server/db/seed.ts`) limpia de manera automática las tablas existentes respetando el orden de llaves foráneas antes de insertar los datos iniciales, siendo una operación idempotente.*

---

## Resumen de Scripts en `package.json`

| Comando | Acción Realizada |
| :--- | :--- |
| `pnpm db:up` | Levanta el contenedor Docker de PostgreSQL en segundo plano |
| `pnpm db:down` | Apaga y remueve el contenedor Docker |
| `pnpm db:generate` | Compara el esquema actual de Drizzle y genera el archivo SQL de migración |
| `pnpm db:migrate` | Ejecuta el script standalone `server/db/migrate.ts` para aplicar los cambios |
| `pnpm db:seed` | Ejecuta `server/db/seed.ts` para limpiar y poblar la base de datos |
| `pnpm db:studio` | Abre la interfaz visual interactiva Drizzle Studio en tu navegador |

---

## Ejecutar Pruebas Automatizadas

Para validar que el esquema y los servicios del backend interactúan de manera correcta con la persistencia, ejecuta la suite de pruebas con **Vitest**:

```bash
# Ejecutar suite completa una sola vez
pnpm test run

# Ejecutar suite en modo watch
pnpm test
```

---

## Enlaces útiles
- [Visión del Producto](file:///Users/daniel/Datak/datak-services/datak-horizon/docs/vision.md)
- [Características del MVP](file:///Users/daniel/Datak/datak-services/datak-horizon/docs/mvp-features.md)
