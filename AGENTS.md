# AGENTS.typescript.md - TypeScript Stack Agent Configuration

> **TypeScript stack agent configuration — see AGENTS.md for the generic template**

## Project Overview

Daily Pantry is a local-first employee meal ordering PWA. Employees order meals from sellers, the office boy handles procurement. Built as a pnpm + Turborepo monorepo with Bun.js/Hono.js backend (DDD), React/TanStack Router frontend, and Turso (libsql) database.

- **Frontend**: `apps/frontend` — React 19, TanStack Router v1, TanStack Query v5, Tailwind CSS 3, PWA
- **Backend**: `apps/backend` — Bun.js, Hono.js, Drizzle ORM, Domain-Driven Design
- **Shared**: `packages/shared` — Drizzle schema, Zod validators, `createDb()` factory
- **Roles**: employee, seller, office_boy, manager

## The Agent System

This project uses a multi-agent system for context-efficient development.

### Agents

#### Core Agents

| Agent | Role | Mode |
|-------|------|------|
| **@ostype** | Orchestrator — coordinates, delegates, synthesizes | primary |
| **@tylead** | Technical Lead — research, architecture, planning | subagent |
| **@tyson** | Backend Implementor — Node.js, Bun.js, all frameworks/ORMs | subagent |
| **@nova** | Frontend Implementor — React, TanStack Router/Query/Table | subagent |
| **@marco** | Truth-Teller (default) — challenges assumptions | subagent |

#### Marco Variants

| Agent | Model | Purpose |
|-------|-------|---------|
| **@marco_opus** | 9router/true-teller-verificator-2 | Default truth-teller |
| **@marco_qwen** | 9router/true-teller-verificator-2 | Code-focused analysis |
| **@marco_gemini** | 9router/true-teller-verificator-2 | Alternative perspective |

### Workflow

```
User Request
    │
    ▼
  Ostype ─────────────────────────────────────┐
    │                                          │
    ├──→ Tylead (research + plan)              │
    │         │                                │
    │         ├──→ Marco (challenge)           │ ← optional, for complex/risky changes
    │         │                                │
    │         ▼                                │
    ├──→ Tyson (backend implement) ──┐         │
    ├──→ Nova (frontend implement) ──┤──→ Done◄┘
```

### Marco Consensus Pattern

For high-stakes decisions, run all three Marco variants in parallel:

```
Ostype
  │
  ├──→ @marco_opus ──┐
  ├──→ @marco_qwen ──┼──→ Synthesize → Decision
  └──→ @marco_gemini ──┘
```

**When to use:**
- Major architectural decisions
- Risky refactors (>5 files)
- When you want diverse AI perspectives
- When the team is stuck

**How to interpret:**
- **All agree** = High confidence signal
- **Disagree** = Explore each angle
- **One unique insight** = Investigate further

### Key Principles

- **Ostype orchestrates everything** — delegates to Tylead, Tyson, Nova, Marco; never does the work himself
- **Tylead researches and plans** — digs deep, evaluates tradeoffs, routes tasks to the right implementor
- **Tyson implements backend** — server/API/data-layer code, follows the spec precisely
- **Nova implements frontend** — React/TanStack Router/Query/Table, follows the spec precisely
- **Marco challenges** — called for complex refactors (>5 files), risky changes, or when stuck

## Quick Start

```bash
# Prerequisites: Bun, pnpm, Turso account

# Install dependencies
pnpm install

# Copy env file and fill in Turso credentials
cp .env.example apps/backend/.env

# Seed database (push schema + roles)
cd apps/backend && bun run db:seed

# Register office boy (CLI)
cd apps/backend && bun run cli:register-ob --name "Boy" --email "boy@corp.com" --password "s3cret!"

# Start dev servers
pnpm dev                    # both backend + frontend via turbo
# or individually:
cd apps/backend && bun --hot src/serve.ts    # → :3001
cd apps/frontend && npx vite                  # → :3000

# Type check
pnpm typecheck                               # all packages via turbo
npx tsc --noEmit                             # single package

# Run tests
cd apps/backend && bun test                  # Bun test runner (18 tests)
cd apps/frontend && npx vitest run            # Vitest (11 tests)
```

## TypeScript Environment

**CRITICAL:** Always detect the project's package manager from lockfiles before running commands:

| Lockfile | Package Manager |
|----------|-----------------|
| `bun.lockb` | bun |
| `pnpm-lock.yaml` | pnpm |
| `yarn.lock` | yarn |
| `package-lock.json` | npm |

```bash
# Use npx/bunx — never assume global binaries
npx tsc --noEmit        # npm/yarn/pnpm
bunx tsc --noEmit       # bun

# Run tests with the project's test runner
npx vitest run          # Vitest
npx jest                # Jest
bun test                # Bun test runner
```

**NEVER** assume global `tsc`, `vitest`, or `eslint` binaries. Always use `npx` or `bunx`.

## Workflow Rules

<workflow>
### After Code Fixes
When `@tyson` or `@nova` completes a fix for a GitHub issue:
1. **Commit** with message format: `fix #<issue_number>: <short description>`
2. **Push** to remote immediately
3. **Close issue** with `gh issue close <number> --reason completed --comment "<summary of fix>"`
4. **Move to next** issue in priority order

### Commit Ownership
- **@tyson commits backend changes** — server code, API routes, ORM queries, database schemas
- **@nova commits frontend changes** — React components, routes, hooks, styles
- **Never route backend commits through Nova or frontend commits through Tyson**

### Commit Frequency
- **In branches:** Commit after EVERY meaningful change (don't batch)
- **Small, atomic commits** are preferred over large ones
- **Always push** after committing - don't let commits pile up locally

### Branch Workflow
When working in a feature branch:
1. Commit and push frequently (after each fix/change)
2. When all issues for the branch are complete:
   - Check if other branches exist: `git branch -a`
   - If **no other branches**: prepare PR and merge to main
   - If **other branches exist**: prepare PR but **do NOT merge** - ask user first
3. Always use `gh pr create` with clear summary

### Task Tagging
When `@tylead` creates plans, every task must be tagged with its implementor:
- **`Assigned: Tyson`** — backend/server-side work
- **`Assigned: Nova`** — frontend/client-side work
- **`Assigned: Tyson + Nova (sequenced)`** — full-stack tasks, ordered by dependency

### Issue Management
- Close issues **immediately** after fix is verified (tests pass, `tsc --noEmit` clean)
- Always include in close comment:
  - What was changed
  - Problems encountered during the work on this issue, and how you solved them
  - Which file(s) were modified
  - Commit hash if relevant
- Link related issues in comments when applicable

### Commit Message Format
```
<type> #<issue>: <description>

Types: fix, feat, refactor, docs, test, chore
```

Examples:
- `fix #42: handle null response from API`
- `feat #15: add user authentication endpoint`
- `refactor #30: extract shared Zod schema`
- `fix #145: correct case-insensitive filter in Prisma query`
</workflow>

## Scripts

| Script | Location | Purpose |
|--------|----------|---------|
| `pnpm dev` | root | Start all apps via Turborepo |
| `pnpm typecheck` | root | `tsc --noEmit` across all packages |
| `bun --hot src/serve.ts` | backend | Start Bun dev server (hot reload) |
| `bun run db:seed` | backend | Push Drizzle schema + seed roles |
| `bun run cli:register-ob` | backend | Register office boy via CLI |
| `bun test` | backend | Run backend tests (18) |
| `npx vite` | frontend | Start Vite dev server |
| `npx vitest run` | frontend | Run frontend tests (11) |

## Project Structure

```
daily-pantry/
├── apps/
│   ├── backend/
│   │   └── src/
│   │       ├── auth/             # Login, register, session
│   │       ├── user/             # User CRUD (office boy only)
│   │       ├── seller/           # Seller profile (name, desc, QRIS)
│   │       ├── middleware/       # auth.middleware.ts, db.middleware.ts
│   │       ├── cli/              # register-office-boy.ts
│   │       ├── db/               # seed.ts
│   │       └── types/            # env.ts (Hono Bindings)
│   └── frontend/
│       └── src/
│           ├── routes/           # TanStack Router pages + __tests__
│           ├── hooks/            # TanStack Query hooks (useAuth, useUsers, useSeller)
│           ├── components/       # Layout, ProtectedRoute, form components
│           ├── lib/              # api.ts (typed fetch wrapper)
│           └── __tests__/        # Test setup (Vitest)
├── packages/
│   └── shared/
│       └── src/
│           ├── db/               # schema.ts (Drizzle), connection.ts (createDb)
│           ├── validators/       # auth.ts, user.ts, seller.ts (Zod)
│           └── utils/            # cn()
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Architecture

### Monorepo (pnpm + Turborepo)
Three workspace packages: `@dailypantry/shared`, `@dailypantry/backend`, `@dailypantry/frontend`. Turborepo orchestrates `dev`, `build`, `typecheck` with dependency awareness.

### Domain-Driven Design (Backend)
Each domain has 5 files: `model.ts` (types), `schema.ts` (Zod), `repository.ts` (Drizzle), `service.ts` (business logic), `controller.ts` (Hono sub-app). Controllers mount at `/api/<domain>`.

### Shared Package
`@dailypantry/shared` exports Drizzle schema + connection factory + Zod validators + utils. Consumed by both backend and frontend. Uses raw TS exports (no build step).

### DI Pattern
`dbMiddleware` creates one `createDb(c.env)` per request, stored in Hono context via `c.set("db")`. Controllers retrieve via `c.get("db")`. Standalone scripts (CLI, seed) use `createDb()` directly.

### Auth
Session-based with `dp_session` httpOnly cookie (30-day expiry). Opaque token (`crypto.randomUUID()`) stored in `sessions` table. `Bun.password.hash/verify` for password hashing.

## Key Modules

| Module | Location | Purpose | Owner |
|--------|----------|---------|-------|
| `packages/shared/src/db/` | Shared | Drizzle schema (users, roles, sessions), `createDb()` factory | Tyson |
| `packages/shared/src/validators/` | Shared | Zod schemas (login, register, user CRUD, seller profile) | Tyson |
| `apps/backend/src/auth/` | Backend | Login, register, session validation, logout | Tyson |
| `apps/backend/src/user/` | Backend | User list, create, activate/deactivate (office boy only) | Tyson |
| `apps/backend/src/seller/` | Backend | Seller profile CRUD (name, desc, QRIS base64) | Tyson |
| `apps/backend/src/middleware/` | Backend | Auth middleware (session check), DB middleware (DI) | Tyson |
| `apps/frontend/src/hooks/useAuth.tsx` | Frontend | AuthProvider, useLogin, useRegister, useLogout, useAuth | Nova |
| `apps/frontend/src/hooks/useUsers.ts` | Frontend | useUsers, useCreateUser, useUpdateUser, useRoles | Nova |
| `apps/frontend/src/hooks/useSeller.ts` | Frontend | useSellerProfile, useUpdateProfile | Nova |
| `apps/frontend/src/routes/` | Frontend | TanStack Router pages (login, register, dashboard, users, profile) | Nova |
| `apps/frontend/src/components/` | Frontend | Layout, ProtectedRoute, UserForm, SellerProfileForm, QRISUploader | Nova |

## Configuration

| File | Purpose |
|------|---------|
| `turbo.json` | Turborepo pipeline (dev, build, typecheck, lint) |
| `pnpm-workspace.yaml` | Workspace packages: `apps/*`, `packages/*` |
| `tsconfig.base.json` | Shared TS config (strict, ESNext, bundler) |
| `apps/backend/drizzle.config.ts` | Drizzle Kit config (Turso dialect, shared schema) |
| `apps/backend/.env.example` | TURSO_CONNECTION_URL, TURSO_AUTH_TOKEN, SESSION_SECRET |
| `apps/frontend/vite.config.ts` | Vite + React + PWA plugin, `/api` proxy |
| `apps/frontend/tailwind.config.ts` | Tailwind content paths, mobile-first breakpoints |
| `apps/frontend/vitest.config.ts` | Vitest config (jsdom, React plugin, shared alias) |

## Code Style

- **TypeScript:** 5.x+, `"strict": true` in tsconfig
- **Types:** No `any` — use `unknown` and narrow with Zod or type guards
- **Validation:** Zod schemas at every API boundary (never trust raw `req.body`)
- **Naming:** `camelCase` for variables/functions, `PascalCase` for types/interfaces/components, `UPPER_CASE` for constants
- **Formatting:** Prettier with consistent config
- **Modules:** ESM by default (`import`/`export`); avoid CJS unless the project requires it
- **Async:** `async`/`await` over raw Promises; no floating promises
- **Testing:** Vitest (preferred) or Jest; React Testing Library for components; Playwright for e2e
- **Error handling:** Typed error classes, never throw bare strings, never swallow errors

- **DDD:** Each domain gets 5 files. No cross-domain imports in repositories.
- **Zod at boundaries:** Every controller validates request body with Zod before touching services. No raw `req.body` casting.
- **No passwords in responses:** Services strip `password` before returning. Repositories explicitly destructure `const { password, ...safe } = row`.
- **Bun native APIs:** Use `Bun.password` for hashing, `Bun.randomUUIDv7` (backend), `crypto.randomUUID` (shared). No `bcryptjs`.
- **ReturnType pattern:** Repositories use `ReturnType<typeof createDb>` for DB type — avoids import cycle with shared package.
