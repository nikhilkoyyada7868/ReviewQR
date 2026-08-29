# ReviewQR MVP QA Report

**Date:** 2026-08-29  
**Environment:** local Vinext development Worker, Cloudflare D1/Miniflare, in-app Chromium browser  
**Decision:** conditionally approved for product-owner local acceptance; not approved for production deployment

## Outcome

The implemented MVP passes its production build, automated tests, schema check, API security and resilience probes, mobile/desktop responsive checks, admin onboarding flow, QR stability check, and privacy inspection. No known product-code P0 defect remains.

Three acceptance items need real-device or production-host confirmation because the local browser/runtime cannot prove them completely: exact operating-system clipboard contents, keyboard-only automation, cross-browser compatibility, and production hosting identity headers. These limitations do not hide a code failure, but they prevent an unconditional production approval.

## Automated evidence

```text
npm test
  production Vinext build: pass
  backend tests: 17 pass, 0 fail
  UI contract tests: 6 pass, 0 fail

npm run lint
  0 errors
  1 accepted warning: protected generated QR SVG uses a normal img element

npm run db:generate
  6 tables detected; no schema changes
```

A fresh temporary SQLite database accepted the committed migration. Running the fixture twice left one restaurant and six topics, proving the seed is idempotent.

## Browser and API evidence

- The active `saffron-yard` route rendered correct identity and topics. Generated 5-star and customer-authored 3-star paths were usable.
- Unknown and inactive routes showed the same unavailable state without controls or a Google destination.
- A restaurant was created from the admin UI and reached its QR page in 3.981 seconds. Editing its Google destination preserved the slug and QR route while the handoff used the new destination.
- The create/edit navigation race found during QA was fixed by performing a full navigation after a successful save.
- Responsive widths 360, 390, 768, and 1280 px had no horizontal overflow.
- Unicode restaurant and review text rendered and edited without corruption.
- Draft retries with the same idempotency key returned `409 CONFLICT`; six rapid unique attempts returned five successes followed by `429 RATE_LIMITED`.
- A malicious Google destination and an attempted slug mutation both returned `400 BAD_REQUEST`.
- Repeating the same event ID returned `recorded: true` and then `recorded: false`.
- Warm local public lookup and draft requests completed in approximately 29 ms and 22 ms respectively.
- D1 inspection found no generated or customer-authored review text. Stored metadata keys were limited to `topicCount`, `topicIds`, `draftSource`, `lengthBucket`, `draftId`, and `copyOutcome`.

## QA matrix

| ID | Result | Evidence or limitation |
|---|---|---|
| QA-001 | Pass | Active route rendered and scan event was stored/deduplicated. |
| QA-002 | Pass | Unknown and inactive routes were indistinguishable and leaked no controls/destination. |
| QA-003 | Pass | Parameterized source/tests prove equal 1–5 controls; browser exercised multiple rating bands. |
| QA-004 | Pass | Rating-parameterized grounding and adversarial policy tests pass. |
| QA-005 | Pass | Browser own-writing path opened an empty editable field without generation. |
| QA-006 | Pass | Provider error, malformed/policy-invalid output, timeout, and missing-provider fallback tests pass. |
| QA-007 | Conditional | Browser showed copy success and the saved handoff URL; the in-app runtime could not independently read back the operating-system clipboard. Verify exact clipboard content during product-owner testing. |
| QA-008 | Pass | Text is retained and direct-link/manual-copy fallback remains available; source contract covers denied clipboard/pop-up branches. |
| QA-009 | Pass | Malicious destination PATCH returned `400`; handoff revalidates the server-owned URL. |
| QA-010 | Conditional | Unit tests prove fail-closed authorization and origin checks. Local development intentionally supplies its explicit admin fallback; production Sites headers/allowlist require hosted verification. |
| QA-011 | Pass | Fresh migration succeeded; seeding twice preserved one restaurant and six topics. |
| QA-012 | Pass | Full build and test commands pass. |
| QA-013 | Pass | Timed create-to-active-QR trial completed in 3.981 seconds. |
| QA-014 | Pass | Slug/QR URL remained stable and handoff returned the updated Google destination. |
| QA-015 | Pass | Funnel events and normalized word-length buckets verified in source, tests, and D1 rows. |
| QA-016 | Pass | D1 text search and metadata inspection found no draft, clipboard, customer identity, raw IP, or user-agent persistence. |
| QA-017 | Pass | Aggregate endpoint/UI and deduplicated event behavior matched recorded events. |
| QA-018 | Pass | Repository create idempotency, draft conflict behavior, and event retry dedupe are covered. |
| QA-019 | Conditional | Semantic source checks pass, but the browser automation layer did not move focus for synthetic Tab input. Perform a short physical keyboard check. |
| QA-020 | Pass | Radio roles, pressed states, labels, live regions, and status text are present. |
| QA-021 | Pass | No overflow at 360, 390, 768, or 1280 px; primary actions remained reachable. |
| QA-022 | Pass | Strict API/UI validation covers empty/long text and topic-count bounds while preserving alternate paths. |
| QA-023 | Pass | Customer/admin wording consistently says handoff or self-reported; no verified-post claim. |
| QA-024 | Pass | Local lookup/draft timings were far inside the product budgets. |
| QA-025 | Blocked | Only the in-app Chromium engine was available. Safari, Firefox, Edge, and mobile app handoff smoke tests remain a pre-pilot task. |
| QA-026 | Pass | Unicode identity and mixed-script review editing worked. |
| QA-027 | Pass | Sixth draft attempt returned a clear `429`; own-writing remains available in the UI. |
| QA-028 | Pass | Analytics writes are best-effort; a repository-outage test proves draft generation still succeeds. |

## Defects fixed during QA

1. Public session cookies were scoped only to `/r` and were not reused by `/api`; the cookie now uses `Path=/` and adds `Secure` only for HTTPS.
2. Draft idempotency keys were validated but ignored; D1 now atomically claims a privacy-safe operation key and never stores draft text.
3. Browser analytics used character counts while the server used word counts; both now share one word-bucket function.
4. Custom service errors lacked stable names, causing duplicate requests to map to `503`; error identity and `409 CONFLICT` mapping are fixed.
5. Admin save navigation could remain stuck on `Saving`; successful creates and edits now navigate deterministically.
6. Analytics event outages could abort otherwise successful draft generation; internal analytics writes are now non-blocking.

## Product Manager acceptance

The MVP scope, equal-rating policy, customer-control wording, analytics terminology, and privacy boundary match the PRD. It is approved for the product owner's local acceptance test with the conditional items above explicitly accepted as non-production limitations. It is not approved for deployment or a restaurant pilot until QA-007, QA-010, QA-019, and QA-025 are confirmed in their real target environments.

