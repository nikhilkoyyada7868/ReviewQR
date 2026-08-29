import type { AnalyticsEventType, DraftResult, DraftSource, Rating } from "@/src/domain/review";
import type { PublicRestaurant } from "@/src/domain/restaurant";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INACTIVE_RESTAURANT"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE";

export interface ApiError {
  error: { code: ApiErrorCode; message: string; retryAfterSeconds?: number };
}

export interface PublicRestaurantResponse {
  restaurant: PublicRestaurant;
  sessionId: string;
}

export interface GenerateDraftRequest {
  sessionId: string;
  rating: Rating;
  topicIds: string[];
  customerDetail?: string;
  idempotencyKey: string;
}

export interface GenerateDraftResponse extends DraftResult {
  draftId: string;
  generatedAt: number;
}

export interface RecordEventRequest {
  eventId: string;
  sessionId: string;
  eventType: AnalyticsEventType;
  rating?: Rating;
  draftSource?: DraftSource;
  topicIds?: string[];
  topicCount?: number;
  lengthBucket?: string;
  copyOutcome?: "succeeded" | "failed" | "skipped";
  edited?: boolean;
  draftId?: string;
}

export interface HandoffRequest {
  eventId: string;
  sessionId: string;
  rating: Rating;
  copyOutcome: "succeeded" | "failed" | "skipped";
}

export interface HandoffResponse {
  destination: string;
  analyticsRecorded: boolean;
}

export interface AdminTopicInput {
  id?: string;
  label: string;
  promptDescriptor: string;
  sortOrder: number;
  active?: boolean;
}

export interface AdminRestaurantInput {
  slug: string;
  displayName: string;
  locationLabel: string;
  googleReviewUrl: string;
  approvedFacts: string[];
  status: "active" | "inactive";
  topics: AdminTopicInput[];
}

export interface AnalyticsResponse {
  counts: Record<AnalyticsEventType, number>;
  ratingDistribution: Record<Rating, number>;
}
