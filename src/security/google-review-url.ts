const EXACT_HOSTS = new Set([
  "g.page",
  "maps.app.goo.gl",
  "maps.google.com",
  "search.google.com",
  "www.google.com",
]);

const GOOGLE_REVIEW_PATHS = [
  /^\/maps(?:\/|$)/,
  /^\/local\/writereview(?:\/|$)/,
];

export function parseGoogleReviewUrl(value: string): URL | null {
  if (value.length < 10 || value.length > 2_048 || /[\u0000-\u001f\u007f]/.test(value)) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  if (!EXACT_HOSTS.has(hostname)) return null;

  if (hostname === "g.page") {
    return /^\/r\/[A-Za-z0-9_-]+\/review\/?$/.test(url.pathname) ? url : null;
  }
  if (hostname === "maps.app.goo.gl") {
    return /^\/[A-Za-z0-9_-]+\/?$/.test(url.pathname) ? url : null;
  }
  return GOOGLE_REVIEW_PATHS.some((pattern) => pattern.test(url.pathname))
    ? url
    : null;
}

export function isGoogleReviewUrl(value: string): boolean {
  return parseGoogleReviewUrl(value) !== null;
}
