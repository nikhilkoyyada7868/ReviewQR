import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("customer flow exposes equal 1–5 ratings and both Google actions", async () => {
  const source = await read("app/r/[slug]/review-flow.tsx");
  assert.match(source, /const ratings: Rating\[\] = \[1, 2, 3, 4, 5\]/);
  assert.match(source, /Copy &amp; open Google/);
  assert.match(source, /Open Google without copying/);
  assert.match(source, /Every rating gets the same Google options/);
  assert.doesNotMatch(source, /rating\s*[>=]+\s*4|rating\s*[>=]+\s*4/);
});

test("customer flow preserves honest handoff and fallback language", async () => {
  const source = await read("app/r/[slug]/review-flow.tsx");
  assert.match(source, /press <strong>Post<\/strong> yourself/);
  assert.match(source, /self-reported, not as a verified Google submission/);
  assert.match(source, /Copying was blocked\. Your text is still here/);
  assert.match(source, /open the official Google review page/);
});

test("customer controls carry mobile and accessibility semantics", async () => {
  const [source, css] = await Promise.all([read("app/r/[slug]/review-flow.tsx"), read("app/globals.css")]);
  assert.match(source, /type="radio"/);
  assert.match(source, /aria-label={`\$\{value\} star/);
  assert.match(source, /aria-pressed={selected}/);
  assert.match(source, /aria-live="polite"/);
  assert.match(css, /@media \(max-width:480px\)/);
  assert.match(css, /min-height:44px/);
});

test("admin UI supports the onboarding and honest analytics essentials", async () => {
  const [form, detail, layout] = await Promise.all([
    read("app/admin/restaurants/restaurant-form.tsx"),
    read("app/admin/restaurants/[id]/restaurant-detail.tsx"),
    read("app/admin/layout.tsx"),
  ]);
  assert.match(form, /3 and 8 active topics/);
  assert.match(form, /readOnly={Boolean\(record\)}/);
  assert.match(form, /idempotency-key/);
  assert.match(detail, /Google handoffs/);
  assert.match(detail, /Customer reported, not verified/);
  assert.match(detail, /Download QR/);
  assert.match(layout, /requireChatGPTUser/);
});

test("starter preview metadata and UI are removed", async () => {
  const [page, layout, packageJson] = await Promise.all([read("app/page.tsx"), read("app/layout.tsx"), read("package.json")]);
  assert.doesNotMatch(page + layout, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(layout, /ReviewQR/);
});
