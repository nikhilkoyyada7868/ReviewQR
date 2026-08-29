import { apiError, json, routeId, services } from "@/src/infrastructure/http/api";
import { readJson, validateGenerateDraft } from "@/src/security/validation";

export async function POST(request: Request, context: { params: Promise<{ restaurant: string }> }) {
  try {
    const publicId = await routeId(context, "restaurant");
    const input = validateGenerateDraft(await readJson(request));
    const { reviewService } = services();
    return json(await reviewService.generate(publicId, input));
  } catch (error) {
    return apiError(error);
  }
}
