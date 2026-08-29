# ReviewQR Engineering Handover

**Repository:** `/Users/nikhilkoyyada/Documents/ReviewQR`

**Branch:** `main`

**Baseline commit:** use the latest commit on `main`; QA hardening follows the original MVP commit `22a40b9`

**Handover date:** 2026-08-29

**Delivery state:** Functional, QA-hardened local MVP; conditionally approved for product-owner acceptance. Production deployment remains pending.

This document is the starting point for another AI or engineer. Read it first, then read `docs/PRD.md`, `docs/ARCHITECTURE.md`, and `docs/TEST_STRATEGY.md` before changing product behavior.

## 1. Product purpose

ReviewQR gives each restaurant a permanent ReviewQR URL and printable QR code. A customer scans the QR and:

1. Opens the restaurant's public ReviewQR page without creating a ReviewQR account.
2. Selects a rating from 1 to 5.
3. Selects one to three restaurant-configured experience topics.
4. Receives an editable, grounded review suggestion, or chooses to write their own review.
5. Chooses either **Copy & open Google** or **Open Google without copying**.
6. Personally reviews and posts the review on Google's page.
7. May optionally self-report that they posted; ReviewQR labels this as unverified.

ReviewQR does not post reviews to Google, cannot verify that Google accepted a review, and must never claim otherwise.

All ratings receive the same Google actions. Do not add review gating, suppress low-rating customers, or selectively route only positive customers to Google.

## 2. MVP scope implemented

### Customer experience

- Public route: `/r/:slug`.
- Client-side restaurant/session loading.
- Equal 1–5 star selector.
- One-to-three topic selection with an enforced maximum of three.
- AI-assisted draft generation when `OPENAI_API_KEY` is configured.
- Deterministic grounded fallback when AI is absent, fails, times out, or violates policy.
- Customer-authored review path that bypasses draft generation.
- Editable textarea with 10–1,000 character copy constraint.
- Clipboard copy with manual-copy fallback messaging.
- Google handoff through a server-returned, revalidated official URL.
- Optional, deduplicated self-reported completion.
- Loading, unavailable, retry, rate-limit, provider-failure, copy-failure, and handoff-failure states.
- Mobile and accessibility-oriented semantics: radio ratings, `aria-pressed` topics, live regions, focus movement, and 44 px minimum interactive targets.

### Internal operator experience

- Protected admin routes under `/admin`.
- Restaurant list.
- Restaurant creation form.
- Restaurant detail and edit form.
- Active/inactive status.
- Three-to-eight active customer topics.
- Up to eight operator-approved restaurant facts.
- Narrow validation of Google-owned HTTPS review destinations.
- Immutable public slug after creation so printed QR codes remain stable.
- Downloadable SVG QR code encoding the permanent ReviewQR URL.
- Customer-page preview.
- Basic aggregate funnel analytics and latest rating distribution per session.

### Explicitly excluded from this MVP

- Google Business Profile OAuth.
- Google Places review ingestion or scraping.
- Automatic Google review publication.
- Verified Google submission tracking.
- Merchant accounts or merchant-facing dashboards.
- Billing, subscriptions, or plans.
- SMS, email, WhatsApp, or receipt integrations.
- Multi-language support.
- Production deployment.
- Storing customer-authored review text.

## 3. Policy and product invariants

These are non-negotiable unless the product owner explicitly changes scope after a policy review:

- Present Google actions identically for ratings 1–5.
- The customer must control, edit, replace, or ignore generated text.
- Never state that ReviewQR posted a review.
- Never label a handoff or self-report as a verified Google review.
- Generate text only from the restaurant name, selected topics, optional customer detail, and approved facts.
- Reject unsupported dishes, named staff, prices, awards, repeated-visit claims, visit occasions, and sentiment inconsistent with the rating.
- Never log or persist the generated draft or customer-authored text.
- Keep the Google review URL server-owned; it is not returned in the initial public restaurant response.
- Keep the QR destination stable as `/r/:slug`; changing restaurant configuration must not require reprinting the QR.

## 4. Technical architecture

The system is an MVP modular monolith:

- **Application framework:** Next.js 16 App Router with React 19 and TypeScript.
- **Runtime/build:** Vinext/Vite targeting a Cloudflare Worker-compatible deployment.
- **Persistence:** Cloudflare D1, accessed with prepared statements behind `D1ReviewQRRepository`.
- **Schema tooling:** Drizzle ORM and Drizzle Kit.
- **QR generation:** `qrcode`, returning SVG.
- **AI provider:** OpenAI Responses API behind a `DraftGenerator` port.
- **AI fallback:** deterministic local generator.
- **Admin identity:** hosting-provided ChatGPT/OpenAI user headers plus a server-side email allowlist; explicit loopback-only development fallback.
- **Customer identity:** no account; opaque review session ID.
- **Blob storage:** none; R2 is intentionally `null`.

The dependency direction is:

```text
App routes and UI
    -> application service
        -> domain/contracts and ports
            -> D1, AI, auth, URL-validation adapters
```

Do not split this into microservices for the current scale.

## 5. Important files

### Product and design documentation

- `docs/PRD.md`: personas, scope, requirements, 14 acceptance criteria, and QA-001–QA-028.
- `docs/ARCHITECTURE.md`: architectural decisions, boundaries, flows, risks, and data model.
- `docs/TEST_STRATEGY.md`: intended verification strategy.
- `README.md`: concise setup and runtime configuration.
- `HANDOVER.md`: this operational handover.

### Customer application

- `app/page.tsx`: product landing page and demo links.
- `app/r/[slug]/page.tsx`: public route wrapper.
- `app/r/[slug]/review-flow.tsx`: complete customer state machine, analytics emission, clipboard behavior, Google handoff, and self-report flow.
- `app/globals.css`: public/admin visual system and responsive styles.

### Admin application

- `app/admin/layout.tsx`: protected operator shell; requires authenticated user and explicit allowlist membership.
- `app/admin/restaurant-list.tsx`: restaurant list and empty/error states.
- `app/admin/restaurants/restaurant-form.tsx`: create/edit UI and client validation.
- `app/admin/restaurants/[id]/restaurant-detail.tsx`: QR, configuration, analytics, and edit tabs.

### API routes

- `app/api/public/restaurants/[restaurant]/route.ts`: treats `[restaurant]` as a slug; returns public restaurant data and a session ID.
- `app/api/public/restaurants/[restaurant]/drafts/route.ts`: treats `[restaurant]` as public ID; generates a draft.
- `app/api/public/restaurants/[restaurant]/events/route.ts`: treats `[restaurant]` as public ID; records an allowlisted event.
- `app/api/public/restaurants/[restaurant]/handoffs/route.ts`: treats `[restaurant]` as public ID; records a handoff and returns the Google URL.
- `app/api/admin/restaurants/route.ts`: list/create restaurants.
- `app/api/admin/restaurants/[id]/route.ts`: get/update a restaurant.
- `app/api/admin/restaurants/[id]/analytics/route.ts`: aggregate analytics.
- `app/api/admin/restaurants/[id]/qr.svg/route.ts`: protected QR generation and download.

The public route parameter has two meanings by endpoint: slug for the initial lookup and public ID for subsequent customer APIs. Preserve this distinction or refactor all callers and tests together.

### Domain, application, and infrastructure

- `src/contracts/http.ts`: request/response contracts and API error codes.
- `src/domain/restaurant.ts`: public and internal restaurant models.
- `src/domain/review.ts`: rating, source, event, and metadata types.
- `src/application/review-service.ts`: draft orchestration, timeout/fallback, event creation, and rate limiting.
- `src/application/ports/*.ts`: repository and draft-generator interfaces.
- `src/infrastructure/d1/repository.ts`: all D1 queries and aggregate logic.
- `src/infrastructure/ai/openai.ts`: OpenAI Responses API adapter.
- `src/infrastructure/ai/deterministic.ts`: fallback generator and output policy validator.
- `src/infrastructure/ai/provider.ts`: provider selection.
- `src/infrastructure/http/api.ts`: service assembly and consistent error mapping.
- `src/security/validation.ts`: exact-key JSON validation and size limits.
- `src/security/google-review-url.ts`: narrow Google URL allowlist.
- `src/security/admin-authorization.ts`: allowlist, local identity fallback, and same-origin mutation enforcement.
- `app/chatgpt-auth.ts`: hosting-owned sign-in integration and local user fallback.

### Persistence and runtime

- `db/schema.ts`: six-table D1 schema.
- `drizzle/0000_glamorous_thanos.sql`: generated initial migration.
- `db/fixtures.sql`: idempotent Saffron Yard demo fixture.
- `.openai/hosting.json`: declares D1 binding `DB`; R2 disabled.
- `vite.config.ts`: Vinext, Sites, Cloudflare, and local binding configuration.
- `worker/index.ts`: Worker entry point and image-optimization forwarding.

## 6. Database model

The schema has six tables:

1. `restaurants`
   - Internal ID, public ID, immutable slug, display name, location, Google URL, approved facts JSON, status, and timestamps.
   - Unique indexes on public ID and slug.
2. `topics`
   - Restaurant-owned label, drafting descriptor, ordering, active flag, and timestamps.
   - Unique per restaurant and label.
3. `review_sessions`
   - Opaque session ID, restaurant ID, creation time, and latest activity time.
4. `analytics_events`
   - Event ID, restaurant/session relationship, event type, optional rating, allowlisted metadata JSON, optional dedupe key, and occurrence time.
5. `operation_keys`
   - Idempotency records used for restaurant creation and privacy-safe draft-attempt claims. Draft text is never stored for replay.
6. `rate_limit_buckets`
   - D1-backed fixed-window counters for draft and event requests.

Customer review text, generated draft text, customer names, phone numbers, email addresses, Google identities, and IP addresses are intentionally absent.

## 7. Analytics semantics

Allowlisted event types are:

- `qr_page_viewed`
- `rating_selected`
- `topics_selected`
- `draft_generated`
- `draft_generation_failed`
- `draft_edited`
- `draft_copied`
- `google_handoff_clicked`
- `completion_self_reported`

Important meanings:

- `google_handoff_clicked` means ReviewQR returned/opened the configured Google destination. It does not mean a review was posted.
- `completion_self_reported` is optional, customer-reported, deduplicated per session, and unverified.
- Rating distribution uses the latest `rating_selected` event per session.
- QR views are deduplicated per session in a 30-minute bucket.
- Draft edits and self-reports receive logical dedupe keys.
- Draft generation is limited to 5 attempts per restaurant/session per 60 seconds.
- Event ingestion is limited to 60 events per restaurant/session per 60 seconds.

Only metadata keys explicitly constructed in `ReviewService.record` are stored. Free-form text is not included.

## 8. Draft-generation behavior

`configuredDraftGenerators` chooses:

- OpenAI as primary when `OPENAI_API_KEY` exists.
- Deterministic fallback as both primary and fallback when no API key exists.

The OpenAI adapter:

- Calls `https://api.openai.com/v1/responses`.
- Defaults to model `gpt-5-mini` unless `OPENAI_MODEL` is provided.
- Requests one 25–60 word editable suggestion.
- Has a 5-second application timeout.
- Receives restaurant name, rating, selected topics, approved facts, and optional detail.

Every provider result passes `DefaultDraftPolicy`. It requires:

- 12–90 words and 10–1,000 characters.
- Restaurant name grounding.
- At least one selected-topic reference.
- No detected unsupported claims unless present in supplied context.
- Constructive text for ratings 1–2, balanced text for rating 3, and positive text for ratings 4–5.

If primary generation fails or violates policy, a `draft_generation_failed` event is attempted and deterministic fallback is returned.

## 9. Admin security model

Admin pages first call `requireChatGPTUser`, which relies on hosting-owned sign-in paths. They then call `requireAdmin`, which compares the trusted email header against `ADMIN_EMAIL_ALLOWLIST`.

Admin APIs independently repeat `requireAdmin`; UI protection is not treated as API authorization.

Create and update requests also require an exact same-origin `Origin` header. Restaurant creation requires a valid `Idempotency-Key` header.

Production fails closed when:

- The hosting identity header is absent.
- The allowlist is empty.
- The authenticated email is not allowlisted.

Local development may use `REVIEWQR_LOCAL_ADMIN_EMAIL`, but only on `localhost` or `127.0.0.1` and only when `REVIEWQR_ENV` is not `production`.

## 10. Google destination validation

Only HTTPS URLs without credentials or custom ports are accepted. Supported exact hosts are:

- `g.page`
- `maps.app.goo.gl`
- `maps.google.com`
- `search.google.com`
- `www.google.com`

Accepted paths are deliberately narrow: `g.page/r/.../review`, a Maps short link, `/maps...`, or `/local/writereview...` as implemented in `src/security/google-review-url.ts`.

The stored URL is revalidated during every handoff before it is returned to the customer.

## 11. Local setup

Requirements:

- Node.js 22.13 or newer.
- npm.
- `sqlite3` for local migration and fixture commands.

Commands:

```bash
npm install
cp .env.example .env.local
npm run db:migrate:local
npm run db:seed
npm run dev
```

Expected local URL: `http://localhost:3000/`.

Useful routes:

- Landing page: `http://localhost:3000/`
- Seeded customer demo: `http://localhost:3000/r/saffron-yard`
- Admin: `http://localhost:3000/admin`

Use the same local email in both:

```dotenv
REVIEWQR_ENV=development
ADMIN_EMAIL_ALLOWLIST=operator@example.com
REVIEWQR_LOCAL_ADMIN_EMAIL=operator@example.com
REVIEWQR_PUBLIC_BASE_URL=http://localhost:3000
```

`OPENAI_API_KEY` is optional. Leave it empty to test deterministic generation.

The seed can be run repeatedly without duplicating the demo restaurant or topics. The migration command is intended for a fresh local database; do not assume the initial migration is idempotent.

## 12. Current fixture

`db/fixtures.sql` creates:

- Restaurant: Saffron Yard.
- Slug: `saffron-yard`.
- Location: Indiranagar, Bengaluru.
- Six topics: Food, Service, Ambience, Value, Cleanliness, and Family friendly.
- Two approved facts: Indian cuisine and outdoor seating.

The fixture Google URL is syntactically valid for testing but is not guaranteed to identify a real restaurant. Replace it with an official Google review link before any real pilot.

## 13. Verification status

The continuation QA evidence and per-test disposition are in `docs/QA_REPORT.md`. The current suite passes 17 backend tests and 6 UI contract tests in addition to the production build. The older baseline results below are retained only as delivery history.

The following passed immediately before the baseline commit:

```bash
npm test
npm run lint
```

Results:

- Production Vinext build: passed; 12 application/API routes built.
- Backend/security tests: 11 passed, 0 failed.
- UI contract tests: 5 passed, 0 failed.
- ESLint: 0 errors, 1 warning for using a normal `<img>` to display the generated QR SVG.
- Staged whitespace check: passed.

The backend tests cover deterministic drafts for every rating, grounding, adversarial unsupported claims, sentiment mismatch, Google URL validation, admin authorization, same-origin mutation checks, strict payload validation, and onboarding constraints.

The UI contract tests inspect source contracts for equal treatment of ratings, honest handoff language, accessibility semantics, responsive rules, admin essentials, immutable slug UI, and removal of starter scaffolding.

### Original QA interruption (resolved by continuation)

The planned QA matrix contains QA-001–QA-028. QA found one P0 during execution: superficially valid AI text could include ungrounded or rating-inconsistent claims. That issue was fixed by adding grounding, unsupported-claim, and sentiment checks plus adversarial tests.

The original role-based run hit the Codex usage limit before the browser matrix could finish. The primary agent subsequently continued the work without sub-agents, fixed the defects below, executed the local browser/API matrix, and recorded conditional PM acceptance in `docs/QA_REPORT.md`.

- Automated build, tests, local API probes, admin onboarding, responsive Chromium checks, and privacy inspection are green.
- Do not claim unconditional production approval: real OS clipboard readback, physical keyboard use, production-host identity, and cross-browser/device compatibility still need target-environment confirmation.

## 14. Resolved issues and remaining follow-up gaps

The first three issues were identified in the original handover and fixed during continuation QA:

### Resolved: customer session cookie path

The `rq_session` cookie now uses `Path=/`, remains `HttpOnly` and `SameSite=Lax`, and adds `Secure` on HTTPS. API/cookie-jar verification proves repeat lookups reuse the same session.

### Resolved: draft idempotency

`ReviewService.generate` now atomically claims a scoped D1 operation key. A repeat returns `409 CONFLICT`; the stored response reference is `privacy_no_replay`, so draft text is not persisted.

### Resolved: length-bucket unit mismatch

The browser and server now use the shared `lengthBucketForText` word-count function, with boundary and source-contract tests.

### P2: optional customer detail is API-only

The draft API supports `customerDetail`, but the current customer UI does not collect it. Customers can still edit the suggestion or write their own review.

Recommended next step: only add a short optional detail field if product testing shows it improves authenticity without harming completion rate.

### P2: generated QR image lint warning

The admin detail page uses `<img>` for a protected, dynamically generated SVG QR. ESLint reports the Next.js image optimization warning. This is non-blocking and may be intentionally acceptable for QR fidelity.

### Acceptance gaps

- Test clipboard success and denial on real mobile browsers.
- Test pop-up blocked behavior and same-tab fallback.
- Test return-to-browser behavior after opening the Google Maps app.
- Test keyboard-only and screen-reader flows.
- Test 320 px, 375 px, tablet, and desktop layouts.
- Test production Sites identity headers and allowlist behavior.
- Test a real restaurant-owned Google review link on Android and iOS.
- Test D1 migrations and seeding in the actual target hosting environment.

## 15. Recommended next work order

1. Let the product owner perform local acceptance testing, including exact clipboard content and a physical keyboard pass.
2. Confirm production Sites identity headers/allowlist behavior.
3. Run Safari, Firefox, Edge, Android, and iOS compatibility smoke tests.
4. Replace the demo Google URL with a real pilot restaurant link.
5. Only after acceptance, use the Sites hosting workflow to deploy and configure D1 and runtime secrets.

## 16. Instructions for the next AI

Start with these checks:

```bash
git status --short
git log -3 --oneline
npm test
npm run lint
```

Then:

1. Read this file completely.
2. Read `docs/PRD.md`, especially acceptance criteria and QA matrix.
3. Read `docs/ARCHITECTURE.md` and preserve its boundary decisions unless the product owner authorizes a change.
4. Inspect the exact files involved before editing; the codebase is small enough to avoid speculative rewrites.
5. Keep customer text out of persistence and logs.
6. Maintain equal treatment for ratings 1–5.
7. Do not scrape Google reviews or add Google OAuth without a new product/technical decision.
8. Update this handover and the architecture/PRD if behavior or scope changes materially.
9. Run build, backend tests, UI contract tests, lint, and the relevant browser cases before handing back.

Do not deploy merely because the build passes. The next formal completion gate is full QA evidence followed by Product Manager and product-owner acceptance.
