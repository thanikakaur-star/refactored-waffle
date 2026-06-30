import crypto from "node:crypto";
import { logger } from "../utils/logger.js";

/**
 * Minimal Google Search Console client using a service-account JWT.
 *
 * No external SDK — we mint a signed JWT with Node's crypto, exchange it for a
 * short-lived access token, and call the Search Console API directly.
 *
 * Required env vars (set on the server only — these are secrets):
 *   GSC_SERVICE_ACCOUNT_EMAIL  — the service account's email
 *   GSC_PRIVATE_KEY            — the service account's private key (PEM).
 *                                Newlines may be escaped as \n.
 *   GSC_SITE_URL               — the property, e.g. "https://healthprocureintel.com/"
 *                                or "sc-domain:healthprocureintel.com"
 *
 * Setup: create a Google Cloud project, enable the Search Console API, create a
 * service account, download its JSON key, then in Search Console add the service
 * account email as a (full or restricted) user on your property.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const API_BASE = "https://www.googleapis.com/webmasters/v3";

export function isSearchConsoleConfigured(): boolean {
  return Boolean(
    process.env.GSC_SERVICE_ACCOUNT_EMAIL &&
      process.env.GSC_PRIVATE_KEY &&
      process.env.GSC_SITE_URL,
  );
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const email = process.env.GSC_SERVICE_ACCOUNT_EMAIL!;
  const privateKey = (process.env.GSC_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const b64 = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${b64(header)}.${b64(claim)}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(privateKey, "base64url");
  const assertion = `${unsigned}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google token exchange failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export interface SearchAnalyticsRow {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

async function querySearchAnalytics(body: Record<string, unknown>): Promise<SearchAnalyticsRow[]> {
  const token = await getAccessToken();
  const siteUrl = process.env.GSC_SITE_URL!;
  const res = await fetch(
    `${API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Search Console query failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { rows?: SearchAnalyticsRow[] };
  return data.rows ?? [];
}

function dateRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

/**
 * Fetch a compact SEO summary: totals, top queries, and top pages over the
 * last `days` days.
 */
export async function getSeoOverview(days = 28) {
  const range = dateRange(days);

  const [totalsRows, queryRows, pageRows] = await Promise.all([
    querySearchAnalytics({ ...range, rowLimit: 1 }),
    querySearchAnalytics({ ...range, dimensions: ["query"], rowLimit: 25 }),
    querySearchAnalytics({ ...range, dimensions: ["page"], rowLimit: 25 }),
  ]);

  const totals = totalsRows[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };

  return {
    range,
    totals: {
      clicks: totals.clicks,
      impressions: totals.impressions,
      ctr: totals.ctr,
      position: totals.position,
    },
    topQueries: queryRows.map((r) => ({
      query: r.keys?.[0] ?? "",
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    })),
    topPages: pageRows.map((r) => ({
      page: r.keys?.[0] ?? "",
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    })),
  };
}

export async function getSeoOverviewSafe(days = 28) {
  try {
    return { ok: true as const, data: await getSeoOverview(days) };
  } catch (err) {
    logger.error("Search Console fetch failed", { error: String(err) });
    return { ok: false as const, error: String(err) };
  }
}
