import { apiError, json, routeId, services } from "@/src/infrastructure/http/api";
import { parseGoogleReviewUrl } from "@/src/security/google-review-url";
import { readJson, validateHandoff } from "@/src/security/validation";

export async function POST(request: Request, context: { params: Promise<{ restaurant: string }> }) {
  try {
    const publicId = await routeId(context, "restaurant");
    const input = validateHandoff(await readJson(request, 8_192));
    const { repository, reviewService } = services();
    const restaurant = await repository.findByPublicId(publicId);
    if (!restaurant || restaurant.status !== "active" || !(await repository.sessionBelongsToRestaurant(input.sessionId, restaurant.id))) {
      return json({ error: { code: "NOT_FOUND", message: "Restaurant unavailable." } }, 404);
    }
    const destination = parseGoogleReviewUrl(restaurant.googleReviewUrl);
    if (!destination) throw new Error("Stored Google destination failed validation.");
    const recorded = await reviewService.record(publicId, {
      ...input, eventType: "google_handoff_clicked",
    }).then(() => true).catch(() => false);
    return json({ destination: destination.toString(), analyticsRecorded: recorded }, 200, { "cache-control": "no-store" });
  } catch (error) {
    return apiError(error);
  }
}
