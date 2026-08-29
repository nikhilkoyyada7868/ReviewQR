export const RATINGS = [1, 2, 3, 4, 5] as const;
export type Rating = (typeof RATINGS)[number];

export const EVENT_TYPES = [
  "qr_page_viewed",
  "rating_selected",
  "topics_selected",
  "draft_generated",
  "draft_generation_failed",
  "draft_edited",
  "draft_copied",
  "google_handoff_clicked",
  "completion_self_reported",
] as const;

export type AnalyticsEventType = (typeof EVENT_TYPES)[number];
export type DraftSource = "ai" | "fallback" | "customer";
export type LengthBucket = "10-24" | "25-60" | "61-250" | "251-1000";

export function lengthBucketForText(text: string): LengthBucket {
  const count = text.trim().split(/\s+/u).filter(Boolean).length;
  if (count <= 24) return "10-24";
  if (count <= 60) return "25-60";
  if (count <= 250) return "61-250";
  return "251-1000";
}

export interface DraftRequest {
  restaurantPublicId: string;
  sessionId: string;
  rating: Rating;
  topicIds: readonly string[];
  /** Request-scoped only. Implementations must never persist or log this. */
  customerDetail?: string;
}

export interface DraftResult {
  text: string;
  source: Exclude<DraftSource, "customer">;
}

export interface EventCommand {
  eventId: string;
  restaurantPublicId: string;
  sessionId: string;
  eventType: AnalyticsEventType;
  rating?: Rating;
  dedupeKey?: string;
  metadata: Readonly<Record<string, string | number | boolean>>;
  occurredAt: number;
}
