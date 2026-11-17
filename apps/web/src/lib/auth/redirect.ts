/**
 * Only allow same-site relative redirects (blocks open-redirect via ?next=https://evil).
 * Browsers read "\" as "/" and drop tabs and newlines, so "/\evil.test" and "/\t/evil.test" would become "//evil.test": refuse both.
 */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  // eslint-disable-next-line no-control-regex
  return /[\\\u0000-\u001f\u007f]/.test(next) ? fallback : next;
}
