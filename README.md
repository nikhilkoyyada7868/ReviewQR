# ReviewQR MVP

ReviewQR gives each restaurant a permanent customer URL and QR code. Customers
choose a 1–5 rating and up to three restaurant-specific topics, receive an
editable draft (or write their own), then copy it and open the restaurant's
official Google review page. ReviewQR never posts to Google or calls a handoff a
verified review.

## Local setup

Requirements: Node.js 22.13+, npm, and `sqlite3` for local migration/fixture
checks.

```bash
npm install
cp .env.example .env.local
npm run db:migrate:local
npm run db:seed
npm run dev
```

The seeded customer demo is `/r/saffron-yard`. Running `npm run db:seed` again
does not duplicate the fixture.

For local admin work, set the same email in `ADMIN_EMAIL_ALLOWLIST` and
`REVIEWQR_LOCAL_ADMIN_EMAIL`. Production does not use the local identity
fallback: the hosting platform must provide `oai-authenticated-user-email`, and
that email must appear in `ADMIN_EMAIL_ALLOWLIST`.

## Verification

```bash
npm test
npm run lint
npm run db:generate
```

`npm test` performs the production Vinext build and runs backend and UI contract
tests. To inspect a migration and fixture in a completely fresh database, use a
new SQLite file and apply `drizzle/0000_glamorous_thanos.sql` followed by
`db/fixtures.sql` twice.

## Runtime configuration

- `DB`: Cloudflare D1 binding declared in `.openai/hosting.json`.
- `ADMIN_EMAIL_ALLOWLIST`: comma-separated internal operator emails; required
  and fail-closed.
- `REVIEWQR_ENV`: `development`, `test`, or `production`.
- `REVIEWQR_LOCAL_ADMIN_EMAIL`: explicit loopback-only development identity.
- `OPENAI_API_KEY`: optional; without it, the deterministic grounded draft
  generator is used.
- `OPENAI_MODEL`: optional provider model override.
- `REVIEWQR_PUBLIC_BASE_URL`: optional canonical origin used in QR generation.

Customer draft text and optional free text are request/browser scoped and are
not persisted. Aggregate events record only allowlisted metadata.

Deployment is intentionally excluded from this MVP handoff.
