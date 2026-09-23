# RASOIOS — Restaurant SaaS Platform

Multi-tenant restaurant operations software: menu management, counter ordering, kitchen tickets, cloud-queued thermal printing and a public menu per restaurant. It is sold as a software licence. There are no subscription plans, and tenant membership (`USER_TENANT`) is authorization only.

- **Source of truth:** [`knowledge/README.md`](knowledge/README.md) (product, architecture, decisions, plan).
- **Current work:** SLICE-01, tracked in [`knowledge/implementation/slice-01/tasks.md`](knowledge/implementation/slice-01/tasks.md) in execution order.
- **Rules for contributors and AI agents:** [`CLAUDE.md`](CLAUDE.md).

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 24 (see `.nvmrc`) | `nvm use` or install Node 24 LTS |
| npm | 11+ | ships with Node 24 |
| PostgreSQL | 16 | via Docker (`docker-compose.yml`) or a native install |
| Clerk account | — | a **development** instance; never use production keys locally |

## First-time setup

1. **Install dependencies**

   ```bash
   npm ci
   ```

2. **Start PostgreSQL** (pick one)

   - **Embedded, no install** — runs PostgreSQL 16 from project binaries (`embedded-postgres`), data in `.local/postgres`:

     ```bash
     npm run db:local
     ```

     Leave it running in its own terminal; Ctrl+C stops it. Set `LOCAL_PG_PORT` if 5432 is taken.

   - **Docker Desktop:**

     ```bash
     docker compose up -d postgres
     ```

   - **Native install** — install PostgreSQL 16 and create a database named `rasoios_db`, then adjust `DATABASE_URL` in step 4.

   All three use the same credentials as `.env.example`.

3. **Create a Clerk development instance**

   - In the [Clerk dashboard](https://dashboard.clerk.com), create an application.
   - Under *User & authentication → Email*, enable **Email address** as an identifier and **Email verification code** as the sign-in method.
   - Turn **off** passwords and every social connection, and set *Restrictions → Sign-up mode* to **Restricted** (full checklist: `knowledge/implementation/slice-01/deployment.md` §11a).
   - Copy the publishable key (`pk_test_…`) and secret key (`sk_test_…`) from *API keys*.

4. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in every value. The server validates the environment when it starts (`lib/env.ts`) and refuses to boot while a value is missing, malformed or still a placeholder. The error names the variable and never prints its value. `.env` is gitignored; never commit it.

5. **Generate the Prisma client and apply the migrations**

   ```bash
   npm run prisma:gen
   npm run prisma:deploy
   ```

   Use `npm run prisma:migrate` only when you change `prisma/schema.prisma` (see `knowledge/database/migration-strategy.md`).

6. **Seed two test restaurants**

   ```bash
   npm run db:seed
   ```

   Creates *Spice Route* (Asia/Kolkata, INR) and *Harbour Grill* (America/New_York, USD) with staff for every role, menus, orders in every
   state, KOTs, payments and printers. Staff emails look like `spiceroute.cashier+clerk_test@example.com`; in a Clerk **development**
   instance, `+clerk_test` addresses sign in with the code **424242**. Set `SUPER_ADMIN_BOOTSTRAP_EMAIL` in `.env` before seeding to
   make your own email the platform administrator. Running the seed again adds nothing.

7. **Run the app**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 and sign in at `/sign-in` with an email address. Clerk sends the one-time code.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build` / `npm run start` | Production build / start (binds `PORT`) |
| `npm run lint` | ESLint, zero warnings allowed |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | All Vitest projects |
| `npm run test:unit` | Unit tests (`tests/unit`) |
| `npm run test:static` | Repository rule tests (`tests/static`): lint rules, CI gates, forbidden UI markers |
| `npm run test:integration` | Integration, tenant-isolation and adversarial tests against PostgreSQL (`tests/integration`) |
| `npm run test:e2e` | Playwright (desktop, tablet, mobile) with axe accessibility checks |
| `npm run prisma:gen` | Generate the Prisma client |
| `npm run prisma:migrate` | Create/apply migrations locally (`prisma migrate dev`) |
| `npm run prisma:deploy` | Apply committed migrations (CI, staging, production) |
| `npm run prisma:studio` | Browse the local database |
| `npm run db:seed` | Seed the two test restaurants (idempotent; refuses production) |
| `npm run db:local` | Run an embedded PostgreSQL 16 on localhost:5432 (data in `.local/postgres`) |

## Tests

- **Unit and static** tests need no database.
- **Integration** tests need `DATABASE_URL` pointing at a disposable database. CI uses a PostgreSQL 16 service container.
- **End-to-end** tests need Clerk development keys in `.env` and the Chromium browser:

  ```bash
  npx playwright install chromium
  npm run test:e2e
  ```

  Playwright starts its own dev server on port 3100. Set `PLAYWRIGHT_BASE_URL` to test an already running deployment instead.

## Continuous integration and deployment

- Every pull request runs `lint`, `typecheck`, `unit`, `static`, `integration`, `e2e`, `build` and `audit` (`.github/workflows/ci.yml`). All eight are to be required status checks on `main`; the repository owner configures this under branch protection ([`knowledge/operations/deployment.md`](knowledge/operations/deployment.md)).
- Pull requests use `.github/pull_request_template.md` (task IDs, tests, security checklist, dependency review).
- Deployment runs on Railway with config-as-code in `railway.json`. See [`knowledge/operations/railway.md`](knowledge/operations/railway.md) and [`knowledge/implementation/slice-01/deployment.md`](knowledge/implementation/slice-01/deployment.md).

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `npm run prisma:gen` fails with `EPERM … query_engine-windows.dll.node` (Windows) | A running `next dev` process has the Prisma engine loaded. Stop every dev server for this project, then generate again. |
| The server exits at start with `Invalid server environment` | A variable in `.env` is missing, malformed or a placeholder. The message lists which one. |
| `Can't reach database server at localhost:5432` | PostgreSQL is not running. Run `npm run db:local` (or `docker compose up -d postgres`, or start your local service). |
| `npm run db:local` fails with `Postgres init script failed` | The `.local/postgres` folder is half-created. Delete it and run the command again. |
| `npm run test:e2e` fails at `clerk-setup` | Clerk keys are missing from `.env`, or they belong to a production instance. |
| `EINVAL: invalid argument, readlink '.next\…'`, or `__webpack_modules__[moduleId] is not a function` on first page load | The project is inside a OneDrive folder: OneDrive turns `.next` files into online-only placeholders and interrupts webpack cache writes. Rename `.next` (e.g. `.next-stale-1`), rerun, and mark the project folder **Always keep on this device** — or move the project outside OneDrive. |
| Integration tests say `refuse to create databases` | `DATABASE_URL` points at a non-local server. Use `npm run db:local`, or set `ALLOW_REMOTE_TEST_DATABASE=1` only for a disposable server. |
