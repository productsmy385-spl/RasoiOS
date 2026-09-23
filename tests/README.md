# Tests

Layers and commands (details in `knowledge/implementation/slice-01/testing.md`):

| Folder | Project | Command | Needs |
|---|---|---|---|
| `tests/unit` | `unit` | `npm run test:unit` | nothing |
| `tests/static` | `static` | `npm run test:static` | nothing (reads the repository) |
| `tests/integration` | `integration` | `npm run test:integration` | PostgreSQL via `DATABASE_URL` (`npm run db:local`) |
| `tests/e2e` | Playwright | `npm run test:e2e` | Clerk development keys in `.env` |

## Integration harness (S1-P02-T008)

- `setup/global-setup.ts` creates a run-scoped template database `rasoios_it_<run>` on the `DATABASE_URL` server, applies
  the real migrations with `prisma migrate deploy`, and drops every database of the run afterwards.
- `setup/worker-database.ts` gives each Vitest worker its own copy (`…_w<n>`) and points `DATABASE_URL` at it before the test
  file's imports run, so `lib/db/prisma` and `testDb()` both use the worker's database.
- It only creates databases on `localhost` / `127.0.0.1` / `postgres` (the CI service), unless `ALLOW_REMOTE_TEST_DATABASE=1`.
- `setup/db.ts`: `testDb()`, `resetDatabase()` (TRUNCATE all application tables), `withRollback()`, `sqlState()`, `freezeTime()`.
- `tests/factories`: one factory per entity, `createTenantPair()` (Tenant A and Tenant B with identical content names) and
  `createFullTenant()` (a row in every tenant-owned table with every optional tenant FK set).

## No Prisma mocks

The baseline unit tests that replaced the database with `vi.mock("@/lib/db/prisma")` were all deleted in the
S1-P04-T007 retrofit (2026-09-22) and replaced by integration tests against real PostgreSQL (`integration/orders`,
`integration/kitchen`, `integration/money`, `integration/menu`, `integration/printing`, `integration/social`,
`integration/reports`, `integration/settings`, `integration/platform`, `integration/public`).
New tests for data access must use the integration harness, not Prisma mocks.
