import { adminConfig, apiError, json, routeId, services } from "@/src/infrastructure/http/api";
import { requireAdmin } from "@/src/security/admin-authorization";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { runtime, repository } = services();
    requireAdmin(request, adminConfig(runtime));
    const analytics = await repository.analytics(await routeId(context, "id"));
    return analytics ? json(analytics, 200, { "cache-control": "no-store" }) : json({ error: { code: "NOT_FOUND", message: "Restaurant not found." } }, 404);
  } catch (error) {
    return apiError(error);
  }
}
