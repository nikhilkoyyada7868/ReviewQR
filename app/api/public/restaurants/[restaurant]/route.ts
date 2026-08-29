import { apiError, json, routeId, services } from "@/src/infrastructure/http/api";

const COOKIE = "rq_session";

function cookieValue(request: Request, name: string): string | null {
  const match = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function GET(request: Request, context: { params: Promise<{ restaurant: string }> }) {
  try {
    const slug = (await routeId(context, "restaurant")).trim().toLowerCase();
    const { repository } = services();
    const restaurant = await repository.findActiveBySlug(slug);
    if (!restaurant) return json({ error: { code: "NOT_FOUND", message: "Restaurant unavailable." } }, 404);
    const record = await repository.findByPublicId(restaurant.publicId);
    if (!record) throw new Error("Active restaurant record disappeared.");
    const now = Date.now();
    const sessionId = await repository.ensureSession(record.id, cookieValue(request, COOKIE), now);
    await repository.append({
      eventId: crypto.randomUUID(), restaurantPublicId: restaurant.publicId,
      sessionId, eventType: "qr_page_viewed", metadata: {},
      dedupeKey: `view:${sessionId}:${Math.floor(now / 1_800_000)}`, occurredAt: now,
    }).catch(() => undefined);
    return json({ restaurant, sessionId }, 200, {
      "set-cookie": `${COOKIE}=${encodeURIComponent(sessionId)}; Path=/r; Max-Age=86400; HttpOnly; Secure; SameSite=Lax`,
      "cache-control": "no-store",
    });
  } catch (error) {
    return apiError(error);
  }
}
