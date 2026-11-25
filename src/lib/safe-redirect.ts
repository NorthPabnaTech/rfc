/**
 * Same-site redirect guard for `?next=` style parameters.
 *
 * Accepts only a path on this site. Rejects protocol-relative (`//evil.com`)
 * and backslash (`/\evil.com`, which browsers and the URL parser treat as
 * `//evil.com`) targets, control characters, and anything that resolves to
 * another origin.
 */
export function safeRedirectPath(next: unknown): string | null {
  if (typeof next !== 'string' || next.length === 0 || next.length > 2048) return null;
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  if (next.includes('\\') || /[\u0000-\u001f\u007f]/.test(next)) return null;
  try {
    const base = 'https://same-origin.invalid';
    const url = new URL(next, base);
    if (url.origin !== base) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
