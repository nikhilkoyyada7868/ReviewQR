"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiError, GenerateDraftResponse, PublicRestaurantResponse } from "@/src/contracts/http";
import type { Rating, DraftSource } from "@/src/domain/review";

type LoadState = "loading" | "ready" | "unavailable" | "error";
type Notice = { tone: "info" | "success" | "warning" | "error"; text: string } | null;
const ratings: Rating[] = [1, 2, 3, 4, 5];

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `reviewqr_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function bucket(length: number) {
  if (length <= 24) return "10-24";
  if (length <= 60) return "25-60";
  if (length <= 250) return "61-250";
  return "251-1000";
}

async function messageFrom(response: Response, fallback: string) {
  try { return ((await response.json()) as ApiError).error?.message ?? fallback; } catch { return fallback; }
}

export function ReviewFlow({ slug }: { slug: string }) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [data, setData] = useState<PublicRestaurantResponse | null>(null);
  const [rating, setRating] = useState<Rating | null>(null);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [mode, setMode] = useState<"choose" | "editor">("choose");
  const [text, setText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [source, setSource] = useState<DraftSource>("customer");
  const [draftId, setDraftId] = useState<string | undefined>();
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [officialLink, setOfficialLink] = useState<string | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [reported, setReported] = useState(false);
  const editedRecorded = useRef(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/public/restaurants/${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (response.status === 404) { setLoadState("unavailable"); return; }
      if (!response.ok) throw new Error();
      setData(await response.json() as PublicRestaurantResponse); setLoadState("ready");
    } catch { setLoadState("error"); }
  }, [slug]);

  // Initial client hydration resolves the anonymous public restaurant session.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (mode === "editor") editorRef.current?.focus(); }, [mode]);

  const record = async (eventType: string, extras: Record<string, unknown> = {}) => {
    if (!data) return;
    await fetch(`/api/public/restaurants/${encodeURIComponent(data.restaurant.publicId)}/events`, {
      method: "POST", headers: { "content-type": "application/json" }, keepalive: true,
      body: JSON.stringify({ eventId: uid(), sessionId: data.sessionId, eventType, ...extras }),
    }).catch(() => undefined);
  };

  const chooseRating = (value: Rating) => {
    setRating(value); setNotice(null);
    void record("rating_selected", { rating: value });
  };

  const toggleTopic = (id: string) => {
    setNotice(null);
    setTopicIds((current) => {
      if (current.includes(id)) return current.filter((topic) => topic !== id);
      if (current.length === 3) { setNotice({ tone: "warning", text: "Choose up to three highlights." }); return current; }
      return [...current, id];
    });
  };

  const createDraft = async () => {
    if (!data || !rating) { setNotice({ tone: "error", text: "Choose a rating first." }); return; }
    if (!topicIds.length) { setNotice({ tone: "error", text: "Choose at least one highlight, or write your own review." }); return; }
    setGenerating(true); setNotice({ tone: "info", text: "Creating an editable suggestion…" });
    try {
      const response = await fetch(`/api/public/restaurants/${encodeURIComponent(data.restaurant.publicId)}/drafts`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: data.sessionId, rating, topicIds, idempotencyKey: uid() }),
      });
      if (response.status === 429) {
        const body = await response.json() as ApiError;
        setNotice({ tone: "warning", text: `${body.error.message} Your rating and highlights are still here.` }); return;
      }
      if (!response.ok) throw new Error(await messageFrom(response, "We could not create a suggestion."));
      const result = await response.json() as GenerateDraftResponse;
      setText(result.text); setOriginalText(result.text); setSource(result.source); setDraftId(result.draftId);
      editedRecorded.current = false; setMode("editor");
      setNotice(result.source === "fallback" ? { tone: "info", text: "Here is a simple suggestion you can freely edit." } : null);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? `${error.message} You can still write your own.` : "You can still write your own." });
    } finally { setGenerating(false); }
  };

  const writeOwn = () => {
    if (!rating) { setNotice({ tone: "error", text: "Choose a rating first." }); return; }
    setText(""); setOriginalText(""); setSource("customer"); setDraftId(undefined); setMode("editor"); setNotice(null);
  };

  const editText = (value: string) => {
    setText(value); setNotice(null);
    if (source !== "customer" && originalText && value !== originalText && !editedRecorded.current) {
      editedRecorded.current = true;
      void record("draft_edited", { rating: rating ?? undefined, draftSource: source, edited: true, lengthBucket: bucket(value.length), draftId });
    }
  };

  const handoff = async (copy: boolean) => {
    if (!data || !rating) return;
    if (copy && (text.trim().length < 10 || text.trim().length > 1000)) {
      setNotice({ tone: "error", text: "Your review must be between 10 and 1,000 characters before copying." });
      editorRef.current?.focus(); return;
    }
    let copyOutcome: "succeeded" | "failed" | "skipped" = "skipped";
    if (copy) {
      try {
        await navigator.clipboard.writeText(text.trim()); copyOutcome = "succeeded";
        void record("draft_copied", { rating, draftSource: source, lengthBucket: bucket(text.trim().length), draftId });
      } catch { copyOutcome = "failed"; }
    }
    const pendingWindow = window.open("", "_blank");
    if (pendingWindow) pendingWindow.document.body.textContent = "Opening the official Google review page…";
    setNotice({ tone: "info", text: "Opening the official Google review page…" });
    try {
      const response = await fetch(`/api/public/restaurants/${encodeURIComponent(data.restaurant.publicId)}/handoffs`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId: uid(), sessionId: data.sessionId, rating, copyOutcome }),
      });
      if (!response.ok) throw new Error(await messageFrom(response, "The official link is temporarily unavailable."));
      const result = await response.json() as { destination: string };
      setOfficialLink(result.destination); setShowCompletion(true);
      if (pendingWindow) pendingWindow.location.href = result.destination;
      else window.location.assign(result.destination);
      setNotice(copyOutcome === "succeeded"
        ? { tone: "success", text: "Copied. Paste your text on Google, review it, then press Post yourself." }
        : copyOutcome === "failed"
          ? { tone: "warning", text: "Copying was blocked. Your text is still here—select and copy it manually, then use the official Google link below." }
          : { tone: "info", text: "Google opened. You can write directly there and press Post yourself." });
    } catch (error) {
      pendingWindow?.close();
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "The official link is temporarily unavailable. Your text is safe here." });
    }
  };

  const selfReport = () => {
    if (!rating || reported) return;
    setReported(true); void record("completion_self_reported", { rating });
    setNotice({ tone: "success", text: "Thanks. We recorded this as self-reported, not as a verified Google submission." });
  };

  if (loadState === "loading") return <main className="review-page state-page"><div className="state-card" aria-live="polite"><span className="loader" aria-hidden="true"/><h1>Getting this review page ready…</h1></div></main>;
  if (loadState === "unavailable") return <main className="review-page state-page"><div className="state-card"><span className="state-icon" aria-hidden="true">○</span><h1>This review page isn’t available</h1><p>The QR may be inactive or the address may have changed. Please ask the restaurant team for help.</p></div></main>;
  if (loadState === "error" || !data) return <main className="review-page state-page"><div className="state-card"><span className="state-icon" aria-hidden="true">↻</span><h1>We couldn’t load this page</h1><p>Please check your connection and try again. No review information has been lost.</p><button className="button button-primary" onClick={() => { setLoadState("loading"); setNotice(null); void load(); }}>Try again</button></div></main>;

  const count = text.length;
  return (
    <main className="review-page">
      <header className="review-header"><span className="mini-brand"><span className="brand-mark">R</span>ReviewQR</span><span className="privacy-note">No sign-in required here</span></header>
      <section className="review-card" aria-labelledby="restaurant-name">
        <div className="restaurant-kicker">Share your experience at</div>
        <h1 id="restaurant-name">{data.restaurant.displayName}</h1>
        <p className="location"><span aria-hidden="true">●</span>{data.restaurant.locationLabel}</p>
        <div className="divider" />
        <fieldset className="field-reset"><legend>Rate your visit</legend><p className="field-help">Your rating helps shape the wording. Every rating gets the same Google options.</p>
          <div className="rating-group">
            {ratings.map((value) => <label className={`star-choice ${rating && value <= rating ? "is-filled" : ""}`} key={value}><input type="radio" name="rating" value={value} checked={rating === value} onChange={() => chooseRating(value)} aria-label={`${value} star${value === 1 ? "" : "s"}`} /><span aria-hidden="true">★</span></label>)}
          </div>
          <div className="rating-caption" aria-live="polite">{rating ? `${rating} of 5 stars selected` : "Choose 1 to 5 stars"}</div>
        </fieldset>

        {mode === "choose" ? <>
          <fieldset className="field-reset topic-field" disabled={!rating}><legend>What stood out?</legend><p className="field-help">Choose 1–3 highlights for your suggestion.</p>
            <div className="topic-grid">{data.restaurant.topics.map((topic) => {
              const selected = topicIds.includes(topic.id);
              return <button type="button" key={topic.id} className={`topic-chip ${selected ? "is-selected" : ""}`} aria-pressed={selected} onClick={() => toggleTopic(topic.id)}>{selected && <span aria-hidden="true">✓</span>}{topic.label}</button>;
            })}</div>
            <div className="selection-count" aria-live="polite">{topicIds.length} of 3 selected</div>
          </fieldset>
          <div className="action-stack">
            <button className="button button-primary" disabled={generating || !rating} onClick={() => void createDraft()}>{generating ? <><span className="button-spinner" aria-hidden="true"/>Creating suggestion…</> : <>Create an editable draft <span aria-hidden="true">→</span></>}</button>
            <button className="button button-secondary" disabled={generating || !rating} onClick={writeOwn}>Write my own</button>
          </div>
        </> : <section className="editor-section" aria-labelledby="editor-heading">
          <div className="editor-heading-row"><div><h2 id="editor-heading">Your review</h2><p className="field-help">{source === "customer" ? "Write it in your own words." : "This is only a suggestion—make it sound like you."}</p></div><button className="text-button" onClick={() => { setMode("choose"); setNotice(null); }}>Start over</button></div>
          <label className="sr-only" htmlFor="review-text">Editable review text</label>
          <textarea id="review-text" ref={editorRef} value={text} maxLength={1000} placeholder="Write at least 10 characters about your visit…" onChange={(event) => editText(event.target.value)} />
          <div className={`character-count ${count > 0 && count < 10 ? "is-error" : ""}`}>{count} / 1,000 characters{count > 0 && count < 10 ? " · 10 minimum to copy" : ""}</div>
          <div className="handoff-explainer"><span aria-hidden="true">↗</span><p><strong>You stay in control.</strong> Google will open separately. Paste or write your review there, check it, and press <strong>Post</strong> yourself.</p></div>
          <div className="action-stack"><button className="button button-primary" onClick={() => void handoff(true)}>Copy &amp; open Google <span aria-hidden="true">↗</span></button><button className="button button-secondary" onClick={() => void handoff(false)}>Open Google without copying</button></div>
          {officialLink && <p className="manual-link">If Google did not open, <a href={officialLink} target="_blank" rel="noopener noreferrer">open the official Google review page</a>. Your text will remain here.</p>}
          {showCompletion && <div className="completion-box"><p>Did you personally post it on Google?</p><button className="button button-secondary button-small" disabled={reported} onClick={selfReport}>{reported ? "Self-report recorded" : "I posted it"}</button><small>This is optional and not verified by ReviewQR.</small></div>}
        </section>}
        {notice && <div className={`notice notice-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</div>}
      </section>
      <footer className="review-footer">Your text is not stored by ReviewQR. Google may ask you to sign in.</footer>
    </main>
  );
}
