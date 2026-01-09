# Audit-Trail Book Publishing API

**Book Publishing API** (Fastify) with:
- **API-key auth** (`admin` / `reviewer`)
- **Config-driven audit trail** (no invasive code changes to add new entities)
- **Admin-only audit querying** with rich filters + cursor pagination
- **Pino structured logging** with `requestId` + `userId` on every line (file sink by default)
- **Centralized error handling** returning `{ error: { code, message, details?, requestId } }`

## Tech
- **MongoDB Atlas + Mongoose**: production-ready persistence and easy cloud setup
- **Cursor pagination**: stable pagination, used for both Books and Audits.
- **Soft delete for books**: keeps history while still behaving like delete; always auditable.

## Project structure (clean boundaries)

The codebase follows **routes → controllers → services → repositories**:

- **Routes (HTTP wiring only)**: `src/modules/*/routes.ts`
- **Controllers (request parsing/validation + HTTP responses)**: `src/modules/*/controller.ts`
- **Services (business logic)**: `src/modules/*/service.ts`
- **Repositories (DB access via Mongoose)**: `src/modules/*/repository.ts`

## Setup (Bun)

1) Install deps

```bash
bun install
```

2) Create `.env`

This repo includes `env.example`. Copy it locally:

```bash
cp env.example .env
```

3) Migrate + seed

```bash
bun run seed
```

4) Run

```bash
bun run dev
```

Server: `http://localhost:3000` (or whatever `PORT` is set to)

## Deploy / Render notes

The `start:render` script can optionally run `seed` on process start.

- Set `RUN_SEED_ON_START=1` only for first-time bootstrapping or ephemeral databases.
- For persistent cloud DBs (already populated), keep `RUN_SEED_ON_START=0` to avoid unnecessary startup work.

## Test with Postman (collection)

After the server is running, you can test the assignment using the provided Postman collection:

- **Copy/paste import**: open `postman/audit-trail-book-api.postman_collection.json`, copy the entire JSON, then in Postman go to **Import** → **Raw text** and paste it.
- **File import** (alternative): Postman **Import** → **File** → select `postman/audit-trail-book-api.postman_collection.json`.

## Auth

- Send `X-API-Key` header.
- Default seeded keys (override via `SEED_ADMIN_API_KEY` / `SEED_REVIEWER_API_KEY`):
  - **admin**: `admin_demo_key`
  - **reviewer**: `reviewer_demo_key`

## Logging

Pino logs include `level,time,msg,userId,requestId,route,method,status,durationMs`.

- Default: **file sink** to `./logs/app.log` (controlled by `LOG_SINK=file` + `LOG_FILE`)
- Optional: `LOG_SINK=pretty` for local readable logs
- Placeholder remote sinks:
  - `LOG_SINK=elastic` → JSON logs to **stdout** (intended for Elastic Agent/Filebeat-style collection)
  - `LOG_SINK=logtail` → JSON logs to **stdout** (intended for Logtail/Vector-style collection)

## Audit trail (config-driven)

Audit configuration lives in `src/config/auditConfig.ts`.

```ts
export const auditConfig = {
  Book: { track: true, exclude: ['updatedAt'], redact: [] },
  User: { track: true, exclude: ['apiKey'], redact: ['apiKey'] }
} as const;
```

**Extending audit to a new entity** (minimal changes):
1) Add a new Mongoose model (e.g. `Publisher`) under `src/db/models/`.
2) Add an entry to `src/config/auditConfig.ts`.
3) Add audit calls in the relevant repository functions (create/update/delete) using `src/db/auditWriter.ts`.

Audit records include: `entity`, `entityId`, `action`, `actorId`, `requestId`, `timestamp`, and a `diff` (`before/after/changedFields`) that respects `exclude/redact`.

## Representative cURL flows

### 1) Health (no auth)

```bash
BASE_URL="http://localhost:3000"
curl -s "$BASE_URL/health"
```

### 2) Books (reviewer)

```bash
export REVIEWER_KEY=reviewer_demo_key
export ADMIN_KEY=admin_demo_key
export BASE_URL="http://localhost:3000"
```

List books (cursor pagination):

```bash
curl -s -H "X-API-Key: $REVIEWER_KEY" "$BASE_URL/api/books?limit=2"
```

Create a book:

```bash
curl -s -X POST \
  -H "X-API-Key: $REVIEWER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Book","authors":"Jane Doe","publishedBy":"Indie"}' \
  "$BASE_URL/api/books"
```

Update a book:

```bash
BOOK_ID="REPLACE_ME"
curl -s -X PATCH \
  -H "X-API-Key: $REVIEWER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Book (2nd Ed)"}' \
  "$BASE_URL/api/books/$BOOK_ID"
```

Delete a book (soft delete):

```bash
curl -s -X DELETE \
  -H "X-API-Key: $REVIEWER_KEY" \
  "$BASE_URL/api/books/$BOOK_ID"
```

### 3) Audits (admin-only)

List audits:

```bash
curl -s -H "X-API-Key: $ADMIN_KEY" "$BASE_URL/api/audits?limit=20"
```

Filter audits by entity + fieldsChanged:

```bash
curl -s -H "X-API-Key: $ADMIN_KEY" \
  "$BASE_URL/api/audits?entity=Book&fieldsChanged=title,authors&limit=20"
```

Filter audits by requestId:

```bash
REQUEST_ID="REPLACE_ME"
curl -s -H "X-API-Key: $ADMIN_KEY" \
  "$BASE_URL/api/audits?requestId=$REQUEST_ID&limit=20"
```

Get one audit by id:

```bash
AUDIT_ID="REPLACE_ME"
curl -s -H "X-API-Key: $ADMIN_KEY" "$BASE_URL/api/audits/$AUDIT_ID"
```

Reviewer should be forbidden:

```bash
curl -i -H "X-API-Key: $REVIEWER_KEY" "$BASE_URL/api/audits?limit=1"
```

