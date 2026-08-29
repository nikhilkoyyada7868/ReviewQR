# ReviewQR MVP Product Requirements Document

**Owner:** Product Manager
**Status:** Approved for architecture and implementation
**Version:** 1.0
**Last updated:** 2026-08-29

## 1. Product summary

ReviewQR helps a restaurant turn an in-person request for feedback into a short, customer-controlled Google review handoff. An internal ReviewQR operator creates a restaurant profile and permanent QR destination in under five minutes. A customer scans the QR, rates the visit, selects what stood out, receives an editable AI-assisted draft grounded in those selections, and chooses to copy that draft and open the restaurant's official Google review page. The customer remains responsible for reviewing and posting the text on Google.

The MVP validates whether this low-friction experience increases meaningful Google review intent. It does not claim to post a review, verify a Google submission, or selectively permit public reviews based on rating.

## 2. Problem and opportunity

Restaurant staff can ask satisfied customers for Google reviews, but the customer must find the correct listing, decide what to write, and complete several steps. Existing QR links solve discovery but not writing friction. ReviewQR shortens the path and provides a relevant draft while preserving the customer's authorship and final control.

## 3. Goals

1. Let an internal operator onboard a restaurant in less than five minutes.
2. Give each restaurant a stable ReviewQR URL and QR code that do not change when its Google review URL or configuration changes.
3. Let a customer reach the official Google review page after no more than three meaningful decisions: rating, topics, and review approval/editing.
4. Generate useful, editable drafts grounded in explicit customer input and restaurant facts.
5. Collect privacy-minimal funnel analytics through the Google handoff.
6. Preserve a compliant, non-gated path to Google for every 1–5 star rating.

## 4. Non-goals

- Posting to Google on the customer's behalf.
- Verifying that Google accepted or published a review.
- Reading a customer's Google identity or review history.
- Merchant accounts, merchant dashboards, billing, subscriptions, plans, or Google Business Profile OAuth.
- Automated ingestion of all historical Google reviews.
- Reputation management, private complaint routing, CRM, loyalty, coupons, or marketing campaigns.
- Multiple languages in the first implementation; the MVP ships in English while preserving Unicode input.
- Native mobile applications.
- Claiming that a click, copy, or self-report is a verified review submission.

## 5. Product principles

- **Customer truth over generic praise:** the draft must reflect the customer's selected rating and topics; it must not invent dishes, service details, or sentiments.
- **Customer control:** the draft is editable, optional, and never posted automatically.
- **Equal public-review access:** all ratings get the same Google handoff capability and prominence.
- **Minimum collection:** customers do not create an account and ReviewQR does not request name, email, phone, or Google identity.
- **Fast first, extensible later:** use a modular monolith and durable event model before adding merchant-facing features.
- **Honest measurement:** report observable events such as handoffs, not inferred Google submissions.

## 6. Personas

### 6.1 Restaurant customer

- Has just completed a visit and is using a phone.
- Wants a fast experience and may not know what to write.
- May be logged into Google, but is anonymous to ReviewQR.
- Needs to understand that the draft is a suggestion and Google controls final posting.

### 6.2 Internal ReviewQR operator

- Onboards and updates restaurants.
- Knows the official restaurant listing/review URL or can verify it manually.
- Needs a deterministic checklist and basic aggregate funnel visibility.
- Is trusted in the MVP; the admin surface is protected from public access.

### 6.3 Product/operations analyst

- Uses internal aggregate analytics to validate adoption and funnel drop-off.
- Must distinguish measured handoffs and self-reports from verified Google reviews.

## 7. MVP scope

### 7.1 Restaurant onboarding and management

The internal operator can:

1. Create a restaurant with display name, location/address label, URL-safe slug, official Google review URL, and 3–8 topic chips.
2. Use a suggested default topic set: Food, Service, Ambience, Value, Cleanliness, and Family friendly.
3. Add optional restaurant facts such as cuisine or a verified signature attribute. Facts must be operator-supplied and not inferred as a customer's experience.
4. Preview the customer route.
5. activate/deactivate the restaurant.
6. Download or print a QR code whose payload is the stable ReviewQR customer URL.
7. Update the Google URL, topics, and facts without changing the QR URL.
8. View basic aggregate counts for the selected restaurant: scans, ratings selected, drafts generated, drafts edited, copies, Google handoffs, and self-reported completions.

The onboarding form provides inline validation and should be completable in under five minutes by a prepared operator.

### 7.2 Customer review flow

1. Customer scans a QR and opens `/r/{slug}`.
2. The page shows the restaurant identity and a clear `Rate your visit` prompt.
3. Opening a valid active route records one scan event per page load/session policy defined below.
4. Customer selects exactly one integer rating from 1–5. The UI never describes lower ratings as ineligible.
5. Customer selects one or more relevant topic chips, with a maximum of three to keep drafts focused. Topic selection is required before AI generation but can be bypassed by choosing `Write my own`.
6. Customer chooses one of two paths:
   - `Create a draft`: generate an editable draft from restaurant name, rating, selected topics, and approved facts.
   - `Write my own`: open the same editor empty.
7. Generated text is presented as a suggestion in an editable textarea. It should normally be 25–60 words and must not include facts unsupported by the inputs.
8. Customer may edit or replace the draft.
9. `Copy & open Google` copies non-empty text to the clipboard when possible, records the appropriate events, and opens/navigates to the configured official Google review URL.
10. If clipboard access is unavailable, the page keeps the text selected/visible, explains how to copy it manually, and still permits opening Google.
11. The page explains before handoff that the customer must paste/review the text and personally press Google's Post button.
12. After returning or using the provided follow-up affordance, the customer can optionally select `I posted it`. This is labeled and stored as self-reported, not verified.
13. Customers at every rating receive the same controls and Google handoff.

### 7.3 Draft generation behavior

- Generation uses only the restaurant display name, numeric rating, selected topics, optional customer-entered detail, and operator-approved facts.
- The tone must match the rating. It must not convert negative or mixed feedback into praise.
- A 1–2 star draft should constructively describe the selected problem areas without adding allegations. A 3 star draft should remain balanced. A 4–5 star draft can be positive but not exaggerated.
- The prompt must forbid invented dishes, staff names, visit circumstances, awards, prices, and claims of repeated visits.
- If AI is unavailable, the system returns a deterministic, editable fallback template derived from the same inputs. The customer journey must remain usable.
- Historical-review themes are a later enrichment. The MVP's operator-approved topics/facts stand in for them because broad review ingestion is unavailable without added integrations and policy/storage review.

### 7.4 Internal aggregate analytics

- Analytics are internal only.
- The UI can filter/select a restaurant and display event counts plus rating distribution.
- Counts are labeled accurately. `Google handoffs` means the user activated the Google CTA; `self-reported completions` means the user claimed completion.
- No customer-level activity table is required in MVP UI.

## 8. User flows

### 8.1 Onboarding flow

`Admin access → New restaurant → Enter identity and official Google URL → Choose topics/facts → Validate → Save → Preview → Download QR`

Completion criteria: an active public route opens, the QR encodes that route, and the Google CTA resolves to the saved official URL.

### 8.2 Generated-draft flow

`Scan → Choose rating → Choose 1–3 topics → Create draft → Read/edit → Copy & open Google → Customer posts on Google → Optional self-report`

### 8.3 Customer-written flow

`Scan → Choose rating → Write my own → Enter text → Copy & open Google → Customer posts on Google → Optional self-report`

### 8.4 AI failure flow

`Scan → Rating/topics → Create draft → AI timeout/error → Deterministic editable fallback → Copy & open Google`

### 8.5 Inactive or unknown restaurant flow

`Open route → Friendly unavailable state → No Google URL exposed → Operator-support guidance`

## 9. Functional requirements

### FR-1 Stable restaurant identity

- Each restaurant has an immutable public ID and a unique, operator-friendly slug.
- Public QR URLs use ReviewQR's domain and slug/public ID, never the Google URL directly.
- Editing the destination does not invalidate printed QR codes.

### FR-2 Safe official destination

- Accept only valid `https` Google Maps/Google Business review destinations from an allowlisted set of Google-owned hosts/patterns.
- Reject scripts, non-HTTP schemes, malformed URLs, and non-Google destinations.
- The handoff must not act as an arbitrary open redirect.

### FR-3 Rating and topics

- Rating supports keyboard, touch, screen reader labeling, and visible selected state.
- Topics are restaurant-specific, active/inactive, ordered, and limited to 3–8 active choices per restaurant.
- The public flow permits 1–3 selected topics.

### FR-4 Drafts

- Support generated and customer-written modes.
- Draft length: 10–1,000 characters for handoff; generated target: 25–60 words.
- Preserve customer edits in the browser during the current flow.
- Never auto-submit or silently overwrite edited text.

### FR-5 Google handoff

- A non-empty draft is required for the combined copy action.
- A separate `Open Google without copying` action is available so customers can write directly on Google.
- Every rating sees both actions with equal styling/availability.
- Handoff records an event before navigation on a best-effort basis.

### FR-6 QR artifact

- Generate a scannable QR for the stable public URL.
- Provide a downloadable SVG or PNG and human-readable restaurant name/URL.
- QR generation must not require storing a blob; it may be produced deterministically.

### FR-7 Admin protection

- Public routes and public write APIs remain anonymous.
- Admin routes require the hosting platform's authenticated workspace identity and an explicit configured allowlist when available. In local/test mode, a clearly isolated development mechanism may be used; it must not default to public access in production.
- Server-side authorization is mandatory for every admin read/write endpoint.

### FR-8 Aggregate analytics

- Persist funnel events durably.
- Support aggregate counts by restaurant and event name and rating distribution.
- Avoid raw IP persistence and third-party tracking scripts.

### FR-9 Seed/demo readiness

- Local development includes at least one realistic restaurant fixture reachable from the main page/admin experience.
- Seed behavior must be explicit and not silently create duplicates.

## 10. Data and event taxonomy

### 10.1 Core entities

- **Restaurant:** id, public ID/slug, name, location label, Google review URL, approved facts, status, created/updated timestamps.
- **Topic:** id, restaurant ID, label, prompt descriptor, sort order, active flag.
- **Review session:** opaque random ID, restaurant ID, created timestamp, last activity timestamp; no customer identity.
- **Analytics event:** id, restaurant ID, session ID, event type, rating when relevant, non-sensitive metadata, occurred timestamp.
- Draft text is not persisted in the MVP. Only `draft_source`, length bucket, selected topic identifiers, and edited boolean may be included as event metadata.

### 10.2 Event definitions

| Event | Trigger | Required properties | Counting rule |
|---|---|---|---|
| `qr_page_viewed` | Active public page initializes | restaurant, session | At most once per session per 30 minutes |
| `rating_selected` | Rating changes | restaurant, session, rating | Record changes; analytics default to latest rating per session |
| `topics_selected` | Topic selection confirmed/generation requested | topic IDs/count | One per generation attempt; no free text |
| `draft_generated` | AI or fallback draft returned | source=`ai` or `fallback`, rating, length bucket | One per successful result |
| `draft_generation_failed` | AI attempt fails before fallback | reason class, latency bucket | One per failed attempt |
| `draft_edited` | Generated text materially changes | source, length bucket | At most once per generated draft/session |
| `draft_copied` | Clipboard copy succeeds | source, rating, length bucket | One per user action |
| `google_handoff_clicked` | Google CTA activates | copy outcome, rating | One per user action; never named submitted |
| `completion_self_reported` | Customer selects `I posted it` | rating | At most once per session |

Raw draft text, optional customer detail, clipboard contents, IP address, user agent, and Google identity must not be stored as analytics metadata.

## 11. Success metrics

### Primary

- **Google handoff rate:** unique sessions with `google_handoff_clicked` / unique sessions with `qr_page_viewed`.
- **Draft usefulness rate:** unique generated drafts that are copied or handed off / unique generated drafts.
- **Onboarding time:** median operator time from new form open to active QR preview under five minutes in usability testing.

### Secondary

- Topic selection completion rate.
- AI success versus fallback rate.
- Draft edit rate (diagnostic, not inherently good or bad).
- Optional self-reported completion rate, always labeled self-reported.
- Public-flow error-free session rate.

### Initial product-validation targets

- ≥60% handoff rate among valid scans during controlled pilot testing.
- ≥80% draft usefulness rate.
- ≥95% successful usable draft response including fallback.
- 100% of operator onboarding trials completed under five minutes after the operator has the Google URL.

Targets are hypotheses, not launch guarantees.

## 12. Non-functional requirements

### Performance

- Public page responsive at 360 px width and usable on current mobile browsers.
- Initial page should render meaningful content within 2.5 seconds on a typical 4G connection, excluding upstream outages.
- Draft generation should produce AI or fallback output within 8 seconds; upstream timeout budget should be shorter than the overall limit.
- Analytics recording must not block the main interaction.

### Availability and resilience

- Customer-written reviews and Google handoff remain functional during AI outage.
- D1 failures produce a clear retry state for required reads/writes and do not invent analytics success.
- Duplicate client retries must not corrupt entities; key writes use idempotency or uniqueness constraints where appropriate.

### Security

- Validate all inputs server-side and encode outputs.
- Rate-limit public generation and event endpoints by privacy-preserving mechanisms available on the platform.
- Keep AI credentials server-side and out of client bundles.
- Use prepared/parameterized database operations.
- Apply CSRF-safe patterns for authenticated admin mutations.
- Do not expose internal error details or secrets.

### Accessibility

- Target WCAG 2.2 AA for core flows.
- Complete flow operable by keyboard.
- Semantic headings, labels, focus states, 44×44 px touch targets, and sufficient contrast.
- Status messages and generation progress announced to assistive technology.
- Do not rely on color alone for rating or topic state.

### Compatibility

- Latest two major versions of Safari iOS, Chrome Android/desktop, Firefox, and Edge.
- Graceful fallback for unavailable Clipboard API and pop-up restrictions.

### Maintainability

- Preserve the initialized Sites/Vinext starter and Cloudflare Worker-compatible ESM output.
- Use a modular monolith with clear product, persistence, integration, and UI boundaries.
- Store durable structured data in Cloudflare D1; no R2 is required for MVP.
- Include schema migrations, deterministic fixtures, automated tests, and concise local-run documentation.

## 13. Privacy, trust, and policy constraints

1. Customers remain anonymous to ReviewQR; no account or contact detail is requested.
2. Google may require/sign in the customer under its own terms. ReviewQR must not state that Google reviews are anonymous.
3. All 1–5 ratings must have the same public-review handoff. Do not suppress, delay, hide, or de-emphasize Google for low ratings.
4. Do not reward positive sentiment or condition an incentive on rating/review content.
5. AI drafts are suggestions based on customer-selected inputs. The customer must be able to edit, replace, or skip them.
6. Do not fabricate experience details or reuse another customer's text as if it were this customer's experience.
7. Historical review data is not stored or trained on in MVP.
8. Do not persist draft or customer free text. If operational logging exists, it must redact request bodies for draft endpoints.
9. Retain aggregate event rows only as long as needed for pilot analysis; default product policy is 90 days pending formal legal review. Restaurant configuration remains until deactivated/deleted by an authorized operator.
10. UI copy must use `handoff`, `opened Google`, or `self-reported`, never `verified review submitted`.

## 14. Failure states and required behavior

| Failure | Customer/operator behavior |
|---|---|
| Unknown/inactive slug | Friendly unavailable page; no destination leak; no generation controls |
| Invalid Google URL during onboarding | Block save and explain accepted official Google URL requirement |
| D1 unavailable during public configuration load | Retryable service-unavailable state; do not show stale/wrong restaurant |
| AI timeout/error/malformed result | Record failure class if possible; return deterministic editable fallback without blaming customer |
| Generation rate limit | Explain short wait and preserve rating/topics; customer can write their own immediately |
| Clipboard denied/unavailable | Show text with select/copy instruction; retain `Open Google without copying` |
| Popup/navigation blocked | Show a direct official Google link and keep draft visible |
| Empty draft on copy | Inline validation; allow open-without-copy |
| Event write fails | Main flow continues when safe; never claim analytics were recorded |
| Duplicate request/retry | No duplicate restaurant; event counting follows defined idempotency/deduplication rules |
| Admin unauthorized | No data returned; authentication/forbidden response |
| No AI configuration | Deterministic fallback is the normal response and clearly testable |

## 15. Architecture and delivery stages with gates

### Stage 0 — Product contract

Deliverables: this PRD, acceptance criteria, and QA matrix.
Gate: Product Manager confirms scope, policy language, and measurable events.

### Stage 1 — Principal architecture and skeleton

Deliverables: context/container design, request flows, data model, API contracts, security model, decision records, test strategy, migration skeleton, and route/module skeleton preserving Sites/Vinext.
Gate tests: dependency/build sanity, schema generation/migration inspection, route/module boundary checks. Principal Architect signs off.

### Stage 2 — Vertical foundation

Deliverables: D1 access, schema/migrations/fixtures, restaurant read flow, stable public route, admin authorization boundary, event ingestion contract.
Gate tests: migrations apply cleanly; repository/API tests for valid, missing, inactive, unauthorized, validation, and idempotency cases.

### Stage 3 — Customer experience and draft service

Deliverables: responsive rating/topic/editor/handoff UI, generation interface with AI and deterministic fallback, accessibility behaviors, event emission.
Gate tests: component/route tests; all ratings receive equal controls; keyboard/mobile behavior; AI error path; clipboard and navigation fallbacks.

### Stage 4 — Admin onboarding, QR, and analytics

Deliverables: protected create/edit form, QR artifact, preview, aggregate analytics.
Gate tests: onboarding acceptance path under five minutes, URL validation, stable QR after edits, authorization, accurate aggregates.

### Stage 5 — Integrated QA and PM acceptance

Deliverables: production build, automated suite, end-to-end browser test report, accessibility and responsive evidence, known-risk register.
Gate: QA passes all P0/P1 cases with no critical/high defects; Product Manager validates product language, scope, and metrics before handing to the user for local acceptance. No deployment occurs.

## 16. Detailed acceptance criteria

### AC-1 Five-minute onboarding

Given an authorized operator has a restaurant name, address label, and official Google review URL, when they create a restaurant, select topics, and activate it, then an active customer route and downloadable QR are available without developer intervention, and a timed trial completes within five minutes.

### AC-2 Permanent QR destination

Given a QR has been generated, when an operator edits topics or the Google URL, then scanning the original QR still opens the same restaurant route and uses the updated configuration.

### AC-3 Anonymous customer

Given a public visitor, when they use the customer flow, then ReviewQR does not require or request identity/contact information and no admin data is exposed.

### AC-4 Equal rating treatment

For each rating 1, 2, 3, 4, and 5, the same topic, own-writing, draft, copy, open-Google, and self-report capabilities are available without additional friction or changed CTA prominence.

### AC-5 Grounded draft

Given restaurant, rating, and selected topics, generated text matches the rating's sentiment, references only supplied topics/facts, is editable, and contains no invented dishes, staff, visit circumstances, or unverifiable superlatives.

### AC-6 Own-review route

Given any rating, when the customer chooses `Write my own`, then they can enter and edit text without first generating AI content and can use either Google handoff option.

### AC-7 AI resilience

Given missing AI configuration, timeout, upstream error, or malformed output, when generation is requested, then a useful deterministic fallback appears within the overall timeout and remains editable.

### AC-8 Clipboard/navigation resilience

Given clipboard success, `Copy & open Google` records copy success and handoff and opens the allowlisted URL. Given clipboard failure, the text stays visible with manual instructions and the official Google link remains usable.

### AC-9 Honest completion language

No customer or admin screen calls a handoff or self-report a verified submission. The UI explicitly states that Google requires the customer to complete posting.

### AC-10 Event correctness

Each taxonomy event uses the required properties, omits prohibited personal/free-text data, applies deduplication rules, and aggregate counts match seeded event fixtures.

### AC-11 Admin security

Unauthenticated or non-allowlisted requests cannot list, create, update, activate, or view analytics for restaurants. Authorization is enforced server-side.

### AC-12 Destination safety

Non-HTTPS, malformed, script, and non-Google URLs are rejected. Public requests cannot use ReviewQR to redirect to an arbitrary host.

### AC-13 Accessibility and responsive use

At 360×800 and desktop widths, the core public flow is readable with no horizontal scrolling; keyboard and screen-reader semantics cover stars, topics, editor, status, and CTAs; contrast and focus visibility meet WCAG AA expectations.

### AC-14 Build and persistence

The Sites/Vinext deployment build succeeds, D1 is declared as `DB`, R2 remains unused, migrations are committed and inspectable, and a fresh local database can be initialized deterministically.

## 17. QA test matrix

| ID | Priority | Area | Test | Expected result |
|---|---|---|---|---|
| QA-001 | P0 | Public route | Open active restaurant slug | Correct identity/topics render; `qr_page_viewed` recorded per rule |
| QA-002 | P0 | Public route | Open unknown and inactive slugs | Friendly unavailable state; no Google URL or controls exposed |
| QA-003 | P0 | Policy | Execute full flow separately for ratings 1–5 | Identical capabilities and CTA prominence for every rating |
| QA-004 | P0 | Draft | Generate from each rating band and topics | Sentiment matches rating; only selected/approved facts appear |
| QA-005 | P0 | Draft | Choose Write my own | Empty editable field opens; generation is not required |
| QA-006 | P0 | AI failure | Disable AI and simulate timeout/error/malformed output | Deterministic editable fallback; flow remains operational |
| QA-007 | P0 | Handoff | Copy succeeds | Exact current editor text copied; handoff uses saved allowlisted URL |
| QA-008 | P0 | Handoff | Deny Clipboard API/pop-up | Manual copy guidance/direct Google link available; text not lost |
| QA-009 | P0 | Security | Save malicious/non-Google destination | Server rejects it; no arbitrary redirect possible |
| QA-010 | P0 | Security | Access every admin read/write without authorization | No data/mutation; authentication or forbidden response |
| QA-011 | P0 | Data | Run migration on fresh D1 and seed fixture once/twice | Schema succeeds; repeated seed does not duplicate fixture |
| QA-012 | P0 | Build | Run full test and production build | Both complete successfully in initialized Vinext structure |
| QA-013 | P1 | Onboarding | Timed create-to-QR trial | Correct active QR available in under five minutes |
| QA-014 | P1 | Stability | Edit Google URL/topics after QR creation | Original public URL unchanged; updated config used |
| QA-015 | P1 | Events | Exercise each funnel transition | Required event present with correct rating/source/length bucket |
| QA-016 | P1 | Privacy | Inspect DB, requests, and logs | No draft/free text, customer identity, raw IP, or clipboard content persisted |
| QA-017 | P1 | Aggregates | Compare UI counts with known seeded events | Event totals/rating distribution exactly match fixtures and dedupe rules |
| QA-018 | P1 | Idempotency | Retry create and event requests | No duplicate restaurant; counting follows taxonomy |
| QA-019 | P1 | Accessibility | Keyboard-only public/admin flow | Logical focus order, visible focus, usable stars/chips/editor/CTAs |
| QA-020 | P1 | Accessibility | Inspect semantics/status announcements | Labels, selected states, errors, and progress are programmatically exposed |
| QA-021 | P1 | Responsive | Test 360×800, 390×844, tablet, desktop | No horizontal overflow; primary action reachable and readable |
| QA-022 | P1 | Validation | Submit empty/too-long text and 0/>3 topics | Clear inline errors; data preserved; allowed alternate path remains |
| QA-023 | P1 | Analytics language | Inspect all customer/admin copy | Uses handoff/self-reported terminology; no verification claim |
| QA-024 | P1 | Performance | Load public route and generate under normal conditions | Meets stated render and usable-draft budgets or logs an explicit risk |
| QA-025 | P2 | Compatibility | Safari/Chrome/Firefox/Edge smoke | Core flow works or documented graceful fallback applies |
| QA-026 | P2 | Unicode | Enter Unicode restaurant and review text | Displays/edits/copies safely without corruption |
| QA-027 | P2 | Rate limiting | Exceed generation threshold | Clear retry message; own-writing path remains available |
| QA-028 | P2 | Event outage | Simulate analytics write failure | Main customer flow continues; no false success claim |

## 18. Release gate and defect policy

- **P0:** safety, policy, security, data-loss, build, or core-flow failure. Zero open at handoff.
- **P1:** major requirement, accessibility, responsive, or analytics correctness failure. Zero open unless the Product Manager explicitly accepts a narrowly documented non-production limitation.
- **P2:** compatibility or polish defect with a safe workaround. May be documented for post-MVP.
- Automated test output and manual QA notes must identify exact commands/fixtures and observed results.
- Product Manager acceptance occurs only after QA reports the P0/P1 matrix status and known risks. The user's own local acceptance remains the final external gate.

## 19. Open decisions resolved for MVP

- **Historical reviews:** do not ingest them in MVP; operator-approved topics/facts provide safe context. Revisit Google Places/Business Profile integrations after validating demand.
- **Google authentication:** ReviewQR does not authenticate customers with Google. Google owns identity at its review page.
- **AI provider:** expose a server-side provider interface; use deterministic fallback by default when no provider credential exists.
- **Commercial model:** deferred until pilot usage data exists; schema and UI do not include billing.
- **Admin audience:** internal ReviewQR operators only.
- **Deployment:** explicitly excluded from this delivery; build and test locally, then hand to the user for acceptance.
