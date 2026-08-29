import { adminConfig, apiError, json, routeId, services } from "@/src/infrastructure/http/api";
import { requireAdmin, requireSameOrigin } from "@/src/security/admin-authorization";
import { readJson, validateRestaurant, ValidationError } from "@/src/security/validation";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { runtime, repository } = services();
    requireAdmin(request, adminConfig(runtime));
    const restaurant = await repository.findById(await routeId(context, "id"));
    return restaurant ? json({ restaurant }) : json({ error: { code: "NOT_FOUND", message: "Restaurant not found." } }, 404);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { runtime, repository } = services();
    requireAdmin(request, adminConfig(runtime));
    requireSameOrigin(request);
    const id = await routeId(context, "id");
    const current = await repository.findById(id);
    if (!current) {
      return json({ error: { code: "NOT_FOUND", message: "Restaurant not found." } }, 404);
    }
    const input = validateRestaurant(await readJson(request));
    if (input.slug !== current.slug) {
      throw new ValidationError("The public slug is permanent after creation.");
    }
    const restaurant = await repository.updateRestaurant(
      id, input, Date.now(),
    );
    return json({ restaurant });
  } catch (error) {
    return apiError(error);
  }
}
