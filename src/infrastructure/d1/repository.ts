import type { AdminRestaurantInput, AnalyticsResponse } from "@/src/contracts/http";
import { EVENT_TYPES, RATINGS, type EventCommand } from "@/src/domain/review";
import type { PublicRestaurant, RestaurantRecord } from "@/src/domain/restaurant";
import type { ReviewQRRepository } from "@/src/application/ports/repositories";

type RestaurantRow = {
  id: string;
  public_id: string;
  slug: string;
  display_name: string;
  location_label: string;
  google_review_url: string;
  approved_facts_json: string;
  status: "active" | "inactive";
  created_at: number;
  updated_at: number;
};

type TopicRow = {
  id: string;
  label: string;
  prompt_descriptor: string;
  sort_order: number;
};

function parseFacts(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export class D1ReviewQRRepository implements ReviewQRRepository {
  constructor(private readonly db: D1Database) {}

  async findActiveBySlug(slug: string): Promise<PublicRestaurant | null> {
    const row = await this.db.prepare(
      "SELECT id, public_id, slug, display_name, location_label FROM restaurants WHERE slug = ? AND status = 'active' LIMIT 1",
    ).bind(slug).first<Pick<RestaurantRow, "id" | "public_id" | "slug" | "display_name" | "location_label">>();
    if (!row) return null;
    const topics = await this.activeTopics(row.id);
    return {
      publicId: row.public_id,
      slug: row.slug,
      displayName: row.display_name,
      locationLabel: row.location_label,
      topics,
    };
  }

  async findByPublicId(publicId: string): Promise<RestaurantRecord | null> {
    const row = await this.db.prepare(
      "SELECT * FROM restaurants WHERE public_id = ? LIMIT 1",
    ).bind(publicId).first<RestaurantRow>();
    return row ? this.mapRestaurant(row) : null;
  }

  async findById(id: string): Promise<RestaurantRecord | null> {
    const row = await this.db.prepare("SELECT * FROM restaurants WHERE id = ? LIMIT 1")
      .bind(id).first<RestaurantRow>();
    return row ? this.mapRestaurant(row) : null;
  }

  private async activeTopics(restaurantId: string) {
    const result = await this.db.prepare(
      "SELECT id, label, prompt_descriptor, sort_order FROM topics WHERE restaurant_id = ? AND active = 1 ORDER BY sort_order, id",
    ).bind(restaurantId).all<TopicRow>();
    return result.results.map((topic) => ({
      id: topic.id,
      label: topic.label,
      promptDescriptor: topic.prompt_descriptor,
      sortOrder: topic.sort_order,
    }));
  }

  private async mapRestaurant(row: RestaurantRow): Promise<RestaurantRecord> {
    return {
      id: row.id,
      publicId: row.public_id,
      slug: row.slug,
      displayName: row.display_name,
      locationLabel: row.location_label,
      googleReviewUrl: row.google_review_url,
      approvedFacts: parseFacts(row.approved_facts_json),
      status: row.status,
      topics: await this.activeTopics(row.id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async ensureSession(restaurantId: string, candidateSessionId: string | null, now: number): Promise<string> {
    if (candidateSessionId) {
      const existing = await this.db.prepare(
        "SELECT id FROM review_sessions WHERE id = ? AND restaurant_id = ? LIMIT 1",
      ).bind(candidateSessionId, restaurantId).first<{ id: string }>();
      if (existing) {
        await this.db.prepare("UPDATE review_sessions SET last_activity_at = ? WHERE id = ?")
          .bind(now, existing.id).run();
        return existing.id;
      }
    }
    const id = crypto.randomUUID();
    await this.db.prepare(
      "INSERT INTO review_sessions (id, restaurant_id, created_at, last_activity_at) VALUES (?, ?, ?, ?)",
    ).bind(id, restaurantId, now, now).run();
    return id;
  }

  async sessionBelongsToRestaurant(sessionId: string, restaurantId: string): Promise<boolean> {
    const row = await this.db.prepare(
      "SELECT 1 AS present FROM review_sessions WHERE id = ? AND restaurant_id = ? LIMIT 1",
    ).bind(sessionId, restaurantId).first<{ present: number }>();
    return Boolean(row);
  }

  async claimOperationKey(
    scope: string,
    key: string,
    responseRef: string,
    now: number,
    ttlMs: number,
  ): Promise<boolean> {
    await this.db.prepare(
      "DELETE FROM operation_keys WHERE scope = ? AND key = ? AND expires_at <= ?",
    ).bind(scope, key, now).run();
    const result = await this.db.prepare(
      "INSERT OR IGNORE INTO operation_keys (scope, key, response_ref, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
    ).bind(scope, key, responseRef, now, now + ttlMs).run();
    return result.meta.changes === 1;
  }

  async append(command: EventCommand): Promise<"created" | "duplicate"> {
    const restaurant = await this.findByPublicId(command.restaurantPublicId);
    if (!restaurant || !(await this.sessionBelongsToRestaurant(command.sessionId, restaurant.id))) {
      throw new Error("Event session is not valid for this restaurant.");
    }
    const result = await this.db.prepare(
      "INSERT OR IGNORE INTO analytics_events (id, restaurant_id, session_id, event_type, rating, metadata_json, dedupe_key, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      command.eventId,
      restaurant.id,
      command.sessionId,
      command.eventType,
      command.rating ?? null,
      JSON.stringify(command.metadata),
      command.dedupeKey ?? null,
      command.occurredAt,
    ).run();
    return result.meta.changes === 0 ? "duplicate" : "created";
  }

  async consume(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const row = await this.db.prepare(
      `INSERT INTO rate_limit_buckets (bucket_key, count, window_started_at, expires_at)
       VALUES (?, 1, ?, ?)
       ON CONFLICT(bucket_key) DO UPDATE SET
         count = CASE WHEN expires_at <= excluded.window_started_at THEN 1 ELSE count + 1 END,
         window_started_at = CASE WHEN expires_at <= excluded.window_started_at THEN excluded.window_started_at ELSE window_started_at END,
         expires_at = CASE WHEN expires_at <= excluded.window_started_at THEN excluded.expires_at ELSE expires_at END
       RETURNING count`,
    ).bind(key, now, now + windowMs).first<{ count: number }>();
    return Boolean(row && row.count <= limit);
  }

  async listRestaurants(): Promise<RestaurantRecord[]> {
    const result = await this.db.prepare("SELECT * FROM restaurants ORDER BY display_name, id").all<RestaurantRow>();
    return Promise.all(result.results.map((row) => this.mapRestaurant(row)));
  }

  async createRestaurant(input: AdminRestaurantInput, idempotencyKey: string, now: number): Promise<RestaurantRecord> {
    const scope = "create_restaurant";
    const existing = await this.db.prepare(
      "SELECT response_ref FROM operation_keys WHERE scope = ? AND key = ? AND expires_at > ? LIMIT 1",
    ).bind(scope, idempotencyKey, now).first<{ response_ref: string }>();
    if (existing) {
      const replay = await this.findById(existing.response_ref);
      if (replay) return replay;
    }
    const id = crypto.randomUUID();
    const publicId = crypto.randomUUID();
    const statements: D1PreparedStatement[] = [
      this.db.prepare(
        "INSERT INTO restaurants (id, public_id, slug, display_name, location_label, google_review_url, approved_facts_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind(id, publicId, input.slug, input.displayName, input.locationLabel, input.googleReviewUrl, JSON.stringify(input.approvedFacts), input.status, now, now),
      ...input.topics.map((topic) => this.db.prepare(
        "INSERT INTO topics (id, restaurant_id, label, prompt_descriptor, sort_order, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind(topic.id ?? crypto.randomUUID(), id, topic.label, topic.promptDescriptor, topic.sortOrder, topic.active === false ? 0 : 1, now, now)),
      this.db.prepare(
        "INSERT INTO operation_keys (scope, key, response_ref, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
      ).bind(scope, idempotencyKey, id, now, now + 86_400_000),
    ];
    await this.db.batch(statements);
    return (await this.findById(id))!;
  }

  async updateRestaurant(id: string, input: AdminRestaurantInput, now: number): Promise<RestaurantRecord | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const statements: D1PreparedStatement[] = [
      this.db.prepare(
        "UPDATE restaurants SET display_name = ?, location_label = ?, google_review_url = ?, approved_facts_json = ?, status = ?, updated_at = ? WHERE id = ?",
      ).bind(input.displayName, input.locationLabel, input.googleReviewUrl, JSON.stringify(input.approvedFacts), input.status, now, id),
      this.db.prepare("DELETE FROM topics WHERE restaurant_id = ?").bind(id),
      ...input.topics.map((topic) => this.db.prepare(
        "INSERT INTO topics (id, restaurant_id, label, prompt_descriptor, sort_order, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind(topic.id ?? crypto.randomUUID(), id, topic.label, topic.promptDescriptor, topic.sortOrder, topic.active === false ? 0 : 1, now, now)),
    ];
    await this.db.batch(statements);
    return this.findById(id);
  }

  async analytics(id: string): Promise<AnalyticsResponse | null> {
    if (!(await this.findById(id))) return null;
    const countsResult = await this.db.prepare(
      "SELECT event_type, COUNT(*) AS count FROM analytics_events WHERE restaurant_id = ? GROUP BY event_type",
    ).bind(id).all<{ event_type: (typeof EVENT_TYPES)[number]; count: number }>();
    const counts = Object.fromEntries(EVENT_TYPES.map((type) => [type, 0])) as AnalyticsResponse["counts"];
    for (const row of countsResult.results) counts[row.event_type] = row.count;

    const ratingResult = await this.db.prepare(
      `WITH ranked AS (
         SELECT session_id, rating, ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at DESC, id DESC) AS rank
         FROM analytics_events
         WHERE restaurant_id = ? AND event_type = 'rating_selected' AND rating IS NOT NULL
       ) SELECT rating, COUNT(*) AS count FROM ranked WHERE rank = 1 GROUP BY rating`,
    ).bind(id).all<{ rating: number; count: number }>();
    const ratingDistribution = Object.fromEntries(RATINGS.map((value) => [value, 0])) as AnalyticsResponse["ratingDistribution"];
    for (const row of ratingResult.results) {
      if (RATINGS.includes(row.rating as (typeof RATINGS)[number])) {
        ratingDistribution[row.rating as (typeof RATINGS)[number]] = row.count;
      }
    }
    return { counts, ratingDistribution };
  }
}
