import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { D1ReviewQRRepository } from "@/src/infrastructure/d1/repository";
import { configuredDraftGenerators } from "@/src/infrastructure/ai/provider";
import { asReviewQREnv } from "@/src/infrastructure/runtime-env";
import { ReviewService } from "@/src/application/review-service";
import { AdminAuthError } from "@/src/security/admin-authorization";
import { ValidationError } from "@/src/security/validation";

export function services() {
  const runtime = asReviewQREnv(env);
  const repository = new D1ReviewQRRepository(runtime.DB);
  const generators = configuredDraftGenerators(runtime);
  return { runtime, repository, reviewService: new ReviewService(repository, generators.primary, generators.fallback) };
}

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, { status, headers });
}

export function apiError(error: unknown) {
  if (error instanceof ValidationError) return json({ error: { code: "BAD_REQUEST", message: error.message } }, 400);
  if (error instanceof AdminAuthError) return json({ error: { code: error.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", message: error.message } }, error.status);
  if (error instanceof Error && error.name === "NotFoundError") return json({ error: { code: "NOT_FOUND", message: "Restaurant unavailable." } }, 404);
  if (error instanceof Error && error.name === "RateLimitError") return json({ error: { code: "RATE_LIMITED", message: "Please wait briefly or write your own review.", retryAfterSeconds: 60 } }, 429, { "retry-after": "60" });
  console.error("reviewqr_api_error", { name: error instanceof Error ? error.name : "UnknownError" });
  return json({ error: { code: "SERVICE_UNAVAILABLE", message: "ReviewQR is temporarily unavailable." } }, 503);
}

export function routeId(context: { params: Promise<Record<string, string>> }, name: string) {
  return context.params.then((params) => params[name]);
}

export function adminConfig(runtime: ReturnType<typeof asReviewQREnv>) {
  return {
    allowlist: runtime.ADMIN_EMAIL_ALLOWLIST,
    environment: runtime.REVIEWQR_ENV,
    localAdminEmail: runtime.REVIEWQR_LOCAL_ADMIN_EMAIL,
  };
}
