export const AUTHENTICATED_EMAIL_HEADER = "oai-authenticated-user-email";

export interface AdminIdentity {
  email: string;
}

/**
 * Contract only: the implementation must read trusted platform headers on the
 * server and compare a normalized email against a server-side allowlist.
 */
export interface AdminAuthorizer {
  requireAdmin(request: Request): Promise<AdminIdentity>;
}

export class AdminAuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}

export function requireAdmin(
  request: Request,
  config: {
    allowlist?: string;
    environment?: string;
    localAdminEmail?: string;
  },
): AdminIdentity {
  const url = new URL(request.url);
  const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const platformEmail = request.headers.get(AUTHENTICATED_EMAIL_HEADER);
  const email = platformEmail ?? (
    config.environment !== "production" && isLoopback
      ? config.localAdminEmail
      : undefined
  );
  if (!email) throw new AdminAuthError(401, "Authentication is required.");

  const allowed = new Set(
    (config.allowlist ?? "")
      .split(",")
      .map((value) => value.trim().toLocaleLowerCase())
      .filter(Boolean),
  );
  const normalized = email.trim().toLocaleLowerCase();
  if (!allowed.size || !allowed.has(normalized)) {
    throw new AdminAuthError(403, "You are not authorized for ReviewQR admin.");
  }
  return { email: normalized };
}

export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    throw new AdminAuthError(403, "Cross-origin mutation rejected.");
  }
}
