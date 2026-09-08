# Hisab Backend

REST API for the Hisab split-bill application. Built with TypeScript, Node.js, Express, and PostgreSQL.

## Stack

- **Runtime:** Node.js >= 18
- **Language:** TypeScript (strict mode)
- **Framework:** Express.js v4
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Validation:** Zod
- **Testing:** Vitest + Supertest
- **Linting:** ESLint + Prettier

## Directory Structure

```
backend/
├── prisma/
│   ├── schema.prisma             # Prisma schema (PostgreSQL, all entities)
│   └── migrations/               # Version-controlled migration files
├── src/
│   ├── config/
│   │   └── env.ts                # Zod-validated environment config
│   ├── constants/
│   │   ├── app-errors.ts         # Application error code names
│   │   └── http-statuses.ts      # HTTP status code enum (meaningful names)
│   ├── db/
│   │   └── prisma.ts             # Centralized Prisma client & DB utilities
│   ├── errors/
│   │   └── app.error.ts          # Base AppError + specialized error classes
│   ├── middleware/
│   │   ├── authenticate.ts       # JWT bearer-token auth for protected routes
│   │   ├── errorHandler.ts       # Centralized error handling + 404
│   │   ├── rateLimiter.ts        # API rate limiting (general + auth tiers)
│   │   └── validate.ts           # Zod validation middleware
│   ├── modules/
│   │   ├── auth/                 # Authentication feature module
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.service.ts
│   │   │   └── validators.ts
│   │   └── groups/               # Groups & membership feature module
│   │       ├── group.controller.ts
│   │       ├── group.repository.ts
│   │       ├── group.routes.ts
│   │       ├── group.service.ts
│   │       └── validators.ts
│   │   └── expenses/              # Expenses & split calculation feature module
│   │       ├── expense.controller.ts
│   │       ├── expense.repository.ts
│   │       ├── expense.routes.ts
│   │       ├── expense.service.ts
│   │       ├── split.util.ts      # Pure EQUAL/EXACT split calculation helpers
│   │       └── validators.ts
│   │   └── settlements/           # Balance calculation & settlement feature module
│   │       ├── balance.util.ts    # Pure BIGINT balance calculation helpers
│   │       ├── settlement.controller.ts
│   │       ├── settlement.repository.ts
│   │       ├── settlement.routes.ts
│   │       ├── settlement.service.ts
│   │       └── validators.ts
│   │   ├── idempotency/           # Idempotency protection for financial operations
│   │       ├── validate.ts        # Idempotency-Key header validation middleware
│   │       ├── reconcile.ts       # Idempotency record state reconciliation
│   │       ├── request-hash.ts    # Deterministic SHA-256 request fingerprint
│   │       └── idempotency.constants.ts
│   │   └── activity/              # Activity feed & audit event feature module
│   │       ├── activity.controller.ts
│   │       ├── activity.repository.ts
│   │       ├── activity.service.ts
│   │       └── validators.ts
│   ├── routes/
│   │   ├── health.ts             # GET /health, GET /health/ready
│   │   ├── index.ts              # /api/v1 router
│   │   └── v1/index.ts           # Mounts feature modules (auth, groups, expenses, settlements, ...)
│   ├── types/
│   │   └── index.ts              # Shared TypeScript types
│   ├── utils/
│   │   ├── asyncHandler.ts       # Wraps async controllers to forward errors
│   │   └── logger.ts             # Lightweight structured JSON logger
│   ├── app.ts                    # Express application (testable standalone)
│   └── server.ts                 # Server startup: DB connect + graceful shutdown
├── tests/
│   ├── setup.ts                  # Test setup (env config, silent logger)
│   ├── app.test.ts               # Application + health + 404 tests
│   ├── auth.api.test.ts          # Auth endpoint integration tests (mocked DB)
│   ├── auth.service.test.ts      # Auth service unit tests (mocked repository)
│   ├── groups.api.test.ts        # Group endpoint integration tests (mocked DB)
│   ├── groups.service.test.ts    # Group service unit tests (mocked repository)
│   ├── expenses.api.test.ts      # Expense endpoint integration tests (mocked DB)
│   ├── expenses.service.test.ts  # Expense service unit tests (mocked repository)
│   ├── split.util.test.ts        # Split calculation unit tests
│   ├── settlement.api.test.ts    # Balance & settlement endpoint integration tests (mocked DB)
│   ├── settlement.service.test.ts# Balance & settlement service unit tests (mocked repository)
│   ├── settlement.repository.test.ts # Settlement idempotency transaction tests (mocked DB)
│   ├── idempotency.test.ts        # Request-hash and reconciliation unit tests
│   ├── activity.api.test.ts      # Activity endpoint integration tests (mocked DB)
│   ├── activity.service.test.ts  # Activity service unit tests (mocked repository)
│   ├── activity.creation.test.ts # Activity event creation tests (mocked repositories)
│   ├── activity.transaction.test.ts # Activity transactional-consistency tests (mocked DB)
│   ├── balance.util.test.ts      # Balance calculation unit tests
│   ├── config.test.ts            # Configuration validation tests
│   ├── errors.test.ts            # Error class unit tests
│   ├── asyncHandler.test.ts      # Async handler middleware tests
│   ├── health.test.ts            # Readiness endpoint tests (mocked DB)
│   └── middleware.test.ts        # Validation middleware tests
│   └── rate-limit.test.ts        # Rate limiting tests (envelope, headers, window reset, per-IP isolation)
├── .env.example
├── .gitignore
├── eslint.config.js
├── prettier.config.js
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Prerequisites

- Node.js >= 18
- PostgreSQL (required for database features and migrations)
- npm

## Installation

```bash
cd backend
npm install
```

## Environment Configuration

Copy `.env.example` to `.env` and configure. **Never commit your `.env` file or real PostgreSQL credentials.**

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `PORT` | No | `3000` | HTTP server port |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (format: `postgresql://user:password@host:port/dbname`) |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origin |
| `JWT_SECRET` | Yes | — | Secret used to sign JSON Web Tokens. Generate a strong random value and never commit it. |
| `JWT_EXPIRES_IN` | No | `7d` | Access token lifetime (e.g. `7d`, `1h`) |
| `REFRESH_TOKEN_TTL_DAYS` | No | `30` | Refresh-token session lifetime in days |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate-limit window length in milliseconds (15 minutes) |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per client IP per window for non-auth endpoints |
| `AUTH_RATE_LIMIT_MAX` | No | `20` | Max requests per client IP per window for `/api/v1/auth/*` |

### Setting Up Your Local Database

1. Create a PostgreSQL database (the name in `DATABASE_URL` must exist):

   ```sql
   CREATE DATABASE splitease;
   ```

2. Copy `.env.example` to `.env` and replace the `DATABASE_URL` with your real local PostgreSQL credentials.

3. Run migrations to create the schema:

   ```bash
   npm run db:migrate:dev
   ```

4. Generate the Prisma Client:

   ```bash
   npm run db:generate
   ```

## Available Scripts

```bash
npm run dev              # Start development server with hot-reload
npm run build            # Compile TypeScript to dist/
npm start                # Run compiled server from dist/
npm test                 # Run test suite (Vitest)
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint with auto-fix
npm run format           # Format code with Prettier
npm run format:check     # Check formatting without modifying
npm run typecheck        # Type-check without emitting
npm run db:generate      # Generate Prisma Client from schema
npm run db:migrate       # Apply pending migrations (production/deploy)
npm run db:migrate:dev   # Create/apply migrations (development)
npm run db:studio        # Open Prisma Studio (GUI for data inspection)
npm run db:validate      # Validate the Prisma schema
```

## Health Endpoints

```
GET /health
```
Liveness check. Always returns 200 if the server is running (no DB required).

```json
{ "status": "ok" }
```

```
GET /health/ready
```
Readiness check. Verifies database connectivity.

- `200 { "status": "ready" }` — database is reachable
- `503 { "status": "unavailable", "message": "Service is not ready yet." }` — database is unreachable

## Request Tracing

Every HTTP request receives a **request/correlation ID** so calls can be traced
through logs and matched to responses.

- Each response includes the header:

  ```
  X-Request-Id: <request-id>
  ```

- When the client does **not** send an `X-Request-Id`, the server generates a
  cryptographically strong **UUID v4** and returns it in the response header.
- A client may supply its own safe tracing ID (≤128 characters, containing only
  letters, digits, `-`, `_`, and `.`) via the `X-Request-Id` header; it is echoed
  back when valid. Oversized, malformed, or control-character values are rejected
  and replaced with a newly generated UUID.
- The ID is attached to every request as `req.requestId` and is included in
  centralized request-completion logs (`requestId`, `method`, `path`,
  `statusCode`, `durationMs`).
- Request IDs are **tracing identifiers only** — they are never used for
  authentication or authorization, and they are present (via the response header)
  on success and error responses alike, including 401/403/404/500 flows.
- Request-completion logging never includes authorization headers, tokens,
  cookies, request/response bodies, or other sensitive data.

## Error Handling

All errors are returned in a consistent format:

```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

Validation errors include field-level detail:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email" }
  ]
}
```

Internal stack traces are never exposed in production responses.

HTTP status codes use the `HTTP_STATUSES` enum (`src/constants/http-statuses.ts`) for self-documenting, maintainable code.

## Rate Limiting

All `/api/v1` requests are rate-limited per client IP to protect the API against
abuse (brute-force login attempts, scraping, and runaway clients). Implemented
with `express-rate-limit` in `src/middleware/rateLimiter.ts`.

Two tiers with independent counters:

| Tier | Mount | Default limit per window |
|---|---|---|
| General | all `/api/v1` endpoints | `RATE_LIMIT_MAX` (100) |
| Auth | `/api/v1/auth/*` | `AUTH_RATE_LIMIT_MAX` (20) |

The window length is controlled by `RATE_LIMIT_WINDOW_MS` (default `900000` ms =
15 minutes). Auth routes first pass the global limiter and then the stricter auth
limiter, so they are subject to both counters.

- Exceeding the limit returns **HTTP 429** with the standard API error envelope:
  `{ "success": false, "message": "Too many requests" }` and a `Retry-After`
  header.
- Responses include standard `RateLimit-*` headers (`RateLimit-Policy`,
  `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`) so clients can
  honor the limits proactively.
- The default store is **in-memory and process-local** (no Redis dependency).
  Counters are scoped per server instance and reset on restart; for horizontal
  scaling behind a load balancer, replace the store with a shared one (e.g.
  `rate-limit-redis`).
- The client identity is `req.ip`. The app intentionally does **not** trust
  `X-Forwarded-For` (`trust proxy` is off), so behind a reverse proxy the proxy's
  IP is the identity seen by the API. Configure the app's proxy trust settings if
  real client IPs are required in deployment.
- The limiter makes **no database queries**, so a target cannot bypass limits by
  hammering the database, and it never races against idempotency.
- Limits are configurable via environment variables, see
  [Environment Configuration](#environment-configuration).

## API Structure

All feature endpoints are mounted under `/api/v1`:

- `/api/v1/auth` — Authentication (register, login, refresh, logout, current user)
- `/api/v1/users` — User management (not yet implemented)
- `/api/v1/groups` — Group management & membership
- `/api/v1/expenses` — Expense tracking & split calculation
- `/api/v1/settlements` — Settlement recording & balance calculation
- `/api/v1/groups/:groupId/activity` — Group activity feed & audit events

## Authentication API

Authentication endpoints live under `/api/v1/auth`.

### POST /api/v1/auth/register

Registers a new user and returns an access token plus a refresh token.

Request body:

```json
{
  "name": "Ahmed Raza",
  "email": "ahmed@example.com",
  "password": "password123"
}
```

- `name` — required, non-empty string
- `email` — required, valid email
- `password` — required, at least 8 characters

- `201` — user created; returns `{ success, data: { user, token, refreshToken } }`
- `409` — an account with this email already exists
- `400` — validation failed

Response (201):

```json
{
  "success": true,
  "data": {
    "user": { "id": "<uuid>", "name": "Ahmed Raza", "email": "ahmed@example.com" },
    "token": "<jwt>",
    "refreshToken": "<opaque-refresh-token>"
  }
}
```

> The user object never includes `passwordHash` or `password`. Passwords are
> hashed with **bcrypt** (12 rounds) before storage. The refresh token is only
> returned once — only its SHA-256 hash is persisted.

### POST /api/v1/auth/login

Signs in an existing user and returns an access token plus a refresh token.

Request body:

```json
{
  "email": "ahmed@example.com",
  "password": "password123"
}
```

- `200` — success; returns `{ success, data: { user, token, refreshToken } }`
- `401` — invalid email or password
- `400` — validation failed

### POST /api/v1/auth/refresh

Exchanges a valid refresh token for a new access token and a rotated refresh
token in a single atomic session rotation. The presented refresh token is
immediately revoked.

Request body:

```json
{
  "refreshToken": "<opaque-refresh-token>"
}
```

- `200` — success; returns `{ success, data: { user, token, refreshToken } }`
- `400` — missing, empty, or unexpected fields
- `401` — invalid, expired, revoked, or already-rotated refresh token

> Authentication failures use a single generic `REFRESH_TOKEN_INVALID` code so
> the response never reveals whether a specific refresh-token record exists.
> Reusing a rotated/revoked token is rejected; sessions are rotated atomically.

### POST /api/v1/auth/logout

Revokes the session identified by the presented refresh token. Idempotent:
calling logout with an unknown, expired, or already-revoked token still returns
success and changes nothing.

Request body:

```json
{
  "refreshToken": "<opaque-refresh-token>"
}
```

- `200` — success; returns `{ success, data: { message } }`
- `400` — missing, empty, or unexpected fields

> Logout revokes only the session whose refresh token is presented. It never
> accepts a user id, so one user's session cannot be revoked without holding its
> own refresh credential.

### GET /api/v1/auth/me

Returns the currently authenticated user. Requires a `Bearer` token.

Request header:

```
Authorization: Bearer <jwt>
```

- `200` — success; returns `{ success, data: { user } }`
- `401` — missing, malformed, invalid, or expired token
- `404` — the authenticated user no longer exists

### Authentication Internals

- Access tokens are **JWT** signed with the configured `JWT_SECRET` and expire
  after `JWT_EXPIRES_IN`.
- Refresh tokens are **opaque, high-entropy random strings** (256 bits) returned
  to the client only at issuance time and persisted as **SHA-256 hashes** in the
  `RefreshToken` table (`tokenHash` is unique). Neither the raw token nor its
  hash is ever logged or returned.
- Refresh sessions expire after `REFRESH_TOKEN_TTL_DAYS`; a record's `revokedAt`
  marks an invalidated or rotated session.
- Refresh tokens are **rotated on every refresh** inside a single Prisma
  transaction: the old session is conditionally revoked (`revokedAt: null` guard)
  and its replacement is persisted atomically, making replay of an already-rotated
  token fail safely even under concurrency.
- The `authenticate` middleware (`src/middleware/authenticate.ts`) validates the
  `Authorization: Bearer` header on protected routes and attaches `req.userId`.
- Passwords are never stored in plaintext and never returned to clients.
- Application error codes live in `src/constants/app-errors.ts`, and domain
  errors are thrown as `AppError` subclasses (`src/errors/app.error.ts`) carrying
  an HTTP status and machine-readable code. The centralized error handler
  serializes them into consistent responses without leaking internals.

## Groups API

Group and membership endpoints live under `/api/v1/groups`. Every group endpoint
requires authentication via the `Authorization: Bearer <jwt>` header.

### Authorization Model

- **Owner** (the user who created the group, `group.createdById`) may update the
  group name, delete the group, and add/remove members.
- **Members** (users with a `GroupMember` record) may view the group detail and
  member list, and list the group in their own group list.
- **Non-members** may not view group details; they receive HTTP 403.
- The group owner is automatically the first member and cannot be removed.

### POST /api/v1/groups

Creates a new group. The authenticated user becomes the owner and is
automatically added as the first member in a single database transaction.

Request body:

```json
{
  "name": "Trip to Naran"
}
```

- `name` — required, non-empty string (trimmed)

- `201` — group created; returns `{ success, data: { group } }`
- `400` — validation failed
- `401` — missing/invalid token

Response (201):

```json
{
  "success": true,
  "data": {
    "group": {
      "id": "<uuid>",
      "name": "Trip to Naran",
      "createdById": "<owner-uuid>",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

### GET /api/v1/groups

Lists all groups the authenticated user is a member of, including the member count.

- `200` — returns `{ success, data: { groups } }`; an empty array when the user has no groups
- `401` — missing/invalid token

Response (200):

```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "id": "<uuid>",
        "name": "Trip to Naran",
        "createdById": "<owner-uuid>",
        "memberCount": 5,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  }
}
```

### GET /api/v1/groups/:id

Returns group details and the full member list. The authenticated user must be a member.

- `200` — returns `{ success, data: { group } }`
- `401` — missing/invalid token
- `403` — authenticated user is not a member
- `404` — group does not exist

Response (200):

```json
{
  "success": true,
  "data": {
    "group": {
      "id": "<uuid>",
      "name": "Trip to Naran",
      "createdById": "<owner-uuid>",
      "createdAt": "...",
      "updatedAt": "...",
      "members": [
        { "id": "<uuid>", "name": "Ahmed Raza", "email": "ahmed@example.com" }
      ]
    }
  }
}
```

> Only the member's `id`, `name`, and `email` are returned — never a password hash
> or other sensitive authentication data.

### PUT /api/v1/groups/:id

Updates the group name. The authenticated user must be the owner.

Request body:

```json
{
  "name": "Updated Name"
}
```

- `200` — group updated; returns `{ success, data: { group } }`
- `400` — validation failed
- `401` — missing/invalid token
- `403` — authenticated user is not the owner
- `404` — group does not exist

### DELETE /api/v1/groups/:id

Deletes the group. The authenticated user must be the owner. Related records
(memberships, expenses, settlements, activities) are removed by the existing
Prisma cascade relationships.

- `204` — group deleted (no response body)
- `401` — missing/invalid token
- `403` — authenticated user is not the owner
- `404` — group does not exist

### POST /api/v1/groups/:id/members

Adds a member to the group. The authenticated user must be the owner.

Request body:

```json
{
  "userId": "<target-user-uuid>"
}
```

- `201` — member added; returns `{ success, data: { member } }`
- `400` — validation failed
- `401` — missing/invalid token
- `403` — authenticated user is not the owner
- `404` — group or target user does not exist
- `409` — target user is already a member

### DELETE /api/v1/groups/:id/members/:memberId

Removes a member from the group. The authenticated user must be the owner. The
owner cannot be removed.

- `204` — member removed (no response body)
- `401` — missing/invalid token
- `403` — authenticated user is not the owner
- `404` — group or member does not exist
- `409` — attempting to remove the group owner

### Groups Internals

The groups module lives under `src/modules/groups/` and follows the same layered
architecture as `auth`: routes → controller → service → repository → Prisma. The
service owns authorization (ownership and membership checks) and throws grouped
`AppError` subclasses (`ForbiddenError`, `NotFoundError`, `ConflictError`) that
the centralized error handler serializes.

## Expenses API

Expense endpoints live under `/api/v1/groups/:groupId/expenses` and
`/api/v1/expenses`. Every expense endpoint requires authentication via the
`Authorization: Bearer <jwt>` header.

### Authorization Model

- Any **group member** may create an expense in the group, list the group's
  expenses, and view an individual expense.
- The **payer** (who paid for the expense) must be a member of the same group.
- Every **split participant** must be a member of the same group — arbitrary
  users outside the group cannot appear in a split.
- **Non-members** (or members of another group) cannot create, list, or view the
  group's expenses; they receive HTTP 403.

### Money Representation

All amounts are expressed as **integer minor units** (e.g. paisa for PKR), stored
as `BigInt` in the database — see [Money Representation](#money-representation).
The API accepts and returns whole-number minor units and never uses
floating-point arithmetic for split calculations.

### POST /api/v1/groups/:groupId/expenses

Creates an expense and its `ExpenseSplit` records inside a single database
transaction. The authenticated requester must be a member of the group.

Request body:

```json
{
  "description": "Dinner",
  "amountMinorUnits": 1000,
  "payerId": "<member-uuid>",
  "splitType": "EQUAL",
  "participants": [
    { "userId": "<member-uuid>" },
    { "userId": "<member-uuid>" },
    { "userId": "<member-uuid>" }
  ],
  "expenseDate": "2026-01-01T00:00:00.000Z"
}
```

Fields:
- `description` — required, non-empty string (trimmed)
- `amountMinorUnits` — required, positive integer minor units
- `payerId` — required, must be a member of the group
- `splitType` — required, `EQUAL` or `EXACT`
- `participants` — required, non-empty array of member user IDs; each user must
  be a group member and appear at most once
- `expenseDate` — optional RFC-3339 date, defaults to the server time

**EQUAL:** the total is divided into equal shares; any smallest-unit remainder is
assigned one extra minor unit to the first participants, so the shares always sum
to the total exactly (e.g. `1000` across 3 → `334`, `333`, `333`).

**EXACT:** each participant must provide an `amountMinorUnits`; the provided
amounts must sum to the expense total exactly.

- `201` — expense created; returns `{ success, data: { expense } }` with splits
- `400` — validation failed, duplicate participant, or EXACT split total mismatch
- `401` — missing/invalid token
- `403` — requester, payer, or a split participant is not a group member
- `404` — group does not exist

### GET /api/v1/groups/:groupId/expenses

Lists the expenses belonging to a group, newest first, including the payer and a
split count. The authenticated requester must be a member of the group.

- `200` — returns `{ success, data: { expenses } }`; empty array when the group has none
- `401` — missing/invalid token
- `403` — authenticated user is not a member
- `404` — group does not exist

### GET /api/v1/expenses/:id

Returns a single expense with its full split details (including each
participant's `id`, `name`, and `email`). The authenticated requester must be a
member of the group the expense belongs to.

- `200` — returns `{ success, data: { expense } }`
- `401` — missing/invalid token
- `403` — authenticated user is not a member of the expense's group
- `404` — expense does not exist

### Expenses Internals

The expenses module lives under `src/modules/expenses/` and follows the same
layered architecture as `auth` and `groups`. The split math is factored into a
pure, deterministic module (`split.util.ts`) that is unit-tested directly. The
service owns validation of group/payer/participant membership and split
reconciliation, and throws grouped `AppError` subclasses (`BadRequestError`,
`ForbiddenError`, `NotFoundError`) that the centralized error handler serializes.

## Balances & Settlements API

Balance and settlement endpoints live under `/api/v1/groups/:groupId/balances`,
`/api/v1/groups/:groupId/settlements`, and `/api/v1/settlements`. Every endpoint
requires authentication via the `Authorization: Bearer <jwt>` header.

### Authorization Model

- Any **group member** may view group balances, list the group's settlements,
  record a settlement, and view an individual settlement.
- The settlement **sender** (`payerId`) and **receiver** (`payeeId`) must be
  members of the same group.
- **Non-members** (or members of another group) receive HTTP 403, preventing
  cross-group data access.

### Money Representation

All balances and settlement amounts use the same integer **minor units** as
expenses (see [Money Representation](#money-representation)). Balance math is
pure `BigInt` arithmetic — no floating-point values are ever produced.

### GET /api/v1/groups/:groupId/balances

Returns each member's net balance for the group, derived at request time from the
group's expenses, splits, and settlements (no persisted balance column). A
positive balance is a net credit (owed by the group); a negative balance is a net
debt. The authenticated requester must be a member.

- `200` — returns `{ success, data: { balances } }`
- `401` — missing/invalid token
- `403` — authenticated user is not a member
- `404` — group does not exist

Response examples:

```json
{
  "success": true,
  "data": {
    "balances": [
      { "userId": "<alice-uuid>", "name": "Alice", "email": "alice@example.com", "amountMinorUnits": 160 },
      { "userId": "<bob-uuid>", "name": "Bob", "email": "bob@example.com", "amountMinorUnits": -60 },
      { "userId": "<owner-uuid>", "name": "Owner", "email": "owner@example.com", "amountMinorUnits": -100 }
    ]
  }
}
```

> The sum of all `amountMinorUnits` values always equals zero. Only each member's
> `id`, `name`, and `email` are returned — never a password hash or other secret.

### POST /api/v1/groups/:groupId/settlements

Records a payment from one group member (sender) to another (receiver) to settle
debts. The authenticated requester must be a group member.

This operation is **idempotency-protected**: every request must carry an
`Idempotency-Key` header so that retries can never create duplicate settlements.
See [Idempotency](#idempotency).

Request header:

```
Idempotency-Key: <unique-key>
```

Request body:

```json
{
  "payerId": "<sender-uuid>",
  "payeeId": "<receiver-uuid>",
  "amountMinorUnits": 500
}
```

Fields:
- `payerId` — required, sender must be a group member
- `payeeId` — required, receiver must be a group member and different from `payerId`
- `amountMinorUnits` — required, positive integer minor units

- `201` — settlement created; returns `{ success, data: { settlement } }`. A retry
  with the same key and body returns the original settlement instead of creating
  a duplicate.
- `400` — validation failed, sender equals receiver, or the `Idempotency-Key`
  header is missing/invalid
- `401` — missing/invalid token
- `403` — requester, sender, or receiver is not a group member
- `404` — group does not exist
- `409` — the same `Idempotency-Key` was already used with a different request or
  by a different user, or a request with this key is already being processed

### GET /api/v1/groups/:groupId/settlements

Lists the settlements belonging to a group (newest first), including the sender
and receiver. The authenticated requester must be a member.

- `200` — returns `{ success, data: { settlements } }`; empty array when the group has none
- `401` — missing/invalid token
- `403` — authenticated user is not a member
- `404` — group does not exist

### GET /api/v1/settlements/:id

Returns a single settlement with its sender and receiver. The authenticated
requester must be a member of the group the settlement belongs to.

- `200` — returns `{ success, data: { settlement } }`
- `401` — missing/invalid token
- `403` — authenticated user is not a member of the settlement's group
- `404` — settlement does not exist

### Balances & Settlements Internals

The module lives under `src/modules/settlements/` and follows the same layered
architecture as `auth`, `groups`, and `expenses`. The balance math is factored
into a pure, deterministic module (`balance.util.ts`) that is unit-tested
directly. The service owns membership authorization and throws grouped `AppError`
subclasses (`BadRequestError`, `ForbiddenError`, `NotFoundError`) that the
centralized error handler serializes. Settlement creation claims and completes
an idempotency record inside the same Prisma transaction that records the
settlement, so duplicate requests can never produce duplicate financial records.

## Idempotency

State-changing financial operations are protected against duplicate processing
caused by client retries. The mechanism is persistent (backed by the
`IdempotencyRecord` table), enforced at the database level, and transactional —
it does not rely on in-memory state, so it remains correct across restarts and
multiple server instances.

### Supported Endpoints

| Endpoint | Idempotency |
|---|---|
| `POST /api/v1/groups/:groupId/settlements` | Required `Idempotency-Key` header |

### Providing an Idempotency-Key

Send a unique key in the request header for each logical operation:

```
POST /api/v1/groups/:groupId/settlements
Authorization: Bearer <jwt>
Idempotency-Key: 9f8e7d6c5b4a39281706
Content-Type: application/json

{
  "payerId": "<sender-uuid>",
  "payeeId": "<receiver-uuid>",
  "amountMinorUnits": 500
}
```

The key must be 8–128 characters long and may contain only letters, digits,
`_`, `-`, and `.` (UUIDs work well). The same key must be reused for every
retry of the same logical request and **must never be reused for a different
request**.

The key is treated as request metadata for duplicate detection, never as a
financial or business field, and is never returned in responses or logged.

### Retry Semantics

- **First request:** the settlement is created and the key is recorded.
- **Retry with the same key and the same body:** no new settlement is created;
  the original settlement is returned.
- **Retry with the same key but a different body:** rejected with HTTP 409.
- **Reuse of a key issued to a different user:** rejected with HTTP 409.
- **Two concurrent requests using the same key:** the database's unique
  constraint guarantees that only one settlement is created; the losing request
  receives the original result.
- **Failed operation:** the idempotency record and the settlement are written in
  one transaction, so a failure rolls back both and a legitimate retry succeeds.

### Key Lifetime

Idempotency records expire 24 hours after first use. Expired keys are reclaimed
and can be reused for a new operation. No automatic cleanup job is required for
correctness; a background sweep that removes records where `expiresAt` is in the
past can be introduced later for storage hygiene.

## Activity API

Activity endpoints live under `/api/v1/groups/:groupId/activity`. Every activity
endpoint requires authentication via the `Authorization: Bearer <jwt>` header.

### Purpose

Activity events form a historical, auditable record of meaningful actions within
a group (group creation, members added, expenses added, settlements recorded).
They are **not** the source of truth for financial calculation. Balances remain
derived from expenses, splits, and settlements only.

### Authorization Model

- Any **group member** may view the group's activity feed.
- **Non-members** (or members of another group) receive HTTP 403, preventing
  cross-group activity access / IDOR.
- Activity event actors are always recorded from the authenticated requester
  (`req.userId`), never from request-body fields.

### GET /api/v1/groups/:groupId/activity

Returns a paginated list of the group's activity events, newest first. The
authenticated requester must be a member of the group.

Query parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number, 1-based |
| `limit` | integer | `20` | Events per page, `1`–`50` |

- `200` — returns `{ success, data: { events }, pagination }`
- `400` — validation failed (invalid page/limit, excessive limit, or unknown parameters)
- `401` — missing/invalid token
- `403` — authenticated user is not a member
- `404` — group does not exist

Response (200):

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "<uuid>",
        "groupId": "<group-uuid>",
        "userId": "<actor-uuid>",
        "type": "EXPENSE_ADDED",
        "message": "added the expense \"Dinner\"",
        "amountMinorUnits": 1000,
        "currencyCode": "PKR",
        "occurredAt": "...",
        "createdAt": "...",
        "user": { "id": "<uuid>", "name": "Ahmed Raza", "email": "ahmed@example.com" }
      }
    ]
  },
  "pagination": { "page": 1, "limit": 20, "total": 12 }
}
```

Supported `type` values: `GROUP_CREATED`, `MEMBER_ADDED`, `EXPENSE_ADDED`,
`SETTLEMENT_ADDED`. Events are filtered by `groupId` and paginated at the
database level; only the actor's `id`, `name`, and `email` are returned — never
a password hash or other sensitive authentication data.

### Activity Internals

The module lives under `src/modules/activity/` and follows the same layered
architecture as the other modules. Activity reads go through
`ActivityService.getGroupActivity` with database-level filtering, ordering, and
pagination. Activity writes are emitted inside the *same* Prisma transactions as
the domain operations that produce them (group creation, member add, expense
creation, settlement creation), so a domain record can never be committed
without its corresponding activity event.

## Database Schema

The Prisma schema is located at `prisma/schema.prisma` and uses PostgreSQL as the datasource provider.

### Entities

| Entity | Description |
|---|---|
| `User` | Application user with email (unique), name, optional passwordHash for future auth |
| `Group` | A bill-splitting group (e.g., "Trip to Naran", "Roommates") |
| `GroupMember` | Many-to-many relationship between Users and Groups; unique on (groupId, userId) |
| `Expense` | An expense paid by one user within a group, with a split type (EQUAL or EXACT) |
| `ExpenseSplit` | A user's share of an expense, stored as exact minor-unit amounts |
| `Settlement` | A payment recorded from one user to another to settle debts |
| `ActivityEvent` | Activity feed entry capturing expenses, settlements, group events |
| `RefreshToken` | JWT refresh token hash for future auth session management |
| `IdempotencyRecord` | Persistent idempotency deduplication for financial operations |

### Enums

| Enum | Values |
|---|---|
| `SplitType` | `EQUAL`, `EXACT` |
| `ActivityType` | `EXPENSE_ADDED`, `SETTLEMENT_ADDED`, `GROUP_CREATED`, `MEMBER_ADDED` |
| `IdempotencyStatus` | `PENDING` (in-flight), `COMPLETED` |

### Important Relationship Decisions

- **User → Group (owner):** `onDelete: Restrict` — deleting a user that owns groups requires removing/reassigning the group first.
- **Group → GroupMember:** `onDelete: Cascade` — deleting a group removes all its memberships.
- **User → GroupMember:** `onDelete: Cascade` — deleting a user removes them from all groups.
- **Group → Expense:** `onDelete: Cascade` — deleting a group removes all its expenses.
- **Expense → ExpenseSplit:** `onDelete: Cascade` — deleting an expense removes all splits.
- **User → Expense (payer), ExpenseSplit, Settlement (payer/payee), ActivityEvent (actor):** `onDelete: Restrict` — prevents deleting a user that has financial records.
- **User → RefreshToken:** `onDelete: Cascade` — deleting a user removes their refresh tokens.
- **User → IdempotencyRecord:** `onDelete: Cascade` — deleting a user removes their idempotency keys.

### Indexing

| Table | Index | Justification |
|---|---|---|
| `Group` | `createdById` | Look up groups by owner |
| `GroupMember` | `userId` | Look up all groups for a user |
| `GroupMember` | `[groupId, userId]` (unique) | Prevent duplicate membership; fast join lookups |
| `Expense` | `groupId` | List expenses within a group |
| `Expense` | `paidById` | Look up expenses paid by a user |
| `Expense` | `expenseDate` | Time-range queries on expenses |
| `ExpenseSplit` | `userId` | Look up all splits for a user |
| `ExpenseSplit` | `[expenseId, userId]` (unique) | Prevent duplicate splits per expense per user |
| `Settlement` | `groupId` | List settlements within a group |
| `Settlement` | `payerId` | Look up settlements made by a user |
| `Settlement` | `payeeId` | Look up settlements received by a user |
| `ActivityEvent` | `groupId` | List activity within a group |
| `ActivityEvent` | `occurredAt` | Time-range queries, chronological feed |
| `RefreshToken` | `tokenHash` (unique) | Fast token lookup during auth; prevents duplicates |
| `RefreshToken` | `userId` | Look up all tokens for a user |
| `IdempotencyRecord` | `key` (unique) | Prevent duplicate idempotency keys across all users |
| `IdempotencyRecord` | `userId` | Look up keys issued to a user |
| `IdempotencyRecord` | `expiresAt` | Expiry sweep and lifetime queries |
| `User` | `email` (unique) | Login lookup; prevents duplicate emails |

## Money Representation

**All monetary values are stored as integer minor units (paisa) in PostgreSQL `BIGINT` columns.** This matches the frontend's `Money.minorUnits` (Dart `int`) convention and completely eliminates floating-point rounding errors in financial calculations.

For example, PKR 4,500.00 is stored as `450000` minor units. No `Float`, `Double`, or `Decimal` types are used for money.

The `currencyCode` field (default `PKR`) is stored on financial records for future multi-currency extensibility, but the application currently operates in PKR only.

## Identifier Strategy

All entities use **UUID strings** generated by Prisma's `@default(uuid())` generator. This provides globally unique, non-sequential identifiers that are safe for client exposure and consistent across all entities.

## Development Hot Reload

The `PrismaClient` instance is cached on `globalThis` during development to prevent multiple database connections when `tsx watch` triggers file reloads.

In production, a single client instance is reused across all HTTP requests.

## Architecture

Feature modules follow a strict layered dependency flow, keeping HTTP concerns,
business logic, and data access separate:

```
Routes
  → Controller   (handle HTTP req/res, call service)
  → Service      (business logic, auth, hashing, tokens)
  → Repository   (Prisma data access)
  → Prisma       (database)
```

Each feature lives under `src/modules/<feature>/`. The `auth`, `groups`,
`expenses`, `settlements`, and `activity` modules are the reference examples.
Controllers parse the validated request and delegate to the service; the service
owns rules (duplicate-email detection, password verification, token signing,
group ownership/membership authorization, expense split validation, balance
derivation, settlement membership rules, activity authorization) and throws
application errors that the centralized error handler converts to the standard
error response.

## Current Implementation Status

Implemented so far (auth + groups + expenses + balances/settlements + activity feed):

- TypeScript project configuration (strict mode)
- Express application with middleware (CORS, Helmet, rate limiting, JSON parsing)
- Centralized rate limiting via `express-rate-limit` — per-IP limiter for all
  `/api/v1` endpoints plus a stricter tier for `/api/v1/auth/*`, with a 429 error
  envelope, `RateLimit-*`/`Retry-After` headers, and env-tunable windows/limits
- Centralized configuration via Zod-validated environment variables
- Health check endpoints (liveness + database readiness)
- Centralized error handling (application errors, validation errors, 404)
- Zod validation middleware infrastructure
- Structured JSON logging
- HTTP status code enum (`HTTP_STATUSES`)
- API routing foundation under `/api/v1`
- PostgreSQL integration via Prisma ORM
- Prisma schema (User, Group, GroupMember, Expense, ExpenseSplit, Settlement, ActivityEvent, RefreshToken)
- Initial database migration
- Centralized Prisma client module with lifecycle utilities
- Readiness endpoint (`/health/ready`) with mocked DB check in tests
- Database scripts (`db:generate`, `db:migrate`, `db:migrate:dev`, `db:studio`, `db:validate`)
- **Authentication API** (`/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`, `/api/v1/auth/me`)
- JWT token signing/verification with configurable secret and lifetime
- bcrypt password hashing (never stored or returned in plaintext)
- Opaque refresh tokens with SHA-256 hashing at rest (`RefreshToken.tokenHash`)
- Atomic refresh-token rotation (conditional revoke + replacement in one transaction)
- Revocation-based session logout (idempotent) and `REFRESH_TOKEN_INVALID` safe errors
- `authenticate` middleware for protecting routes
- Module-based architecture (`src/modules/auth/`): routes → controller → service → repository → Prisma
- **Groups & membership API** (`/api/v1/groups` CRUD + add/remove members)
- Owner/member authorization for groups (`ForbiddenError` / HTTP 403)
- Group creation with atomic creator-membership Prisma transaction
- **Expenses & split API** (`/api/v1/groups/:groupId/expenses` create/list, `/api/v1/expenses/:id` detail)
- Group membership authorization for expenses (requester, payer, and split participants)
- Deterministic EQUAL split calculation with exact-total remainder distribution
- EXACT split validation (sum must equal the expense total)
- Atomic expense + splits creation via a single Prisma transaction
- Pure, unit-tested split calculation module (`split.util.ts`)
- **Balance calculation API** (`/api/v1/groups/:groupId/balances`)
- Balances derived at request time from expenses, splits, and settlements (no persisted balance column)
- Pure, unit-tested BIGINT balance calculation module (`balance.util.ts`) with a sum-to-zero invariant
- **Settlement API** (`/api/v1/groups/:groupId/settlements` create/list, `/api/v1/settlements/:id` detail)
- Group membership authorization for settlements (requester, sender, and receiver)
- Positive-amount and sender-receiver validation for settlements
- Cross-group access protection for settlement detail (IDOR guard)
- **Idempotency protection for settlement creation** — persistent, transactional, database-enforced duplicate prevention via the `IdempotencyRecord` table
- `Idempotency-Key` header validation (Zod), user/request binding, replay of original results, and concurrent-duplicate protection
- Pure, unit-tested idempotency reconciliation (`reconcile.ts`) and request fingerprinting (`request-hash.ts`)
- **Activity API** (`/api/v1/groups/:groupId/activity`)
- Group membership authorization for activity reads (IDOR guard)
- Deterministic, database-level ordering and pagination for the activity feed
- Zod validation for activity query parameters (`page`, `limit`, safe cap)
- Activity events (`GROUP_CREATED`, `MEMBER_ADDED`, `EXPENSE_ADDED`, `SETTLEMENT_ADDED`)
  recorded in the same Prisma transactions as the domain operations that produce them
- Safe actor/user projection (password hashes never exposed)
- Test suite (Vitest + Supertest, all passing without a live DB)

## Not Yet Implemented

The following features are **NOT implemented** in this chunk:

- Email verification / password reset
- User management / profile update endpoints
- Expense delete endpoint (creation, list, and detail are implemented)
- Activity feed generation logic
- Idempotency protection for expense creation (only settlement creation is protected in this PR)
- Member-removed activity events (the `ActivityType` enum does not yet include a removal type)
- Notifications / real-time activity pushes (the feed is read on demand)
- Distributed rate-limit store (current counters are in-memory and process-local;
  a shared store such as `rate-limit-redis` would be needed for multi-instance
  deployments behind a load balancer)

These will be built on top of this foundation in subsequent chunks.

## Frontend Compatibility

The backend error response contract (`{ success: false, message: "..." }`) is designed to be compatible with the Flutter frontend's `api_exception_mapper.dart`, which reads `data['message']` from HTTP error responses.

The API is versioned at `/api/v1` to match the frontend's `AppConstants.apiBaseUrl` pattern.
