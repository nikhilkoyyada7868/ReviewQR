<div align="center">

# ReviewQR

### Turn a table-side QR scan into a clear, honest path to a useful Google review.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers_%2B_D1-F38020?logo=cloudflare&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-Backend_%2B_UI_contract-22C55E)

</div>

## The problem

Restaurants often ask for reviews at the wrong moment or send customers to a blank text box. That creates friction for customers and produces vague feedback for the business. ReviewQR gives each restaurant a permanent QR destination and helps a customer turn their own rating and selected topics into an editable draft.

ReviewQR **never posts a review on the customer's behalf** and never labels a Google handoff as a verified submission.

## How it works

1. An operator creates a restaurant profile and records its official Google review URL.
2. ReviewQR generates a stable customer link and downloadable QR code.
3. A customer scans, selects a 1–5 rating and up to three restaurant-specific topics.
4. The customer can use an editable grounded draft or write their own review.
5. ReviewQR copies the text and opens the restaurant's official Google review page.

## Value delivered

- **For customers:** less blank-page effort and full control over the final words
- **For restaurants:** a reusable QR asset and more specific feedback prompts
- **For operators:** onboarding, activation controls, QR generation, and aggregate funnel analytics
- **For trust:** equal treatment for every rating, explicit handoff language, and no persistence of draft text

## Product capabilities

- Stable restaurant slugs with mutable Google destinations
- Restaurant-specific topic configuration
- Generated and customer-written review paths
- Deterministic draft fallback when AI is unavailable
- Admin allowlist protection and fail-closed production identity
- QR generation and aggregate event reporting
- URL validation, idempotent events, privacy-minded storage, and seeded demo data

## Architecture

```text
Next/React customer + admin UI
              ↓
     Route handlers / services
        ↙             ↘
Cloudflare D1      Draft provider
(Drizzle ORM)   (optional AI + fallback)
```

The application is a modular monolith deployed through Vinext to Cloudflare Workers. D1 stores restaurant configuration and allowlisted aggregate events; customer draft text and optional free text remain request/browser scoped.

## Local setup

**Requirements:** Node.js 22.13+, npm, and `sqlite3`.

```bash
git clone https://github.com/nikhilkoyyada7868/ReviewQR.git
cd ReviewQR
npm install
cp .env.example .env.local
npm run db:migrate:local
npm run db:seed
npm run dev
```

Open the seeded customer experience at `/r/saffron-yard`. Re-running the seed is safe and does not duplicate the fixture.

For local admin access, use the same email in `ADMIN_EMAIL_ALLOWLIST` and `REVIEWQR_LOCAL_ADMIN_EMAIL`. Production requires the hosting platform's `oai-authenticated-user-email` header and does not use the local fallback.

## Configuration

| Variable/binding | Purpose |
| --- | --- |
| `DB` | Cloudflare D1 binding |
| `ADMIN_EMAIL_ALLOWLIST` | Comma-separated operator emails; required and fail-closed |
| `REVIEWQR_ENV` | `development`, `test`, or `production` |
| `REVIEWQR_LOCAL_ADMIN_EMAIL` | Explicit loopback-only development identity |
| `OPENAI_API_KEY` | Optional; enables the configured AI draft provider |
| `OPENAI_MODEL` | Optional model override |
| `REVIEWQR_PUBLIC_BASE_URL` | Optional canonical origin used for QR links |

## Verification

```bash
npm test
npm run lint
npm run db:generate
```

`npm test` performs a production build and runs backend plus UI-contract tests.

## Documentation

- [Product requirements](docs/PRD.md)
- [Architecture and decisions](docs/ARCHITECTURE.md)
- [Test strategy](docs/TEST_STRATEGY.md)
- [QA report](docs/QA_REPORT.md)
- [Engineering handover](HANDOVER.md)

## MVP boundaries

ReviewQR assists composition and opens Google's official destination; it does not submit, verify, rank-gate, or reward reviews. Deployment is intentionally outside the current MVP handoff.
