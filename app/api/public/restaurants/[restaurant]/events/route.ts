import { apiError, json, routeId, services } from "@/src/infrastructure/http/api";
import { readJson, validateEvent } from "@/src/security/validation";

export async function POST(request: Request, context: { params: Promise<{ restaurant: string }> }) {
  try {
    const publicId = await routeId(context, "restaurant");
    const event = validateEvent(await readJson(request, 8_192));
    const { repository, reviewService } = services();
    if (!(await repository.consume(`event:${publicId}:${event.sessionId}`, 60, 60_000))) {
      return json({ error: { code: "RATE_LIMITED", message: "Too many events.", retryAfterSeconds: 60 } }, 429);
    }
    const result = await reviewService.record(publicId, event);
    return json({ recorded: result === "created" }, result === "created" ? 202 : 200);
  } catch (error) {
    return apiError(error);
  }
}
