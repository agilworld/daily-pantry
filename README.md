# Daily Pantry

Local-first employee meal ordering service. Employees order meals, sellers manage menus, and the office boy handles procurement — all in one PWA.

## Roles

| Role | Can do |
|------|--------|
| **Employee** | Order meals, join chat, view threads |
| **Seller** | Manage profile (name, desc, QRIS), manage meals, view orders, post in chat |
| **Office Boy** | Manage users (add/deactivate), manage meal categories, get date-based orders, post in chat |
| **Manager** | Oversee all operations |

## Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | React 19, TanStack Router v1, TanStack Query v5, Tailwind CSS 3, PWA |
| **Backend** | Bun.js, Hono.js, Drizzle ORM, DDD architecture |
| **Database** | Turso (libsql) |
| **Validation** | Zod (shared package) |
| **Build** | Vite, Turborepo, pnpm workspace |

## Project Structure

```
daily-pantry/
├── apps/
│   ├── backend/                  # Bun.js + Hono.js API server
│   │   └── src/
│   │       ├── auth/             # Auth domain (DDD: model, schema, repo, service, controller)
│   │       ├── user/             # User management domain
│   │       ├── seller/           # Seller profile domain
│   │       ├── middleware/       # Auth middleware, DB middleware
│   │       ├── cli/              # CLI scripts (register office boy)
│   │       ├── db/               # Seeders
│   │       └── types/            # Env bindings, Hono types
│   └── frontend/                 # React PWA
│       └── src/
│           ├── routes/           # TanStack Router pages (login, register, dashboard, users, profile)
│           ├── hooks/            # TanStack Query hooks (useAuth, useUsers, useSeller)
│           ├── components/       # Reusable UI (Layout, ProtectedRoute, forms)
│           └── lib/              # API client (fetch wrapper)
├── packages/
│   └── shared/                   # @dailypantry/shared
│       └── src/
│           ├── db/               # Drizzle schema + connection factory
│           ├── validators/       # Zod schemas (auth, user, seller)
│           └── utils/            # cn(), etc.
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) (runtime + test runner)
- [pnpm](https://pnpm.io) (package manager)
- [Turso](https://turso.tech) account (database)

### Setup

```bash
# Install dependencies
pnpm install

# Copy env file and fill in Turso credentials
cp .env.example apps/backend/.env
```

### Environment Variables

Create `apps/backend/.env`:

```env
TURSO_CONNECTION_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token
SESSION_SECRET=your-secret-key
PORT=3001
```

### Seed the database

```bash
# Push schema and seed roles
cd apps/backend
bun run db:seed
```

### Register an office boy (CLI)

```bash
cd apps/backend
bun run cli:register-ob --name "Boy" --email "boy@corp.com" --password "s3cret!"
```

### Start development

```bash
# From root (both backend + frontend)
pnpm dev

# Or individually
cd apps/backend && bun --hot src/serve.ts    # → http://localhost:3001
cd apps/frontend && npx vite                  # → http://localhost:3000
```

## Scripts

| Command | Location | Purpose |
|---------|----------|---------|
| `pnpm dev` | root | Start all apps via Turborepo |
| `pnpm typecheck` | root | Type-check all packages |
| `bun --hot src/serve.ts` | backend | Start dev server with hot reload |
| `bun run db:seed` | backend | Push schema + seed roles |
| `bun run cli:register-ob` | backend | Register office boy via CLI |
| `npx vite` | frontend | Start Vite dev server |
| `npx vitest run` | frontend | Run frontend tests |
| `npx tsc --noEmit` | any | Type-check a package |

## Running Tests

```bash
# Backend (Bun test runner — 18 tests)
cd apps/backend && bun test

# Frontend (Vitest — 11 tests)
cd apps/frontend && npx vitest run
```

## API Endpoints (Phase 1)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `POST` | `/api/auth/login` | No | — | Login, sets 30-day session cookie |
| `POST` | `/api/auth/register` | No | — | Register employee |
| `POST` | `/api/auth/logout` | Session | — | Logout, clears cookie |
| `GET` | `/api/auth/me` | Session | — | Get current user |
| `GET` | `/api/users` | Session | office_boy | List users (filter by role) |
| `POST` | `/api/users` | Session | office_boy | Create seller/employee |
| `PATCH` | `/api/users/:id` | Session | office_boy | Update user (activate/deactivate) |
| `GET` | `/api/users/roles` | Session | office_boy | List available roles |
| `GET` | `/api/sellers/profile` | Session | seller | Get seller profile |
| `PUT` | `/api/sellers/profile` | Session | seller | Update name, desc, QRIS |

## Architecture

### Domain-Driven Design (Backend)

Each domain follows a 5-file pattern:

```
src/<domain>/
├── model.ts        # TypeScript interfaces
├── schema.ts       # Zod validation schemas
├── repository.ts   # Drizzle ORM queries
├── service.ts      # Business logic
└── controller.ts   # Hono route handlers
```

### Shared Package

`@dailypantry/shared` is consumed by both backend and frontend:
- **Drizzle schema** — single source of truth for DB tables
- **Zod validators** — shared validation at every API boundary
- **DB connection** — `createDb(env)` factory for Turso/libsql

### DI Pattern

One DB client per request via Hono middleware (`dbMiddleware`). Injected via `c.get("db")` — no globals, easy to test.

## Phase 2 (planned)

- Meal catalog (categories, meals CRUD)
- Order management (employee ordering, office boy fulfillment)
- Chat rooms (seller ↔ office boy)
- File upload (QRIS to cloud storage)
- Web push notifications
- PWA offline support
- Email verification
- Password reset
