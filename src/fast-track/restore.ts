import crypto from "node:crypto";

/**
 * Signed, short-lived "restore my access" tokens.
 *
 * A customer who has lost their unlock (new phone, cleared browser) asks for a
 * link by email. The link carries a token proving they control the purchase
 * email. No state is stored: the token is an HMAC over {sessionId, expiry}.
 */

export const RESTORE_TTL_MS = 30 * 60 * 1000;

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}
function key(secret: string): Buffer {
  return crypto.createHash("sha256").update("kaurcare-restore:" + secret).digest();
}

export function signRestoreToken(sessionId: string, secret: string, now = Date.now(), ttlMs = RESTORE_TTL_MS): string {
  const payload = b64url(Buffer.from(JSON.stringify({ s: sessionId, e: now + ttlMs })));
  const sig = b64url(crypto.createHmac("sha256", key(secret)).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifyRestoreToken(token: string, secret: string, now = Date.now()): { sessionId: string } | null {
  if (typeof token !== "string" || token.length > 600) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const expected = crypto.createHmac("sha256", key(secret)).update(parts[0]).digest();
  let given: Buffer;
  try { given = fromB64url(parts[1]); } catch { return null; }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(fromB64url(parts[0]).toString("utf8")) as { s?: unknown; e?: unknown };
    if (typeof p.s !== "string" || typeof p.e !== "number" || p.e < now) return null;
    return { sessionId: p.s };
  } catch {
    return null;
  }
}

/** Escape LIKE/ILIKE wildcards so an email is matched literally (case-insensitive). */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => "\\" + c);
}

export function looksLikeEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function restoreEmailHtml(link: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#3a403a">
  <h2 style="font-family:Georgia,serif;color:#2D5A47;margin:0 0 12px">Unlock your prep tools</h2>
  <p style="line-height:1.5">Tap the button to unlock your Kaur Care prep tools on this device. The link works for 30 minutes.</p>
  <p style="margin:24px 0"><a href="${link}" style="background:#2D5A47;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;display:inline-block">Unlock my prep tools</a></p>
  <p style="font-size:13px;color:#6b6256;line-height:1.5">If you did not ask for this, you can ignore this email. Nobody can get in without the link.</p>
  <p style="font-size:12px;color:#6b6256">Kaur Care | kaurcare.com</p>
</div>`;
}
