# EduCore API

This directory contains the first backend boundary for EduCore. It is intentionally a modular TypeScript service using NestJS, Fastify, PostgreSQL, and Drizzle.

## Current slice

Slice 1 establishes:

- Strict server environment validation.
- A Fastify-backed NestJS application boundary.
- `/api/health/live` and `/api/health/ready` endpoints.
- Request IDs and typed request context.
- PostgreSQL/Drizzle schema for users, schools, memberships, roles, capabilities, sessions, and audit events.
- Capability and school-membership policy primitives.
- Opaque session-token generation and hashing primitives.
- Focused identity/tenancy policy tests.
- Tenant-scoped student and guardian schema with generated Drizzle migration.
- Authenticated student lifecycle API for create, read, update, approval, transfer, and withdrawal.
- Private development document storage with multipart upload, checksum validation, replacement, download, and deletion.
- Required-document verification before admission approval.
- Authenticated school setup read/write API for administrator onboarding progress and checklist persistence.
- Optional `SEED_SUPERADMIN_EMAIL` support plus platform school listing/approval endpoints for the superadmin dashboard.

Local PostgreSQL migration, administrator seed, API health, and seeded authentication have been verified. Production rollout still requires production object storage/scanning, authenticated migration/browser tests, and a secret-management process. No route should grant access based on a browser-selected role or a client-provided school ID.

Fresh-data development state: the local database has no seeded students, documents, or school setup rows. Operational records must be created through the authenticated API; frontend static constants are presentation placeholders only.

## Local commands

From the repository root:

```bash
cp apps/api/.env.example apps/api/.env
# Set SESSION_SECRET to a random value of at least 32 characters and replace SEED_ADMIN_PASSWORD.
npm run api:typecheck
npm run api:test
npm run api:db:generate
npm run api:db:seed
npm run api:student:test # student, document, and approval workflow smoke test
npm run api:dev
```

### Local PostgreSQL

The repository includes a PostgreSQL 16 Compose definition at the workspace root. This workspace currently has native PostgreSQL 18 installed and running on port 5432, so Docker is optional. Use the Compose path only when a separate local database is preferred:

```bash
docker compose up -d postgres
docker compose ps
npm run api:db:generate
npx drizzle-kit migrate --config apps/api/drizzle.config.ts
npm run api:db:seed
```

The default local connection is `postgres://postgres:postgres@localhost:5432/educore`. Do not use these development credentials outside local development.

For the installed native PostgreSQL service, set `DATABASE_URL` to a connection string containing the local `postgres` role password before running migrations. The password is intentionally not stored in this repository.

The API listens on port `4000` by default. The generated migration is stored in `apps/api/drizzle/migrations`.

## Security boundary

The API must derive school context from the authenticated session and active school membership. Client-provided IDs are input only and must be checked against the authenticated principal. Sensitive mutations must call the authorization service before entering a database transaction and must emit an audit event on both allowed and denied outcomes.
