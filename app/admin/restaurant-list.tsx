"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { RestaurantRecord } from "@/src/domain/restaurant";

export function RestaurantList() {
  const [items, setItems] = useState<RestaurantRecord[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/restaurants", { cache: "no-store" });
      const body = await response.json() as { restaurants?: RestaurantRecord[]; error?: { message: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Unable to load restaurants.");
      setItems(body.restaurants ?? []); setState("ready");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load restaurants."); setState("error"); }
  }, []);
  // Initial client hydration synchronizes this protected view with its API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  if (state === "loading") return <div className="admin-panel admin-loading" role="status"><span className="loader" aria-hidden="true"/>Loading restaurants…</div>;
  if (state === "error") return <div className="admin-panel empty-state"><h2>Restaurant data is unavailable</h2><p>{message}</p><p className="subtle">Your operator identity must also appear in the configured admin allowlist.</p><button className="button button-secondary" onClick={() => { setState("loading"); void load(); }}>Try again</button></div>;
  if (!items.length) return <div className="admin-panel empty-state"><div className="empty-icon" aria-hidden="true">＋</div><h2>Add your first restaurant</h2><p>A prepared operator can create an active QR destination in under five minutes.</p><Link className="button button-primary" href="/admin/restaurants/new">Start onboarding</Link></div>;
  return <div className="admin-panel table-wrap"><table className="admin-table"><thead><tr><th>Restaurant</th><th>Status</th><th>Topics</th><th>Last updated</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.displayName}</strong><span>{item.locationLabel}</span></td><td><span className={`status-pill status-${item.status}`}>{item.status}</span></td><td>{item.topics.length}</td><td>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(item.updatedAt))}</td><td><Link className="text-link" href={`/admin/restaurants/${encodeURIComponent(item.id)}`}>Manage <span aria-hidden="true">→</span></Link></td></tr>)}</tbody></table></div>;
}
