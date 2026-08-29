import { adminConfig, apiError, json, services } from "@/src/infrastructure/http/api";
import { requireAdmin, requireSameOrigin } from "@/src/security/admin-authorization";
import { readJson, validateRestaurant, ValidationError } from "@/src/security/validation";

export async function GET(request: Request) {
  try {
    const { runtime, repository } = services();
    requireAdmin(request, adminConfig(runtime));
    return json({ restaurants: await repository.listRestaurants() }, 200, { "cache-control": "no-store" });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { runtime, repository } = services();
    requireAdmin(request, adminConfig(runtime));
    requireSameOrigin(request);
    const key = request.headers.get("idempotency-key")?.trim();
    if (!key || !/^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/.test(key)) throw new ValidationError("A valid Idempotency-Key header is required.");
    const input = validateRestaurant(await readJson(request));
    return json({ restaurant: await repository.createRestaurant(input, key, Date.now()) }, 201);
  } catch (error) {
    return apiError(error);
  }
}
