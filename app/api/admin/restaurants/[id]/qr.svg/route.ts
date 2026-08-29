import QRCode from "qrcode";
import { adminConfig, apiError, json, routeId, services } from "@/src/infrastructure/http/api";
import { requireAdmin } from "@/src/security/admin-authorization";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { runtime, repository } = services();
    requireAdmin(request, adminConfig(runtime));
    const restaurant = await repository.findById(await routeId(context, "id"));
    if (!restaurant) return json({ error: { code: "NOT_FOUND", message: "Restaurant not found." } }, 404);
    const configuredBase = (runtime as typeof runtime & { REVIEWQR_PUBLIC_BASE_URL?: string }).REVIEWQR_PUBLIC_BASE_URL;
    const base = configuredBase ? new URL(configuredBase).origin : new URL(request.url).origin;
    const publicUrl = new URL(`/r/${restaurant.slug}`, base).toString();
    const svg = await QRCode.toString(publicUrl, { type: "svg", errorCorrectionLevel: "M", margin: 2, width: 512 });
    return new Response(svg, {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "content-disposition": `attachment; filename="${restaurant.slug}-reviewqr.svg"`,
        "cache-control": "no-store",
        "x-reviewqr-url": publicUrl,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
