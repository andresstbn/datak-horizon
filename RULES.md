# Development Rules & Architecture Contract for Datak Horizon

This file defines the mandatory development guidelines, naming conventions, and architectural rules for working in the `datak-horizon` repository. All AI agents and developers must strictly follow these rules to guarantee consistency, quality, and maintainability.

> This is a **fullstack Nuxt 4 application** with a Nitro server backend and PostgreSQL database (via Drizzle ORM). The rules below cover both the client (`app/`) and the server (`server/`) sides.

---

## 1. Code and Interface Language

*   **Code Entirely in English:**
    *   All source code must be written exclusively in **English**.
    *   This includes names of variables, functions, classes, methods, reactive properties, interface definitions, file names, comments, docstrings, commits, and log messages.
    *   *Example:* `const isProcessing = ref(false)` instead of `const estaProcesando = ref(false)`.

*   **Interface Texts and User Messages in Spanish:**
    *   Any text, label, error message, notification, report, modal, or content that is visible to the end user must be written in **Spanish**.
    *   Ensure all text presented on the UI is proofread for correct Spanish grammar and spelling.

---

## 2. Naming Conventions (JS / TS / Vue)

To maintain uniformity across the codebase, follow these naming standards:

*   **Variables, Functions, and Methods:** `camelCase` (e.g., `userProfile`, `calculateTotal`, `fetchOrderDetails`).
*   **Classes, Interfaces, and Types:** `PascalCase` (e.g., `OrderService`, `InvoiceDetail`, `UserPermissions`).
*   **Constants:** `UPPER_CASE_WITH_UNDERSCORES` (e.g., `DEFAULT_PAGE_LIMIT`, `API_RETRY_COUNT`).
*   **Vue Component Files:** `PascalCase` (e.g., `BaseButton.vue`, `OrderCard.vue`).
*   **Composables:** Prefix with `use` in `camelCase` (e.g., `useCreateOrder.ts`, `usePermissions.ts`).
*   **Frontend Client Services:** Suffix with `Service` in `camelCase` (e.g., `authService.ts`, `projectService.ts`).
*   **Backend Application Services:** Suffix with `Service` in `camelCase` (e.g., `userService.ts`, `initiativeService.ts`).
*   **Repositories:** Suffix with `Repository` in `camelCase` (e.g., `userRepository.ts`, `initiativeRepository.ts`).
*   **Directories / Folders:** `kebab-case` (e.g., `domain-helpers`, `project-details`).

---

## 3. Unbreakable Architecture Rule

> [!CAUTION]
> **It is strictly forbidden to make HTTP calls outside the `app/services/` folder.**

This includes but is not limited to:
- `$fetch`
- `useFetch`
- `useLazyFetch`
- `useApiFetch`
- `ofetch`
- `axios`
- `fetch`
- Any direct or indirect HTTP client wrapper.

If you find an HTTP call outside `app/services/`, it is **explicit technical debt** and must be refactored.

---

## 4. Client-Side Layered Architecture

The client application (`app/`) respects a strict data and orchestration flow:

```text
Vue Component
  -> Composable
    -> Helpers (domain logic)
    -> Frontend Client Services (app/services/)
  -> Render UI
```

> [!IMPORTANT]
> **`app/services/` = Frontend Client Services.**
> Responsible for frontend HTTP/client-side communication infrastructure. They talk to the server API endpoints. They are the **only** place in `app/` that can perform HTTP calls.

### 4.1 Helpers (Domain & Pure Utilities)
*   **What they are:** Pure, deterministic functions with no side effects.
*   **What they do:**
    *   Validate domain rules.
    *   Calculate derived data.
    *   Transform structures.
    *   Answer what action is valid.
*   **What they DO NOT do:**
    *   ❌ Do not use Vue reactivity (`ref`, `computed`, `watch`, `useState`).
    *   ❌ Do not call APIs.
    *   ❌ Do not use Pinia stores.
    *   ❌ Do not access routing or DOM.
    *   ❌ Do not trigger side effects (e.g., toasts, alerts).
*   **Golden Rule:** A helper answers *what is valid*, *what can be done*, or *how it is calculated/transformed*.

### 4.2 Frontend Client Services (`app/services/`)
*   **What they are:** The only layer permitted to communicate with the server API from the client.
*   **What they do:**
    *   HTTP calls via `$fetch` to `/api/...` endpoints.
    *   URL construction.
    *   Endpoint encapsulation.
    *   Basic error normalization.
    *   Type safety mapping for requests/responses.
*   **What they DO NOT do:**
    *   ❌ Do not use `ref`, `computed`, `watch`.
    *   ❌ Do not trigger UI elements like toasts or modals.
    *   ❌ Do not manage visual loading states.
    *   ❌ Do not implement business or application rules.
*   **Golden Rule:** A frontend client service knows *how to talk to the server API*, but it does not know *when or why* it is used.

### 4.3 Composables (State & Flow Orchestration)
*   **What they are:** Flow orchestrators and managers of reactive state.
*   **What they do:**
    *   Manage reactive state (`ref`, `computed`, `watch`).
    *   Coordinate loading, error, and derived UI states.
    *   Invoke frontend client services and helpers.
    *   Coordinate confirmations and trigger toasts.
*   **What they DO NOT do:**
    *   ❌ Do not call APIs directly (always delegate to frontend client services).
    *   ❌ Do not construct URLs.
    *   ❌ Do not leave complex business rules inline if they can live in helpers.
    *   ❌ Do not render UI directly.
*   **Golden Rule:** A composable knows *when and why* to execute something, but delegates *what* (Helpers) and *how* (Frontend Client Services).

### 4.4 Vue Components
*   **What they do:**
    *   Render the visual UI.
    *   Handle simple user actions and events.
    *   Delegate logic to composables.
    *   Receive props and emit events clearly.
*   **What they DO NOT do:**
    *   ❌ Do not call APIs or import frontend client services.
    *   ❌ Do not implement complex business rules or construct payloads inline.
    *   ❌ Do not duplicate logic that belongs to composables or helpers.

---

## 5. Shared Logic & Nuxt 4 Specifics

*   **`shared/` Folder:** Should only be introduced when a type, constant, enum, or schema is genuinely used by both `app/` and `server/`. It must be framework-agnostic and must not import Vue or Nitro features.
    *   **Suggested locations:** `shared/types/`, `shared/utils/`.
    *   **Do not create `shared/` preemptively** — wait until there is a concrete need for cross-boundary reuse.
*   **Feature-Based Organization:** When appropriate, group components, composables, helpers, and types under specific features (e.g., `features/projects/`). The architectural layering rules still strictly apply within each feature.

---

## 6. Server-Side Layered Architecture

The server (`server/`) follows its own layered architecture:

```text
API Handler (server/api/)
  -> Server Utils (auth, validation, etc.)
  -> Backend Application Services (server/services/)
    -> Repositories (server/repositories/)
      -> Database via Drizzle (server/db/)
```

> [!IMPORTANT]
> **`server/services/` = Backend Application Services.**
> Responsible for backend business orchestration and use-case coordination. They are **not** the same as `app/services/` (Frontend Client Services). Both directories are named "services" but belong to different runtime and layer contexts.

### 6.1 API Handlers (`server/api/`)

*   **What they are:** Thin Nitro event handlers that define the HTTP API surface.
*   **What they do:**
    *   Define routes (`*.get.ts`, `*.post.ts`, `*.put.ts`, `*.delete.ts`).
    *   Authenticate and authorize requests (via server utils).
    *   Parse and validate request input.
    *   Delegate to backend application services.
    *   Return shaped responses.
*   **What they DO NOT do:**
    *   ❌ Do not import `drizzle-orm` directly.
    *   ❌ Do not access the database directly.
    *   ❌ Do not implement business logic.
    *   ❌ Do not import anything from `app/`.
*   **Golden Rule:** A handler is a *thin adapter* between HTTP and the backend application services. It authenticates, validates, delegates, and responds — nothing more.

### 6.2 Backend Application Services (`server/services/`)

*   **What they are:** Backend business logic and use-case orchestrators.
*   **What they do:**
    *   Implement use-case coordination (e.g., "get or create user from token").
    *   Call repositories for data access.
    *   Apply business rules and validations.
    *   Orchestrate multi-step operations.
*   **What they DO NOT do:**
    *   ❌ Do not parse HTTP requests (that's the handler's job).
    *   ❌ Do not return HTTP status codes or errors directly.
    *   ❌ Do not import Vue or Nuxt client-side code.
    *   ❌ Do not perform raw database queries (delegate to repositories).
*   **Golden Rule:** A backend application service knows *what* to do and *why*, but delegates *how* to access data to repositories.

### 6.3 Repositories (`server/repositories/`)

*   **What they are:** The only layer allowed to perform direct database queries.
*   **What they do:**
    *   Execute Drizzle ORM queries (select, insert, update, delete).
    *   Encapsulate query logic and joins.
    *   Return typed domain objects.
*   **What they DO NOT do:**
    *   ❌ Do not implement business rules or validations.
    *   ❌ Do not parse HTTP requests.
    *   ❌ Do not import from `app/`.
    *   ❌ Do not handle errors with HTTP semantics.
*   **Golden Rule:** A repository knows *how* to read and write data, but it does not know *when or why*.

### 6.4 Database Schema & Migrations (`server/db/`)

*   **What it contains:**
    *   `schema.ts` — Drizzle table definitions, enums, relations, and inferred types.
    *   `client.ts` — Lazily-created singleton database client (`getDb()`).
    *   `migrations/` — SQL migration files generated by `drizzle-kit`.
    *   `migrate.ts` — Standalone migration runner script.
    *   `seed.ts` — Development seed script.
*   **Rules:**
    *   Always use the `getDb()` singleton from `server/db/client.ts`. Never instantiate `postgres()` directly in handlers or services.
    *   Schema changes require generating a migration: `pnpm db:generate` followed by `pnpm db:migrate`.
    *   Seed scripts must respect FK constraint ordering (delete children before parents, insert parents before children).
    *   Inferred types (`$inferSelect`, `$inferInsert`) are the canonical way to type domain objects on the server.

### 6.5 Server Utils (`server/utils/`)

*   **What they are:** Cross-cutting server concerns, auto-imported by Nitro.
*   **What they do:**
    *   Authentication and token verification.
    *   Third-party SDK initialization (e.g., Firebase Admin).
    *   Shared server-side utilities.
*   **What they DO NOT do:**
    *   ❌ Do not implement business logic.
    *   ❌ Do not perform database queries.
    *   ❌ Do not import from `app/`.

### 6.6 Server Middleware (`server/middleware/`) — Optional Layer

*   **What it is:** Nitro middleware for cross-cutting concerns that run before API handlers.
*   **When to create:**
    *   Only when a repeated cross-cutting concern exists across multiple API handlers (e.g., rate limiting, tenant resolution, request logging).
    *   Do not create middleware unless the concern genuinely spans multiple routes.
*   **What it does:**
    *   Auth guards (if global).
    *   Rate limiting.
    *   Request context enrichment.
    *   Logging and tracing.
*   **What it does NOT do:**
    *   ❌ Do not implement business logic.
    *   ❌ Do not access the database directly.
    *   ❌ Do not replace handler-level authentication when only specific routes need it.

---

## 7. Server-Side Validation Rules

> [!CAUTION]
> These import boundaries are mandatory and must never be violated.

| Layer | Can import from | Must NOT import from |
|---|---|---|
| `server/api/` | `server/services/`, `server/utils/` | `drizzle-orm`, `server/db/client`, `app/` |
| `server/services/` | `server/repositories/`, `server/utils/`, `server/db/schema` (types only) | `app/`, `h3` (HTTP concerns) |
| `server/repositories/` | `server/db/client`, `server/db/schema` | `app/`, `server/api/`, `h3` |
| `server/utils/` | External SDKs, `#imports` | `app/`, `server/repositories/` |
| `server/middleware/` | `server/utils/` | `app/`, `server/repositories/`, `drizzle-orm` |

---

## 8. Nuxt UI Component Usage

> [!CAUTION]
> **Agents must not rely on memory for Nuxt UI component APIs.** Nuxt UI evolves rapidly and model training data is frequently outdated. Hallucinated props, slots, events, and component names are a recurring source of bugs.

### 8.1 Verification Before Use

Before using any Nuxt UI component, prop, event, slot, composable, or theme/config API, the agent **must** verify it through one of these sources (in priority order):

1. **Existing project usage** — grep the codebase for how the component is already used. Existing usage has the highest priority.
2. **MCP `nuxt-ui` tools** — Use the available MCP tools to query live documentation:
   - `get-component` — Full component docs (props, slots, events, theme).
   - `get-component-metadata` — Structured metadata (props, slots, events).
   - `search-components` — Find components by name or category.
   - `search-composables` — Find composables by name.
3. **Installed package types** — Read the TypeScript definitions from `node_modules/@nuxt/ui` if MCP is unavailable.

### 8.2 Mandatory Rules

*   **Auto-imports only:** Nuxt UI components are auto-imported by Nuxt. Do not explicitly import them (`import { UButton } from '#components'`) unless there is a proven, documented exception.
*   **No invented props:** Do not guess or assume prop names. Every prop must be verified from MCP docs, package types, or existing project usage.
*   **No guessed component names:** Do not assume auto-imported component names. Verify the exact name from MCP docs or existing usage in the project.
*   **Domain-oriented project components:** Custom project components must use domain-oriented names (e.g., `InitiativeCard`, `DecisionTimeline`), not generic names (e.g., `Card`, `List`, `Item`).
*   **Prioritize project patterns:** If the project already uses a Nuxt UI component in a specific way (e.g., specific prop combinations, wrapper patterns), follow that established pattern before inventing a new one.

---

## 9. Change Management and Git

*   **Do not commit directly to `main`:** Work in descriptive branches (e.g., `feature/refactor-auth`).
*   **Commit Messages:** Must be in English, written clearly and concisely.
*   **Local Validation:** Run build and linter validation (`pnpm run build` / lint tasks) before proposing changes.
