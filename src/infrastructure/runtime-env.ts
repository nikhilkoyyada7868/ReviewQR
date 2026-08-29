export interface ReviewQREnv {
  DB: D1Database;
  ADMIN_EMAIL_ALLOWLIST?: string;
  REVIEWQR_ENV?: "development" | "test" | "production";
  REVIEWQR_LOCAL_ADMIN_EMAIL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  REVIEWQR_PUBLIC_BASE_URL?: string;
}

export function asReviewQREnv(value: unknown): ReviewQREnv {
  return value as ReviewQREnv;
}
