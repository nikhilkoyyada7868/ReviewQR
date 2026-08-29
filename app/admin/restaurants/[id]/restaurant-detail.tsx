"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { AnalyticsResponse } from "@/src/contracts/http";
import type { RestaurantRecord } from "@/src/domain/restaurant";
import { RestaurantForm } from "../restaurant-form";

const metricLabels: { key: keyof AnalyticsResponse["counts"]; label: string; note: string }[] = [
  { key: "qr_page_viewed", label: "QR page views", note: "Deduplicated scan sessions" },
  { key: "rating_selected", label: "Rating selections", note: "Selection events" },
  { key: "draft_generated", label: "Drafts generated", note: "AI and fallback suggestions" },
  { key: "draft_edited", label: "Drafts edited", note: "Measured edit events" },
  { key: "draft_copied", label: "Drafts copied", note: "Successful copy actions" },
  { key: "google_handoff_clicked", label: "Google handoffs", note: "Google CTA activations" },
  { key: "completion_self_reported", label: "Self-reported completions", note: "Customer reported, not verified" },
];

export function RestaurantDetail({ id }: { id: string }) {
  const [record, setRecord] = useState<RestaurantRecord | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"overview" | "edit">("overview");
  const load = useCallback(async () => {
    try {
      const [detailResponse, analyticsResponse] = await Promise.all([
        fetch(`/api/admin/restaurants/${encodeURIComponent(id)}`, { cache: "no-store" }),
        fetch(`/api/admin/restaurants/${encodeURIComponent(id)}/analytics`, { cache: "no-store" }),
      ]);
      const detail = await detailResponse.json() as { restaurant?: RestaurantRecord; error?: { message: string } };
      if (!detailResponse.ok || !detail.restaurant) throw new Error(detail.error?.message ?? "Restaurant not found.");
      setRecord(detail.restaurant);
      if (analyticsResponse.ok) setAnalytics(await analyticsResponse.json() as AnalyticsResponse);
      setState("ready");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load this restaurant."); setState("error"); }
  }, [id]);
  // Initial client hydration synchronizes this protected view with its API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  if (state === "loading") return <div className="admin-panel admin-loading" role="status"><span className="loader" aria-hidden="true"/>Loading restaurant…</div>;
  if (state === "error" || !record) return <div className="admin-panel empty-state"><h1>Restaurant unavailable</h1><p>{message}</p><button className="button button-secondary" onClick={() => { setState("loading"); void load(); }}>Try again</button></div>;
  const totalRatings = analytics ? Object.values(analytics.ratingDistribution).reduce((sum, value) => sum + value, 0) : 0;
  return <>
    <div className="admin-title-row detail-heading"><div><div className="detail-status"><span className={`status-pill status-${record.status}`}>{record.status}</span><span>/r/{record.slug}</span></div><h1>{record.displayName}</h1><p>{record.locationLabel}</p></div><div className="detail-actions"><Link className="button button-secondary" href={`/r/${encodeURIComponent(record.slug)}`} target="_blank">Preview customer page ↗</Link><a className="button button-primary" href={`/api/admin/restaurants/${encodeURIComponent(record.id)}/qr.svg`} download>Download QR</a></div></div>
    <div className="tabs" role="tablist" aria-label="Restaurant sections"><button role="tab" aria-selected={tab === "overview"} onClick={() => setTab("overview")}>Overview &amp; QR</button><button role="tab" aria-selected={tab === "edit"} onClick={() => setTab("edit")}>Edit setup</button></div>
    {tab === "edit" ? <RestaurantForm record={record} /> : <div className="detail-grid">
      <section className="admin-panel qr-panel"><div className="panel-heading"><div><h2>Permanent customer QR</h2><p>Print this code for tables, receipts, or the front desk.</p></div></div><div className="qr-content"><div className="qr-frame"><img src={`/api/admin/restaurants/${encodeURIComponent(record.id)}/qr.svg`} alt={`QR code for ${record.displayName} review page`} /></div><div><strong>{record.displayName}</strong><code>/r/{record.slug}</code><p>Changing the Google destination, topics, or facts will not change this QR.</p><a className="text-link" href={`/api/admin/restaurants/${encodeURIComponent(record.id)}/qr.svg`} download>Download SVG <span aria-hidden="true">↓</span></a></div></div></section>
      <section className="admin-panel configuration-panel"><div className="panel-heading"><h2>Current setup</h2><button className="text-button" onClick={() => setTab("edit")}>Edit</button></div><dl className="config-list"><div><dt>Status</dt><dd><span className={`status-pill status-${record.status}`}>{record.status}</span></dd></div><div><dt>Highlights</dt><dd>{record.topics.map((topic) => <span className="small-chip" key={topic.id}>{topic.label}</span>)}</dd></div><div><dt>Approved facts</dt><dd>{record.approvedFacts.length ? record.approvedFacts.join(" · ") : "None added"}</dd></div><div><dt>Google destination</dt><dd>Saved and validated server-side</dd></div></dl></section>
      <section className="admin-panel analytics-panel"><div className="panel-heading"><div><h2>Measured funnel</h2><p>Observable ReviewQR activity only. Google publication is not verified.</p></div></div>{analytics ? <><div className="metrics-grid">{metricLabels.map((metric) => <article key={metric.key}><span>{metric.label}</span><strong>{analytics.counts[metric.key].toLocaleString()}</strong><small>{metric.note}</small></article>)}</div><div className="rating-chart"><h3>Latest rating by session</h3>{([5, 4, 3, 2, 1] as const).map((value) => { const count = analytics.ratingDistribution[value]; const percentage = totalRatings ? Math.round(count / totalRatings * 100) : 0; return <div className="rating-row" key={value}><span>{value} ★</span><div className="bar-track"><span style={{ width: `${percentage}%` }} /></div><strong>{count}</strong></div>; })}</div></> : <div className="analytics-unavailable">Analytics could not be loaded. Restaurant management is still available.</div>}</section>
    </div>}
  </>;
}
