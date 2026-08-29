import type { GenerateDraftRequest, GenerateDraftResponse, RecordEventRequest } from "@/src/contracts/http";
import type { EventCommand } from "@/src/domain/review";
import type { ReviewQRRepository } from "@/src/application/ports/repositories";
import type { DraftGenerator } from "@/src/application/ports/draft-generator";
import { DefaultDraftPolicy } from "@/src/infrastructure/ai/deterministic";

export class NotFoundError extends Error {}
export class RateLimitError extends Error {}
type RecordableEvent = RecordEventRequest & { failureReason?: string };

export class ReviewService {
  private readonly policy = new DefaultDraftPolicy();

  constructor(
    private readonly repository: ReviewQRRepository,
    private readonly primary: DraftGenerator,
    private readonly fallback: DraftGenerator,
    private readonly now: () => number = Date.now,
  ) {}

  async generate(publicId: string, request: GenerateDraftRequest): Promise<GenerateDraftResponse> {
    const restaurant = await this.repository.findByPublicId(publicId);
    if (!restaurant || restaurant.status !== "active") throw new NotFoundError();
    if (!(await this.repository.sessionBelongsToRestaurant(request.sessionId, restaurant.id))) throw new NotFoundError();
    const selectedTopics = request.topicIds.map((id) => restaurant.topics.find((topic) => topic.id === id));
    if (selectedTopics.some((topic) => !topic)) throw new NotFoundError();
    if (!(await this.repository.consume(`draft:${restaurant.id}:${request.sessionId}`, 5, 60_000))) {
      throw new RateLimitError();
    }
    const now = this.now();
    const input = {
      restaurantPublicId: publicId,
      restaurantName: restaurant.displayName,
      sessionId: request.sessionId,
      rating: request.rating,
      topicIds: request.topicIds,
      selectedTopics: selectedTopics as { label: string; promptDescriptor: string }[],
      approvedFacts: restaurant.approvedFacts,
      customerDetail: request.customerDetail,
    };
    await this.record(publicId, {
      eventId: crypto.randomUUID(), sessionId: request.sessionId,
      eventType: "topics_selected", topicIds: request.topicIds,
      topicCount: request.topicIds.length,
    }, now);
    const draftId = crypto.randomUUID();
    let result;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      try {
        result = await this.primary.generate(input, controller.signal);
        this.policy.validate(result, input);
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      await this.record(publicId, {
        eventId: crypto.randomUUID(), sessionId: request.sessionId,
        eventType: "draft_generation_failed",
        failureReason: error instanceof DOMException && error.name === "AbortError" ? "timeout" : "provider_error",
      }, now);
      result = await this.fallback.generate(input, new AbortController().signal);
      this.policy.validate(result, input);
    }
    await this.record(publicId, {
      eventId: draftId, sessionId: request.sessionId, eventType: "draft_generated",
      rating: request.rating, draftSource: result.source,
      lengthBucket: wordLengthBucket(result.text), draftId,
    }, now);
    return { ...result, draftId, generatedAt: now };
  }

  async record(publicId: string, request: RecordableEvent, now = this.now()) {
    const metadata: Record<string, string | number | boolean> = {};
    for (const key of ["draftSource", "topicCount", "lengthBucket", "copyOutcome", "edited", "failureReason"] as const) {
      const value = request[key];
      if (["string", "number", "boolean"].includes(typeof value)) metadata[key] = value as string | number | boolean;
    }
    if (request.topicIds) metadata.topicIds = request.topicIds.join(",");
    if (request.draftId) metadata.draftId = request.draftId;
    let dedupeKey: string | undefined;
    if (request.eventType === "completion_self_reported") dedupeKey = `completion:${request.sessionId}`;
    if (request.eventType === "draft_edited") dedupeKey = `edited:${request.sessionId}:${request.draftId ?? request.eventId}`;
    const command: EventCommand = {
      eventId: request.eventId,
      restaurantPublicId: publicId,
      sessionId: request.sessionId,
      eventType: request.eventType,
      rating: request.rating,
      metadata,
      dedupeKey,
      occurredAt: now,
    };
    return this.repository.append(command);
  }
}

function wordLengthBucket(text: string): "10-24" | "25-60" | "61-250" | "251-1000" {
  const count = text.trim().split(/\s+/u).filter(Boolean).length;
  if (count <= 24) return "10-24";
  if (count <= 60) return "25-60";
  if (count <= 250) return "61-250";
  return "251-1000";
}
