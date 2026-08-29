"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminRestaurantInput, AdminTopicInput } from "@/src/contracts/http";
import type { RestaurantRecord } from "@/src/domain/restaurant";

const defaults = ["Food", "Service", "Ambience", "Value", "Cleanliness", "Family friendly"];
type FormTopic = AdminTopicInput & { key: string };

const makeTopics = (): FormTopic[] => defaults.map((label, index) => ({ key: `${index}-${label}`, label, promptDescriptor: label.toLocaleLowerCase(), sortOrder: index, active: true }));
const slugify = (value: string) => value.normalize("NFKD").toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

function initial(record?: RestaurantRecord) {
  return {
    displayName: record?.displayName ?? "", locationLabel: record?.locationLabel ?? "", slug: record?.slug ?? "",
    googleReviewUrl: record?.googleReviewUrl ?? "", status: record?.status ?? "active" as const,
    facts: record?.approvedFacts.join("\n") ?? "",
    topics: record ? record.topics.map((topic) => ({ ...topic, key: topic.id, active: true })) : makeTopics(),
  };
}

export function RestaurantForm({ record }: { record?: RestaurantRecord }) {
  const router = useRouter();
  const [form, setForm] = useState(() => initial(record));
  const [slugTouched, setSlugTouched] = useState(Boolean(record));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [serverMessage, setServerMessage] = useState("");
  const activeTopics = form.topics.filter((topic) => topic.active);
  const facts = useMemo(() => form.facts.split("\n").map((fact) => fact.trim()).filter(Boolean), [form.facts]);

  const setField = (field: string, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };
  const changeName = (value: string) => {
    setForm((current) => ({ ...current, displayName: value, ...(!slugTouched ? { slug: slugify(value) } : {}) }));
    setErrors((current) => ({ ...current, displayName: "", slug: "" }));
  };
  const validate = () => {
    const next: Record<string, string> = {};
    if (form.displayName.trim().length < 2) next.displayName = "Enter the restaurant’s display name.";
    if (form.locationLabel.trim().length < 2) next.locationLabel = "Enter a location or address label.";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) next.slug = "Use lowercase words separated by hyphens.";
    try { const url = new URL(form.googleReviewUrl); if (url.protocol !== "https:") throw new Error(); } catch { next.googleReviewUrl = "Paste a complete HTTPS Google review link."; }
    if (activeTopics.length < 3 || activeTopics.length > 8) next.topics = "Keep between 3 and 8 active topics.";
    if (activeTopics.some((topic) => !topic.label.trim() || !topic.promptDescriptor.trim())) next.topics = "Every active topic needs a label and drafting description.";
    if (new Set(activeTopics.map((topic) => topic.label.trim().toLocaleLowerCase())).size !== activeTopics.length) next.topics = "Topic labels must be unique.";
    if (facts.length > 8 || facts.some((fact) => fact.length > 160)) next.facts = "Use up to 8 facts, each no longer than 160 characters.";
    setErrors(next); return !Object.keys(next).length;
  };

  const payload = (): AdminRestaurantInput => ({
    displayName: form.displayName.trim(), locationLabel: form.locationLabel.trim(), slug: form.slug,
    googleReviewUrl: form.googleReviewUrl.trim(), status: form.status, approvedFacts: facts,
    topics: activeTopics.map((topic, index) => ({ ...(topic.id ? { id: topic.id } : {}), label: topic.label.trim(), promptDescriptor: topic.promptDescriptor.trim(), sortOrder: index, active: true })),
  });

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!validate()) return;
    setStatus("saving"); setServerMessage("");
    try {
      const response = await fetch(record ? `/api/admin/restaurants/${encodeURIComponent(record.id)}` : "/api/admin/restaurants", {
        method: record ? "PATCH" : "POST", headers: { "content-type": "application/json", ...(record ? {} : { "idempotency-key": crypto.randomUUID() }) }, body: JSON.stringify(payload()),
      });
      const body = await response.json() as { restaurant?: RestaurantRecord; error?: { message: string } };
      if (!response.ok || !body.restaurant) throw new Error(body.error?.message ?? "The restaurant could not be saved.");
      window.location.assign(`/admin/restaurants/${encodeURIComponent(body.restaurant.id)}?saved=1`);
    } catch (error) { setServerMessage(error instanceof Error ? error.message : "The restaurant could not be saved."); setStatus("error"); }
  };

  const updateTopic = (key: string, field: "label" | "promptDescriptor", value: string) => setForm((current) => ({ ...current, topics: current.topics.map((topic) => topic.key === key ? { ...topic, [field]: value } : topic) }));
  const toggleTopic = (key: string) => { setForm((current) => ({ ...current, topics: current.topics.map((topic) => topic.key === key ? { ...topic, active: !topic.active } : topic) })); setErrors((current) => ({ ...current, topics: "" })); };
  const addTopic = () => setForm((current) => ({ ...current, topics: [...current.topics, { key: crypto.randomUUID(), label: "", promptDescriptor: "", sortOrder: current.topics.length, active: true }] }));

  return <form className="admin-form" onSubmit={save} noValidate>
    <section className="form-section"><div className="form-section-heading"><span>1</span><div><h2>Restaurant identity</h2><p>What customers will see after scanning.</p></div></div><div className="form-grid">
      <label className="form-field form-field-wide"><span>Restaurant name</span><input value={form.displayName} onChange={(e) => changeName(e.target.value)} maxLength={120} autoComplete="organization" aria-invalid={Boolean(errors.displayName)} />{errors.displayName && <small className="field-error">{errors.displayName}</small>}</label>
      <label className="form-field form-field-wide"><span>Location / address label</span><input value={form.locationLabel} onChange={(e) => setField("locationLabel", e.target.value)} maxLength={200} placeholder="Indiranagar, Bengaluru" aria-invalid={Boolean(errors.locationLabel)} />{errors.locationLabel && <small className="field-error">{errors.locationLabel}</small>}</label>
      <label className="form-field"><span>Permanent URL slug</span><div className="prefix-input"><span>/r/</span><input value={form.slug} onChange={(e) => { setSlugTouched(true); setField("slug", slugify(e.target.value)); }} maxLength={80} aria-invalid={Boolean(errors.slug)} readOnly={Boolean(record)} /></div>{errors.slug && <small className="field-error">{errors.slug}</small>}<small>{record ? "Locked after creation so printed QR codes keep working." : "This permanent path will be encoded in the QR."}</small></label>
      <label className="form-field"><span>Launch status</span><select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as "active" | "inactive" }))}><option value="active">Active — customer page available</option><option value="inactive">Inactive — page unavailable</option></select></label>
    </div></section>
    <section className="form-section"><div className="form-section-heading"><span>2</span><div><h2>Official Google destination</h2><p>This stays private until a customer chooses to open Google.</p></div></div><label className="form-field"><span>Google review URL</span><input type="url" value={form.googleReviewUrl} onChange={(e) => setField("googleReviewUrl", e.target.value)} placeholder="https://g.page/r/…/review" aria-invalid={Boolean(errors.googleReviewUrl)} />{errors.googleReviewUrl && <small className="field-error">{errors.googleReviewUrl}</small>}<small>Only supported Google-owned HTTPS review links are accepted by the server.</small></label></section>
    <section className="form-section"><div className="form-section-heading"><span>3</span><div><h2>Customer highlights</h2><p>Show 3–8 concise topics. Customers can choose up to three.</p></div></div><div className="topic-admin-list">{form.topics.map((topic) => <div className={`topic-admin-row ${topic.active ? "" : "is-inactive"}`} key={topic.key}><input type="checkbox" checked={topic.active} onChange={() => toggleTopic(topic.key)} aria-label={`${topic.active ? "Disable" : "Enable"} ${topic.label || "topic"}`} /><label><span>Label</span><input value={topic.label} onChange={(e) => updateTopic(topic.key, "label", e.target.value)} maxLength={40} disabled={!topic.active} /></label><label className="descriptor"><span>Drafting description</span><input value={topic.promptDescriptor} onChange={(e) => updateTopic(topic.key, "promptDescriptor", e.target.value)} maxLength={120} disabled={!topic.active} /></label></div>)}</div>{errors.topics && <p className="field-error">{errors.topics}</p>}<button type="button" className="text-button add-topic" onClick={addTopic} disabled={activeTopics.length >= 8}>＋ Add custom topic</button></section>
    <section className="form-section"><div className="form-section-heading"><span>4</span><div><h2>Approved restaurant facts <em>Optional</em></h2><p>Facts can guide a draft but never pretend the customer experienced them.</p></div></div><label className="form-field"><span>One verified fact per line</span><textarea className="facts-area" value={form.facts} onChange={(e) => setField("facts", e.target.value)} placeholder={"Serves regional Indian cuisine\nVegetarian options available"} />{errors.facts && <small className="field-error">{errors.facts}</small>}<small>{facts.length} of 8 facts</small></label></section>
    {serverMessage && <div className="notice notice-error" role="alert">{serverMessage}</div>}
    <div className="form-actions"><button className="button button-primary" disabled={status === "saving"}>{status === "saving" ? "Saving…" : record ? "Save changes" : "Save & view QR"}</button><button type="button" className="button button-secondary" onClick={() => router.back()} disabled={status === "saving"}>Cancel</button></div>
  </form>;
}
