import Link from "next/link";
import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { asReviewQREnv } from "@/src/infrastructure/runtime-env";
import { requireAdmin } from "@/src/security/admin-authorization";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireChatGPTUser("/admin");
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "reviewqr.internal";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const runtime = asReviewQREnv(env);
  try {
    requireAdmin(new Request(`${protocol}://${host}/admin`, { headers: requestHeaders }), {
      allowlist: runtime.ADMIN_EMAIL_ALLOWLIST,
      environment: runtime.REVIEWQR_ENV,
      localAdminEmail: runtime.REVIEWQR_LOCAL_ADMIN_EMAIL,
    });
  } catch {
    notFound();
  }
  return <div className="admin-shell">
    <header className="admin-header"><Link className="brand" href="/admin"><span className="brand-mark">R</span>ReviewQR <span className="admin-badge">Operator</span></Link><div className="admin-user"><span>{user.displayName}</span><span aria-hidden="true" className="avatar">{user.displayName.slice(0, 1).toUpperCase()}</span></div></header>
    {children}
  </div>;
}
