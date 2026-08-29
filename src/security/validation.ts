import type {
  AdminRestaurantInput,
  GenerateDraftRequest,
  HandoffRequest,
  RecordEventRequest,
} from "@/src/contracts/http";
import { EVENT_TYPES, RATINGS, type Rating } from "@/src/domain/review";
import { isGoogleReviewUrl } from "./google-review-url";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("A JSON object is required.");
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extras.length) throw new ValidationError(`Unknown field: ${extras[0]}`);
}

function string(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== "string") throw new ValidationError(`${field} is required.`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new ValidationError(`${field} must be ${min}-${max} characters.`);
  }
  return normalized;
}

function id(value: unknown, field: string): string {
  const result = string(value, field, 8, 128);
  if (!ID.test(result)) throw new ValidationError(`${field} is invalid.`);
  return result;
}

function rating(value: unknown): Rating {
  if (!RATINGS.includes(value as Rating)) {
    throw new ValidationError("rating must be an integer from 1 to 5.");
  }
  return value as Rating;
}

export function validateGenerateDraft(value: unknown): GenerateDraftRequest {
  const input = object(value);
  exactKeys(input, ["sessionId", "rating", "topicIds", "customerDetail", "idempotencyKey"]);
  if (!Array.isArray(input.topicIds) || input.topicIds.length < 1 || input.topicIds.length > 3) {
    throw new ValidationError("Select between 1 and 3 topics.");
  }
  const topicIds = input.topicIds.map((value) => id(value, "topicId"));
  if (new Set(topicIds).size !== topicIds.length) {
    throw new ValidationError("Topics must be unique.");
  }
  const detail = input.customerDetail === undefined
    ? undefined
    : string(input.customerDetail, "customerDetail", 1, 300);
  return {
    sessionId: id(input.sessionId, "sessionId"),
    rating: rating(input.rating),
    topicIds,
    customerDetail: detail,
    idempotencyKey: id(input.idempotencyKey, "idempotencyKey"),
  };
}

export function validateEvent(value: unknown): RecordEventRequest {
  const input = object(value);
  exactKeys(input, [
    "eventId", "sessionId", "eventType", "rating", "draftSource", "topicIds",
    "topicCount", "lengthBucket", "copyOutcome", "edited", "draftId",
  ]);
  if (!EVENT_TYPES.includes(input.eventType as (typeof EVENT_TYPES)[number])) {
    throw new ValidationError("eventType is invalid.");
  }
  const result: RecordEventRequest = {
    eventId: id(input.eventId, "eventId"),
    sessionId: id(input.sessionId, "sessionId"),
    eventType: input.eventType as RecordEventRequest["eventType"],
  };
  if (input.rating !== undefined) result.rating = rating(input.rating);
  if (input.draftSource !== undefined) {
    if (!["ai", "fallback", "customer"].includes(String(input.draftSource))) {
      throw new ValidationError("draftSource is invalid.");
    }
    result.draftSource = input.draftSource as RecordEventRequest["draftSource"];
  }
  if (input.topicIds !== undefined) {
    if (!Array.isArray(input.topicIds) || input.topicIds.length > 3) {
      throw new ValidationError("topicIds is invalid.");
    }
    result.topicIds = input.topicIds.map((value) => id(value, "topicId"));
  }
  if (input.topicCount !== undefined) {
    if (!Number.isInteger(input.topicCount) || Number(input.topicCount) < 0 || Number(input.topicCount) > 3) {
      throw new ValidationError("topicCount is invalid.");
    }
    result.topicCount = Number(input.topicCount);
  }
  if (input.lengthBucket !== undefined) {
    if (!["10-24", "25-60", "61-250", "251-1000"].includes(String(input.lengthBucket))) {
      throw new ValidationError("lengthBucket is invalid.");
    }
    result.lengthBucket = String(input.lengthBucket);
  }
  if (input.copyOutcome !== undefined) {
    if (!["succeeded", "failed", "skipped"].includes(String(input.copyOutcome))) {
      throw new ValidationError("copyOutcome is invalid.");
    }
    result.copyOutcome = input.copyOutcome as RecordEventRequest["copyOutcome"];
  }
  if (input.edited !== undefined) {
    if (typeof input.edited !== "boolean") throw new ValidationError("edited is invalid.");
    result.edited = input.edited;
  }
  if (input.draftId !== undefined) result.draftId = id(input.draftId, "draftId");
  validateEventRequirements(result);
  return result;
}

function validateEventRequirements(event: RecordEventRequest) {
  const needsRating = new Set([
    "rating_selected", "draft_generated", "draft_copied",
    "google_handoff_clicked", "completion_self_reported",
  ]);
  if (needsRating.has(event.eventType) && event.rating === undefined) {
    throw new ValidationError("rating is required for this event.");
  }
  if (event.eventType === "topics_selected" && (!event.topicIds?.length || event.topicCount !== event.topicIds.length)) {
    throw new ValidationError("topic identifiers and count are required.");
  }
}

export function validateHandoff(value: unknown): HandoffRequest {
  const input = object(value);
  exactKeys(input, ["eventId", "sessionId", "rating", "copyOutcome"]);
  const outcome = String(input.copyOutcome);
  if (!["succeeded", "failed", "skipped"].includes(outcome)) {
    throw new ValidationError("copyOutcome is invalid.");
  }
  return {
    eventId: id(input.eventId, "eventId"),
    sessionId: id(input.sessionId, "sessionId"),
    rating: rating(input.rating),
    copyOutcome: outcome as HandoffRequest["copyOutcome"],
  };
}

export function validateRestaurant(value: unknown): AdminRestaurantInput {
  const input = object(value);
  exactKeys(input, ["slug", "displayName", "locationLabel", "googleReviewUrl", "approvedFacts", "status", "topics"]);
  const slug = string(input.slug, "slug", 2, 80).toLowerCase();
  if (!SLUG.test(slug)) throw new ValidationError("slug must contain lowercase words separated by hyphens.");
  const googleReviewUrl = string(input.googleReviewUrl, "googleReviewUrl", 10, 2048);
  if (!isGoogleReviewUrl(googleReviewUrl)) throw new ValidationError("A supported official Google review URL is required.");
  if (!Array.isArray(input.approvedFacts) || input.approvedFacts.length > 8) {
    throw new ValidationError("approvedFacts must contain at most 8 items.");
  }
  if (!Array.isArray(input.topics) || input.topics.length < 3 || input.topics.length > 8) {
    throw new ValidationError("topics must contain 3-8 items.");
  }
  const approvedFacts = input.approvedFacts.map((value) => string(value, "approvedFact", 1, 160));
  const topics = input.topics.map((value, index) => {
    const topic = object(value);
    exactKeys(topic, ["id", "label", "promptDescriptor", "sortOrder", "active"]);
    const sortOrder = topic.sortOrder ?? index;
    if (!Number.isInteger(sortOrder) || Number(sortOrder) < 0 || Number(sortOrder) > 100) {
      throw new ValidationError("topic sortOrder is invalid.");
    }
    return {
      ...(topic.id === undefined ? {} : { id: id(topic.id, "topicId") }),
      label: string(topic.label, "topic label", 1, 40),
      promptDescriptor: string(topic.promptDescriptor, "promptDescriptor", 1, 120),
      sortOrder: Number(sortOrder),
      active: topic.active === undefined ? true : Boolean(topic.active),
    };
  });
  const activeCount = topics.filter((topic) => topic.active).length;
  if (activeCount < 3 || activeCount > 8) throw new ValidationError("3-8 topics must be active.");
  if (new Set(topics.map((topic) => topic.label.toLocaleLowerCase())).size !== topics.length) {
    throw new ValidationError("Topic labels must be unique.");
  }
  if (input.status !== "active" && input.status !== "inactive") {
    throw new ValidationError("status is invalid.");
  }
  return {
    slug,
    displayName: string(input.displayName, "displayName", 2, 120),
    locationLabel: string(input.locationLabel, "locationLabel", 2, 200),
    googleReviewUrl,
    approvedFacts,
    status: input.status,
    topics,
  };
}

export async function readJson(request: Request, maxBytes = 16_384): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new ValidationError("Content-Type must be application/json.");
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new ValidationError("Request body is too large.");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new ValidationError("Request body is too large.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ValidationError("Malformed JSON.");
  }
}
