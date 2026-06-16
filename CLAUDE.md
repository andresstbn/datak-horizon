# CLAUDE.md

## Build and Test Commands
- **Run development server:** `pnpm run dev`
- **Build project:** `pnpm run build`
- **Check types:** `pnpm run typecheck`
- **Run lint check:** `pnpm run lint`
- **Run lint and fix:** `pnpm run lint --fix`
- **Run tests (all):** `pnpm run test`
- **Run tests (unit):** `pnpm run test:unit`
- **Run tests (nuxt):** `pnpm run test:nuxt`
- **Generate database migration:** `pnpm db:generate`
- **Apply database migrations:** `pnpm db:migrate`
- **Push database schema (direct):** `pnpm db:push`
- **Seed database:** `pnpm db:seed`

## Development Workflow & Code Quality
- **Mandatory Linting:** After implementing any feature, bug fix, refactoring, or modification, you **must** run:
  ```bash
  pnpm run lint --fix
  ```
  Ensure all linting errors are fully resolved before finishing.

## Architectural Guidelines (Strictly Follow RULES.md)
Always adhere to the detailed architecture in [RULES.md](file:///Users/daniel/Datak/datak-horizon/RULES.md). Key constraints include:

### 1. Language Constraints
- **Code:** English only (variables, functions, comments, commits, types, filenames, etc.).
- **User Interface:** Spanish only (labels, UI texts, error messages, notifications, modals, etc.).

### 2. Client-Side Architecture (`app/`)
- **Unbreakable Rule:** HTTP calls (`$fetch`, `useFetch`, `axios`, etc.) are **strictly forbidden** outside the `app/services/` directory.
- **Layers:**
  - **Vue Components:** UI only, no API calls, delegate logic to composables.
  - **Composables (`app/composables/`):** Orchestrate reactive state, trigger side-effects (toasts, routing), and call Frontend Services. No direct HTTP.
  - **Frontend Services (`app/services/`):** The *only* layer allowed to execute `$fetch`. No reactive properties, no UI side effects.
  - **Helpers (`app/utils/` or domain-specific):** Pure functions for calculations or transformations. No reactivity, no API calls, no stores.

### 3. Server-Side Architecture (`server/`)
- **API Handlers (`server/api/`):** Thin adapters. Validate input, authenticate, delegate to services. **No database access or Drizzle imports**.
- **Backend Services (`server/services/`):** Coordinate use cases, apply business logic, call repositories. No HTTP logic or database querying.
- **Repositories (`server/repositories/`):** The *only* layer allowed to run Drizzle query builders. No business logic.
- **Drizzle Schema (`server/db/`):** Use `getDb()` from `server/db/client.ts`. Never instantiate postgres clients directly.

### 4. Import Boundaries
Verify imports follow the strict boundary mapping (e.g. `server/api/` cannot import `drizzle-orm`, `server/services/` cannot import `h3`, client code cannot import server code and vice-versa).

### 5. Nuxt UI Verification
Never assume component props, slots, or events. Always verify via existing usage in the codebase, MCP `nuxt-ui` tools, or types in `node_modules/@nuxt/ui`.
