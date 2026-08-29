# ReviewQR MVP Test Strategy

**Gate rule:** a stage advances only when its automated checks pass, no P0 defect is open, and the named owner signs off. Deployment is excluded.

## 1. Test pyramid

| Layer | What it proves | Primary owner |
|---|---|---|
| Unit (largest) | validators, Google URL allowlist, rating/topic rules, metadata redaction, fallback wording, draft policy, auth allowlist, dedupe keys, length buckets | Engineers |
| Repository/application integration | fresh D1 migration, constraints, repository queries, idempotency, event dedupe, latest-rating aggregates, AI timeout/fallback orchestration | Backend engineer |
| Route/component integration | HTTP status/contracts/auth, active/inactive rendering, equal controls, editor preservation, clipboard and navigation branches | UI + backend engineers |
| Browser E2E (smallest) | complete mobile customer paths and admin onboarding/QR/analytics using real built Worker with controlled fakes | QA |
| Manual acceptance | five-minute onboarding, wording/policy review, responsive/a11y/compatibility evidence | QA + Product Manager |

Tests use deterministic IDs/clocks, a fresh isolated local D1, and fake AI adapters. No automated test calls Google or a paid AI provider. Google handoff asserts the saved allowlisted destination without following it.

## 2. Stage gates

### Stage 1 — Architecture and skeleton

- `npm run db:generate`: migration generated and manually inspected for six expected tables, FKs, uniqueness, and indexes.
- `npm run build`: Vinext/Worker ESM compilation succeeds with D1 declared and starter preserved.
- Type boundary review: domain/contracts do not import UI, D1, or AI SDKs; application ports do not import framework code.
- Mapping: AC-14, QA-012, architectural deliverable gate.

### Stage 2 — Vertical foundation

- Apply all migrations to a fresh local D1, then run idempotent fixture twice.
- Repository tests: active, inactive, missing, slug/public-ID uniqueness, ordered active topics, update without public ID change.
- Public config route: valid result/session, indistinguishable inactive/unknown, D1 unavailable `503`.
- Admin boundary on every endpoint: missing identity `401`, non-allowlisted `403`, allowlisted succeeds; production config missing allowlist fails closed.
- Event ingestion: schema validation, allowlisted metadata only, page-view 30-minute dedupe, idempotent retry.
- Mapping: AC-2/3/10/11/14; QA-001/002/010/011/015/016/018.

### Stage 3 — Customer experience and draft service

- Parameterized rating tests for 1–5 assert identical DOM controls/action prominence and route eligibility.
- Rating keyboard semantics; topic selection 1–3; own-writing bypass; 10–1,000 character handoff limits.
- Grounding tests assert only selected topic descriptors/operator facts can appear; rating bands remain constructive/balanced/positive.
- Provider success, missing credential, timeout, exception, malformed/unsafe output all return a usable deterministic fallback within budget.
- Clipboard success/failure and blocked navigation retain text and expose correct official-link behavior.
- Accessibility component checks: names/roles/states, live progress/error messages, focus preservation, 44 px targets.
- Mapping: AC-4–9/13; QA-003–008/019/020/022/024/026/027/028.

### Stage 4 — Admin onboarding, QR, analytics

- Create/edit validation: required fields, slug normalization/conflict, 3–8 topics, facts limits, Google HTTPS host/path fixtures.
- Malicious destination matrix: `javascript:`, HTTP, credentials, lookalike domains, encoded controls, unrelated Google paths, arbitrary hosts.
- Idempotent create and atomic restaurant/topic write; activate/deactivate behavior.
- QR decode test equals canonical ReviewQR route; destination/topic edit leaves QR payload unchanged.
- Aggregate fixture asserts exact totals, unique-session metrics, latest rating distribution, AI/fallback split, and honest labels.
- Timed manual onboarding trial under five minutes with prepared input.
- Mapping: AC-1/2/10–12; QA-009/013/014/017/018/023.

### Stage 5 — Integrated QA and PM acceptance

- `npm test`, build, fresh migration/seed, API suite, and browser E2E all pass from a clean checkout.
- E2E customer flows: generated, own-writing, AI failure, clipboard denied, all five ratings, inactive/unknown, event outage.
- E2E admin flow: unauthorized cases, create → activate → preview → QR → edit → aggregate validation.
- Responsive: 360×800, 390×844, tablet, desktop; no horizontal overflow.
- Keyboard-only and automated accessibility audit; manual screen-reader status/label smoke.
- Current Safari iOS, Chrome Android/desktop, Firefox, Edge smoke or documented P2 workaround.
- Privacy inspection of D1 rows, structured logs, and captured requests proves no draft/detail/identity/raw IP/user-agent storage.
- QA reports every PRD QA ID as pass/fail/blocked with evidence. PM verifies language and metrics before user handoff.

## 3. Critical test data

- Active fixture: `saffron-yard`, six topics, two approved non-experiential facts, valid official Google review link.
- Inactive fixture with a valid saved destination to prove it never leaks publicly.
- Unicode fixture for restaurant name/topic/review editing.
- Events fixture includes duplicates, rating changes, AI/fallback sources, handoffs, and self-reports across known sessions/timestamps.
- Fake AI modes: success, slow timeout, network error, empty, oversized, unsupported-detail output.

Fixture seeding must be an explicit command and use stable IDs/upserts so a second run changes no counts.

## 4. Test isolation and observability

- Each integration suite creates a fresh local D1 namespace/database; tests never share event state.
- Time, UUID generation, AI, clipboard, and navigation are injected/faked at boundaries.
- Route tests assert response bodies never include raw D1/internal errors.
- Logs are captured in privacy tests and scanned for fixture draft/detail text and secret values.
- Performance uses warm and cold samples separately; report p50/p95 rather than one successful run.

## 5. Exit and defect policy

- P0/P1 classification follows PRD section 18. Zero open P0; zero open P1 unless PM explicitly accepts a narrow non-production limitation.
- Flaky tests are failures: quarantine does not satisfy a gate.
- An upstream AI outage cannot block release if fallback tests pass; D1/configuration read failure does block the public-flow gate.
- QA approval must include commands, environment, migration version, commit state, evidence, and known P2 risks.

## 6. PRD matrix ownership

| QA IDs | Gate owner |
|---|---|
| QA-001–002, 010–012, 015–018 | Backend engineer → QA |
| QA-003–008, 019–022, 024, 026–028 | UI/backend pair → QA |
| QA-009, 013–014, 017–018, 023 | Backend/UI pair → QA |
| QA-025 plus final regression | QA |
| Product language, metric definitions, accepted P1 exceptions | Product Manager |
