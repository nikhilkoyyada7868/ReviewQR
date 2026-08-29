import assert from "node:assert/strict";
import test from "node:test";
import { isGoogleReviewUrl } from "../../src/security/google-review-url";
import { AdminAuthError, requireAdmin, requireSameOrigin } from "../../src/security/admin-authorization";
import { validateEvent, validateGenerateDraft, validateRestaurant, ValidationError } from "../../src/security/validation";

test("allows only narrow HTTPS Google review destinations", () => {
  for (const url of [
    "https://g.page/r/abc_123/review",
    "https://maps.app.goo.gl/AbC_123",
    "https://search.google.com/local/writereview?placeid=abc",
    "https://www.google.com/maps/place/Test/data=abc",
  ]) assert.equal(isGoogleReviewUrl(url), true, url);
  for (const url of [
    "javascript:alert(1)", "http://g.page/r/a/review",
    "https://g.page.evil.test/r/a/review", "https://user@g.page/r/a/review",
    "https://www.google.com/search?q=restaurant", "https://example.com/maps",
  ]) assert.equal(isGoogleReviewUrl(url), false, url);
});

test("admin authorization fails closed and checks origin", () => {
  const request = new Request("https://app.example/api/admin/restaurants", {
    headers: { "oai-authenticated-user-email": "Admin@Example.com", origin: "https://app.example" },
  });
  assert.deepEqual(requireAdmin(request, { allowlist: "admin@example.com" }), { email: "admin@example.com" });
  requireSameOrigin(request);
  assert.throws(() => requireAdmin(request, {}), AdminAuthError);
  assert.throws(() => requireSameOrigin(new Request(request.url, { headers: { origin: "https://evil.test" } })), AdminAuthError);
});

test("draft and event contracts reject unknown, unsafe, and excessive input", () => {
  const request = validateGenerateDraft({
    sessionId: "session_1234", rating: 1,
    topicIds: ["topic_1234"], idempotencyKey: "attempt_1234",
  });
  assert.equal(request.rating, 1);
  assert.throws(() => validateGenerateDraft({ ...request, rating: 0 }), ValidationError);
  assert.throws(() => validateGenerateDraft({ ...request, topicIds: ["topic_1234", "topic_1234"] }), ValidationError);
  assert.throws(() => validateEvent({ eventId: "event_1234", sessionId: "session_1234", eventType: "draft_copied" }), ValidationError);
});

test("restaurant onboarding validates topic count and Google destination", () => {
  const topics = ["Food", "Service", "Ambience"].map((label, index) => ({ label, promptDescriptor: label.toLowerCase(), sortOrder: index }));
  const valid = validateRestaurant({
    slug: "saffron-yard", displayName: "Saffron Yard", locationLabel: "Bengaluru",
    googleReviewUrl: "https://g.page/r/saffron-yard/review", approvedFacts: [], status: "active", topics,
  });
  assert.equal(valid.topics.length, 3);
  assert.throws(() => validateRestaurant({ ...valid, googleReviewUrl: "https://evil.test/review" }), ValidationError);
});
