import { getSupabaseClient } from "../db/client.js";
import { sendEmail, isEmailConfigured } from "../utils/email.js";
import { logger } from "../utils/logger.js";

interface AlertRow {
  id: string;
  email: string;
  category: string | null;
  source: string | null;
  region: string | null;
  country: string | null;
  keyword: string | null;
  last_notified_at: string | null;
}

interface TenderRow {
  id: string;
  title: string;
  buyer_name: string;
  buyer_country: string;
  category: string;
  source: string;
  value_usd: number | null;
  deadline: string | null;
  url: string;
}

function formatCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildDigestHtml(tenders: TenderRow[], alert: AlertRow): string {
  const rows = tenders
    .map(
      (t) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">
          <a href="${t.url}" style="color:#a8883f;text-decoration:none;font-weight:600;">${t.title}</a><br/>
          <span style="color:#666;font-size:13px;">${t.buyer_name}, ${t.buyer_country} &middot; ${formatCategory(t.category)}</span>
        </td>
      </tr>`
    )
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#12141d;">New tenders matching your alert</h2>
      <p style="color:#444;">${tenders.length} new tender${tenders.length > 1 ? "s" : ""} found on HealthProcure Intel.</p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="margin-top:24px;"><a href="https://healthprocureintel.com/dashboard" style="color:#a8883f;">View in your dashboard &rarr;</a></p>
    </div>
  `;
}

/**
 * Matches active tender_alerts against tenders scraped since each alert was
 * last notified, and emails a digest for any new matches. Called after each
 * scraper run — no-ops quietly if RESEND_API_KEY isn't configured.
 */
export async function checkAlertsAndNotify(): Promise<void> {
  if (!isEmailConfigured()) {
    logger.info("Skipping alert check — RESEND_API_KEY not configured");
    return;
  }

  const client = getSupabaseClient();
  const { data: alerts, error } = await client
    .from("tender_alerts")
    .select("*")
    .eq("is_active", true);

  if (error) {
    logger.error("Failed to load tender alerts", { error: error.message });
    return;
  }
  if (!alerts || alerts.length === 0) return;

  for (const alert of alerts as AlertRow[]) {
    const since = alert.last_notified_at ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let query = client
      .from("tenders")
      .select("id, title, buyer_name, buyer_country, category, source, value_usd, deadline, url")
      .eq("status", "open")
      .gt("scraped_at", since);

    if (alert.category) query = query.eq("category", alert.category);
    if (alert.source) query = query.eq("source", alert.source);
    if (alert.region) query = query.eq("buyer_region", alert.region);
    if (alert.country) query = query.eq("buyer_country", alert.country);
    if (alert.keyword) query = query.ilike("title", `%${alert.keyword}%`);

    const { data: matches, error: matchError } = await query
      .order("scraped_at", { ascending: false })
      .limit(20);

    if (matchError) {
      logger.warn("Alert match query failed", { alertId: alert.id, error: matchError.message });
      continue;
    }
    if (!matches || matches.length === 0) continue;

    const sent = await sendEmail({
      to: alert.email,
      subject: `${matches.length} new tender${matches.length > 1 ? "s" : ""} matching your HealthProcure Intel alert`,
      html: buildDigestHtml(matches as TenderRow[], alert),
    });

    if (sent) {
      await client
        .from("tender_alerts")
        .update({ last_notified_at: new Date().toISOString() })
        .eq("id", alert.id);
      logger.info("Alert notification sent", { alertId: alert.id, matches: matches.length });
    }
  }
}
