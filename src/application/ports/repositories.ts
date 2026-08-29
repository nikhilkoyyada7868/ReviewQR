import type { EventCommand } from "@/src/domain/review";
import type { PublicRestaurant, RestaurantRecord } from "@/src/domain/restaurant";
import type { AdminRestaurantInput, AnalyticsResponse } from "@/src/contracts/http";

export interface RestaurantRepository {
  findActiveBySlug(slug: string): Promise<PublicRestaurant | null>;
  findByPublicId(publicId: string): Promise<RestaurantRecord | null>;
}

export interface EventRepository {
  append(command: EventCommand): Promise<"created" | "duplicate">;
}

export interface RateLimiter {
  consume(key: string, limit: number, windowMs: number): Promise<boolean>;
}

export interface ReviewQRRepository
  extends RestaurantRepository,
    EventRepository,
    RateLimiter {
  ensureSession(
    restaurantId: string,
    candidateSessionId: string | null,
    now: number,
  ): Promise<string>;
  sessionBelongsToRestaurant(
    sessionId: string,
    restaurantId: string,
  ): Promise<boolean>;
  claimOperationKey(
    scope: string,
    key: string,
    responseRef: string,
    now: number,
    ttlMs: number,
  ): Promise<boolean>;
  listRestaurants(): Promise<RestaurantRecord[]>;
  createRestaurant(
    input: AdminRestaurantInput,
    idempotencyKey: string,
    now: number,
  ): Promise<RestaurantRecord>;
  updateRestaurant(
    id: string,
    input: AdminRestaurantInput,
    now: number,
  ): Promise<RestaurantRecord | null>;
  analytics(id: string): Promise<AnalyticsResponse | null>;
}
