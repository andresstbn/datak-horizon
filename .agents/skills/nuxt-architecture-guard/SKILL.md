---
name: datak-nuxt-architecture-guard
description: Use this skill to implement, refactor, or review code in the Datak Horizon fullstack Nuxt 4 app (Nitro backend + Drizzle/PostgreSQL) following a strict layered architecture with separation between UI, composables, helpers, services, API handlers, backend services, and repositories.
---

# Datak Nuxt 4 Architecture Guard

## Purpose

This is the **agent procedural guide** for working in `datak-horizon`, a fullstack Nuxt 4 application with:

- **Client** (`app/`): Vue components, composables, helpers, frontend client services.
- **Server** (`server/`): Nitro API handlers, backend application services, repositories, Drizzle ORM + PostgreSQL.
- **Shared** (`shared/`): Framework-agnostic code reusable by both sides (introduced only when genuinely needed).

> **The project-wide conventions and architectural rules are defined in `RULES.md` at the project root.**
> This skill operationalizes those rules for agent workflows. Read `RULES.md` first if you are unfamiliar with the project architecture.

---

## Agent Objective

When working on this project you must:

1. Preserve the separation between UI, state, domain, and infrastructure — on **both** client and server sides.
2. Avoid expanding existing technical debt.
3. Refactor towards the target architecture when touching legacy code.
4. Prefer small, safe, typed, and easy-to-review changes.
5. Leave the code cleaner than you found it.

---

## Fullstack Architecture Overview

```text
┌─────────────────────────────────────────────────┐
│                   CLIENT (app/)                 │
│                                                 │
│  Vue Component                                  │
│    → Composable                                 │
│      → Helpers (domain logic)                   │
│      → Frontend Client Services (app/services/) │
│        → $fetch /api/...  ───────────┐          │
│    → Render UI                       │          │
└──────────────────────────────────────┼──────────┘
                                       │ HTTP
┌──────────────────────────────────────┼──────────┐
│                   SERVER (server/)   │          │
│                                      ▼          │
│  API Handler (server/api/)                      │
│    → Server Utils (auth, validation)            │
│    → Backend App Services (server/services/)    │
│      → Repositories (server/repositories/)      │
│        → Drizzle DB (server/db/)                │
└─────────────────────────────────────────────────┘
```

**Key naming distinction:**

- `app/services/` = **Frontend Client Services** — HTTP infrastructure on the client.
- `server/services/` = **Backend Application Services** — Business orchestration on the server.

Both are named "services" but belong to entirely different runtime and layer contexts. Never confuse them.

---

## Decision Protocol

Before writing code, classify the change using these tables.

### Client-Side Decisions

| If the problem is...                     | Then...                                |
| :--------------------------------------- | :------------------------------------- |
| **Pure UI**                              | Work in component.                     |
| **Reactive state or user flow**          | Work in composable.                    |
| **Business rule or calculation**         | Extract or modify helper.              |
| **HTTP call to server API**              | Work in frontend client service.       |
| **Reusable code between app and server** | Evaluate `shared/`.                    |

### Server-Side Decisions

| If the problem is...                     | Then...                                           |
| :--------------------------------------- | :------------------------------------------------ |
| **New API endpoint**                     | Create thin handler in `server/api/`.              |
| **Backend business logic or use-case**   | Work in `server/services/`.                        |
| **Database query or mutation**           | Work in `server/repositories/`.                    |
| **Schema change (table, column, enum)**  | Modify `server/db/schema.ts` + generate migration. |
| **Cross-cutting server concern**         | Work in `server/utils/`.                           |
| **Repeated concern across many handlers**| Evaluate `server/middleware/`.                     |
| **Type needed on both client and server**| Evaluate `shared/`.                                |

---

## Mandatory Questions Before Implementing

### Client-side

- _Does this make an HTTP call?_ → Must go in `app/services/`.
- _Is this a pure rule or calculation?_ → Must go in a helper.
- _Does this manage loading, error, or interaction?_ → Probably goes in a composable.
- _Does this only render?_ → Goes in a component.
- _Could this be used in both app and server without depending on Vue/Nitro?_ → Evaluate `shared/`.

### Server-side

- _Does this read or write to the database?_ → Must go through a repository.
- _Is this backend business logic or use-case coordination?_ → Must go in `server/services/`.
- _Is this just request parsing + auth + delegation?_ → API handler.
- _Does the frontend need this data?_ → Verify the full chain exists: API handler → backend service → repository, and on the client side: frontend client service → composable → component.
- _Is this a cross-cutting concern repeated across multiple handlers?_ → Evaluate `server/middleware/`.

---

## Database Workflow Rules

When making changes that affect the database:

1. **Schema changes** — Modify `server/db/schema.ts`, then run:
   ```bash
   pnpm db:generate   # generates SQL migration
   pnpm db:migrate    # applies pending migrations
   ```

2. **Always use the `getDb()` singleton** from `server/db/client.ts`. Never instantiate `postgres()` directly in handlers or services.

3. **Seed scripts** must respect FK constraint ordering:
   - **Deleting**: children first, then parents.
   - **Inserting**: parents first, then children.

4. **Inferred types** (`$inferSelect`, `$inferInsert`) from the schema are the canonical way to type domain objects on the server side. Do not re-declare parallel interfaces when the schema type suffices.

---

## Refactoring Existing Code

If you find violations, proceed like this:

### Client-Side Cases

**Case A: HTTP in components or composables**

- Extract the call to `app/services/`.
- Create or expand the corresponding frontend client service.
- Leave the composable as the orchestrator.
- **The component must never speak HTTP.**

**Case B: Business logic in component**

- Extract to `helpers/`.
- Invoke the helper from the composable or component only if it is completely presentational logic.

**Case C: Frontend client service import in component**

- Create an intermediary composable.
- Move loading/error/toasts to the composable.
- The component uses only the composable.

**Case D: Helper with side effects**

- Divide into:
  1. Pure helper.
  2. Composable or service for the side effect.

**Case E: Misplaced shared logic**

- Move to `shared/` only if it does not depend on Vue or Nitro, and is genuinely used by both `app/` and `server/`.

### Server-Side Cases

**Case F: Direct DB access in API handler**

- Extract the query into a repository.
- The handler should call a backend application service, which calls the repository.
- If the operation is trivial (single query, no business logic), the handler may call the repository directly — but prefer the full chain for consistency.

**Case G: Business logic in API handler**

- Extract to a backend application service in `server/services/`.
- The handler authenticates, validates input, delegates to the service, and returns the response.

**Case H: Server import leaking into `app/`**

- Never import from `server/` in `app/` code.
- Create or use a frontend client service (`app/services/`) that calls the corresponding `/api/` endpoint.
- The frontend client service is the boundary between client and server.

**Case I: Schema change without migration**

- If you modify `server/db/schema.ts`, you **must** generate a migration with `pnpm db:generate`.
- Never push schema changes without a corresponding migration file.

---

## Special Rules for Nuxt 4

**Auto-import behavior:**

- Composables in `app/composables/` are auto-imported.
- Do not assume nested folders under `app/composables/` are auto-imported. If you create nested composables, re-export or adjust the project configuration.

**Feature-based organization:**

When the module justifies it, use feature-based organization without breaking the layered architecture:

```text
features/
  projects/
    components/
    composables/
    helpers/
    types/
services/            # Frontend Client Services (app-level)
helpers/
shared/
app/
  composables/
server/
  api/
  services/          # Backend Application Services
  repositories/
  db/
  utils/
```

Feature-based organization does not eliminate layer rules. It only improves code proximity.

---

## Implementation Conventions

**Naming:**

- **composables:** `useXxx.ts`
- **frontend client services:** `xxxService.ts` (in `app/services/`)
- **backend application services:** `xxxService.ts` (in `server/services/`)
- **repositories:** `xxxRepository.ts`
- **helpers:** clear verbs or predicates
- **types:** explicit domain names
- **components:** semantic names, not generic

**TypeScript:**

- Prohibited to use `any` except with exceptional justification.
- Prefer `type` or `interface` according to existing project conventions.
- Type parameters, responses, and return values.
- Avoid unsafe casts.
- If the backend responds with something inconsistent, normalize it explicitly.

**Changes:**

- Prefer small and localized changes.
- Do not make unrequested massive refactors.
- If touching legacy code, improve the intervened area.
- Do not break internal APIs without updating consumers.
- Preserve compatibility when the scope requires it.

---

## Nuxt UI API Verification Checklist

Before writing or modifying any code that uses Nuxt UI components, the agent **must** complete this checklist. Do not skip steps.

### Before using a Nuxt UI component:

- [ ] **Search existing usage first.** Grep the codebase for how the component is already used:
  ```
  grep -r "UButton" app/ --include="*.vue"
  ```
  If the project already uses the component, follow the established pattern.

- [ ] **Verify the component exists.** Use the MCP tool:
  ```
  nuxt-ui / search-components { "search": "button" }
  ```

- [ ] **Verify props, slots, and events.** Use the MCP tool:
  ```
  nuxt-ui / get-component-metadata { "componentName": "UButton" }
  ```
  or for full docs:
  ```
  nuxt-ui / get-component { "componentName": "UButton", "sections": ["api"] }
  ```

- [ ] **Do not explicitly import.** Nuxt UI components are auto-imported. Write `<UButton>` directly in templates without an import statement.

- [ ] **Verify composables.** If using a Nuxt UI composable:
  ```
  nuxt-ui / search-composables { "search": "toast" }
  ```

### Before using a specific prop:

- [ ] **Confirm the prop exists** in the MCP metadata or package types. Do not invent prop names.
- [ ] **Check the prop's type and accepted values.** Especially for enums like `variant`, `color`, `size`.
- [ ] **If unsure, check the installed types** at `node_modules/@nuxt/ui/dist/runtime/components/`.

### When creating project components:

- [ ] **Use domain-oriented names**, not generic names (e.g., `InitiativeStatusBadge`, not `StatusBadge` or `Badge`).
- [ ] **Do not shadow Nuxt UI component names.** Never name a project component `Button.vue`, `Modal.vue`, etc.

### Fallback when MCP is unavailable:

If the MCP `nuxt-ui` server is not responding:
1. Grep existing project usage.
2. Read TypeScript definitions from `node_modules/@nuxt/ui`.
3. **Never fall back to model memory** — it is unreliable for Nuxt UI APIs.

---

## What the Agent Must Do When Delivering Changes

Whenever you implement or refactor:

1. Briefly explain what you moved and why.
2. Indicate if you fixed technical debt.
3. Mention any trade-offs.
4. Do not invent unnecessary abstractions.
5. Leave clear and consistent names.
6. **For server changes:** Confirm the full chain is intact (handler → service → repository) and that the client side has a corresponding service + composable if the data surfaces in the UI.
7. **For UI changes:** Confirm all Nuxt UI component usage was verified through MCP or existing project patterns — not from memory.
