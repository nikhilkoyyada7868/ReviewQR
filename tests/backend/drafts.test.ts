import assert from "node:assert/strict";
import test from "node:test";
import { DeterministicDraftGenerator, DefaultDraftPolicy } from "../../src/infrastructure/ai/deterministic";
import { lengthBucketForText } from "../../src/domain/review";
import { DuplicateRequestError, NotFoundError, RateLimitError } from "../../src/application/review-service";

test("service errors retain their HTTP mapping identities", () => {
  assert.equal(new NotFoundError().name, "NotFoundError");
  assert.equal(new RateLimitError().name, "RateLimitError");
  assert.equal(new DuplicateRequestError().name, "DuplicateRequestError");
});

test("length buckets use word counts consistently", () => {
  assert.equal(lengthBucketForText("one two three"), "10-24");
  assert.equal(lengthBucketForText(Array.from({ length: 25 }, () => "word").join(" ")), "25-60");
  assert.equal(lengthBucketForText(Array.from({ length: 61 }, () => "word").join(" ")), "61-250");
  assert.equal(lengthBucketForText(Array.from({ length: 251 }, () => "word").join(" ")), "251-1000");
});

for (const rating of [1, 2, 3, 4, 5] as const) {
  test(`deterministic fallback is usable and grounded for rating ${rating}`, async () => {
    const input = {
      restaurantPublicId: "restaurant_1234", restaurantName: "Saffron Yard",
      sessionId: "session_1234", rating, topicIds: ["topic_1234"],
      selectedTopics: [{ label: "Ambience", promptDescriptor: "ambience" }],
      approvedFacts: ["Indian cuisine"],
    };
    const result = await new DeterministicDraftGenerator().generate(input, new AbortController().signal);
    new DefaultDraftPolicy().validate(result, input);
    assert.match(result.text, /Saffron Yard/);
    assert.match(result.text.toLowerCase(), /ambience/);
    assert.doesNotMatch(result.text, /dish|staff|award|price/i);
    assert.equal(result.source, "fallback");
  });
}

const groundedInput = {
  restaurantPublicId: "restaurant_1234", restaurantName: "Saffron Yard",
  sessionId: "session_1234", rating: 5 as const, topicIds: ["topic_1234"],
  selectedTopics: [{ label: "Ambience", promptDescriptor: "ambience" }],
  approvedFacts: ["Indian cuisine"],
};

test("draft policy rejects a valid-length response that is not grounded", () => {
  assert.throws(() => new DefaultDraftPolicy().validate({
    source: "ai",
    text: "This unrelated restaurant was absolutely amazing and offered the best desserts, perfect service, and an unforgettable rooftop view for our celebration.",
  }, groundedInput), /restaurant identity|selected topic/);
});

test("draft policy rejects unsupported claims and rating-mismatched sentiment", () => {
  const policy = new DefaultDraftPolicy();
  assert.throws(() => policy.validate({
    source: "ai",
    text: "Saffron Yard had a pleasant ambience, and its Michelin award-winning chef made this a polished and memorable dining experience for our group.",
  }, groundedInput), /unsupported claim/);
  assert.throws(() => policy.validate({
    source: "ai",
    text: "Saffron Yard had a pleasant ambience, and the biryani was a memorable highlight during our anniversary celebration with friends this evening.",
  }, groundedInput), /unsupported claim/);
  assert.throws(() => policy.validate({
    source: "ai",
    text: "Saffron Yard had a terrible ambience and was the worst experience imaginable, so I would never again consider visiting this place.",
  }, groundedInput), /sentiment/);
});
