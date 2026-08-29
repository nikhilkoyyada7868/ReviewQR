import assert from "node:assert/strict";
import test from "node:test";
import type { ReviewQRRepository } from "../../src/application/ports/repositories";
import type { DraftGenerator } from "../../src/application/ports/draft-generator";
import type { EventCommand } from "../../src/domain/review";
import type { RestaurantRecord } from "../../src/domain/restaurant";
import { DeterministicDraftGenerator } from "../../src/infrastructure/ai/deterministic";
import { DuplicateRequestError, ReviewService } from "../../src/application/review-service";

const restaurant: RestaurantRecord = {
  id: "restaurant_internal_1234",
  publicId: "restaurant_public_1234",
  slug: "test-cafe",
  displayName: "Test Cafe",
  locationLabel: "Bengaluru",
  googleReviewUrl: "https://g.page/r/test-cafe/review",
  approvedFacts: [],
  status: "active",
  topics: [{ id: "topic_ambience_1234", label: "Ambience", promptDescriptor: "ambience", sortOrder: 0 }],
  createdAt: 1,
  updatedAt: 1,
};

function repository(options: { eventFailure?: boolean } = {}): ReviewQRRepository {
  const keys = new Set<string>();
  return {
    findActiveBySlug: async () => restaurant,
    findByPublicId: async () => restaurant,
    ensureSession: async () => "session_1234",
    sessionBelongsToRestaurant: async () => true,
    consume: async () => true,
    claimOperationKey: async (scope, key) => {
      const compound = `${scope}:${key}`;
      if (keys.has(compound)) return false;
      keys.add(compound);
      return true;
    },
    append: async (command: EventCommand) => {
      void command;
      if (options.eventFailure) throw new Error("analytics unavailable");
      return "created";
    },
    listRestaurants: async () => [restaurant],
    createRestaurant: async () => restaurant,
    updateRestaurant: async () => restaurant,
    analytics: async () => null,
  };
}

const request = {
  sessionId: "session_1234",
  rating: 5 as const,
  topicIds: ["topic_ambience_1234"],
  idempotencyKey: "attempt_1234",
};

test("provider errors and policy-invalid output fall back to a grounded draft", async () => {
  const throwing: DraftGenerator = { generate: async () => { throw new Error("provider down"); } };
  const invalid: DraftGenerator = { generate: async () => ({ text: "This output is unrelated and unsafe.", source: "ai" }) };
  for (const primary of [throwing, invalid]) {
    const service = new ReviewService(repository(), primary, new DeterministicDraftGenerator(), () => 100);
    const result = await service.generate(restaurant.publicId, { ...request, idempotencyKey: crypto.randomUUID() });
    assert.equal(result.source, "fallback");
    assert.match(result.text, /Test Cafe/);
    assert.match(result.text, /ambience/i);
  }
});

test("provider timeout falls back within the configured service deadline", async () => {
  const slow: DraftGenerator = {
    generate: async (_input, signal) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("Timed out", "AbortError")), { once: true });
    }),
  };
  const service = new ReviewService(repository(), slow, new DeterministicDraftGenerator(), () => 100, 10);
  const result = await service.generate(restaurant.publicId, request);
  assert.equal(result.source, "fallback");
});

test("duplicate draft keys are rejected without persisting draft text", async () => {
  const repo = repository();
  const fallback = new DeterministicDraftGenerator();
  const service = new ReviewService(repo, fallback, fallback, () => 100);
  await service.generate(restaurant.publicId, request);
  await assert.rejects(() => service.generate(restaurant.publicId, request), DuplicateRequestError);
});

test("analytics outages do not block a usable customer draft", async () => {
  const fallback = new DeterministicDraftGenerator();
  const service = new ReviewService(repository({ eventFailure: true }), fallback, fallback, () => 100);
  const result = await service.generate(restaurant.publicId, request);
  assert.equal(result.source, "fallback");
  assert.match(result.text, /Test Cafe/);
});
