import { CronJob } from "cron";
import { buildLeads, outreachOpener, type Lead } from "./leads.js";
import { sendEmail, isEmailConfigured } from "../utils/email.js";
import { logger } from "../utils/logger.js";

function money(n: number): string {
  return `$${Number(n || 0).toLocaleString("en-US")}`;
}
function esc(s: string): string {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
}

function buildDigestHtml(leads: Lead[]): string {
  const rows = leads
    .map((l) => {
      const cats = l.categories.map((c) => c.replace(/_/g, " ")).join(", ") || "healthcare";
      return `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;vertical-align:top;">
          <div style="font-weight:600;color:#12141d;font-size:15px;">${esc(l.supplier)}</div>
          <div style="color:#666;font-size:12px;margin-top:2px;">${esc(cats)} &middot; ${esc(l.country || "")} &middot; ${l.wins} win${l.wins > 1 ? "s" : ""} &middot; ${money(l.totalUsd)}</div>
          <div style="color:#888;font-size:12px;margin-top:2px;">Latest: ${esc(l.latestContract || "(untitled)")}</div>
          <div style="margin-top:8px;font-size:13px;color:#333;background:#faf7f0;border-left:3px solid #c9a96e;padding:8px 10px;border-radius:2px;">${esc(outreachOpener(l))}</div>
        </td>
      </tr>`;
    })
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:640px;margin:0 auto;">
      <h2 style="color:#12141d;">Your weekly outreach leads</h2>
      <p style="color:#444;font-size:14px;">${leads.length} supplier${leads.length > 1 ? "s" : ""} won healthcare contracts recently. Warmest first, each with a ready opener. Find the person on LinkedIn, fill in [Name], and send.</p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="margin-top:20px;font-size:14px;"><a href="https://healthprocureintel.com/admin" style="color:#a8883f;">Open the full leads panel &rarr;</a></p>
      <p style="color:#999;font-size:11px;margin-top:24px;">You receive this because LEADS_DIGEST_EMAIL is set. Change the schedule via LEADS_DIGEST_CRON.</p>
    </div>`;
}

/**
 * Build the current leads and email them to LEADS_DIGEST_EMAIL. No-ops quietly
 * (with a log) if email or the recipient isn't configured, or if there are no
 * recent leads. Safe to call ad hoc (admin test) or from the weekly cron.
 */
export async function sendLeadsDigest(): Promise<{ sent: boolean; count: number; reason?: string }> {
  const to = (process.env.LEADS_DIGEST_EMAIL || "").trim();
  if (!to) {
    logger.info("Leads digest: LEADS_DIGEST_EMAIL not set, skipping");
    return { sent: false, count: 0, reason: "LEADS_DIGEST_EMAIL not set" };
  }
  if (!isEmailConfigured()) {
    logger.info("Leads digest: RESEND_API_KEY not set, skipping");
    return { sent: false, count: 0, reason: "RESEND_API_KEY not set" };
  }

  let leads: Lead[];
  try {
    const days = Number(process.env.LEADS_DIGEST_DAYS) || 180;
    const limit = Number(process.env.LEADS_DIGEST_LIMIT) || 20;
    leads = await buildLeads(days, limit);
  } catch (err) {
    logger.error("Leads digest: failed to build leads", { error: String(err) });
    return { sent: false, count: 0, reason: "query failed" };
  }

  if (leads.length === 0) {
    logger.info("Leads digest: no recent leads, skipping");
    return { sent: false, count: 0, reason: "no recent leads" };
  }

  const sent = await sendEmail({
    to,
    subject: `Your weekly outreach leads (${leads.length})`,
    html: buildDigestHtml(leads),
  });
  if (sent) logger.info("Leads digest sent", { to, count: leads.length });
  return { sent, count: leads.length, reason: sent ? undefined : "send failed" };
}

/**
 * Schedule the weekly leads digest.
 *   ENABLE_LEADS_DIGEST   must be "true" to activate (off by default)
 *   LEADS_DIGEST_CRON     cron expression (default "0 8 * * 1" = Mondays 08:00)
 *   LEADS_DIGEST_TIMEZONE IANA timezone (default SCRAPER_TIMEZONE or Europe/London)
 *   LEADS_DIGEST_EMAIL    recipient address (required for anything to send)
 */
function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function startLeadsDigestSchedule(): CronJob | null {
  if (process.env.ENABLE_LEADS_DIGEST !== "true") {
    logger.info("Leads digest cron disabled (set ENABLE_LEADS_DIGEST=true to enable)");
    return null;
  }
  const cronExpression = process.env.LEADS_DIGEST_CRON || "0 8 * * 1";
  let timeZone = process.env.LEADS_DIGEST_TIMEZONE || process.env.SCRAPER_TIMEZONE || "Europe/London";
  if (!isValidTimeZone(timeZone)) {
    logger.warn("Leads digest: invalid timezone, falling back to UTC", { timeZone });
    timeZone = "UTC";
  }

  // A bad cron expression or timezone must never crash the server at boot.
  try {
    const job = new CronJob(
      cronExpression,
      () => {
        void sendLeadsDigest();
      },
      null,
      true,
      timeZone,
    );
    logger.info("Leads digest cron scheduled", { cronExpression, timeZone, nextRun: job.nextDate().toISO() });
    return job;
  } catch (err) {
    logger.error("Leads digest: failed to schedule, continuing without it", { error: String(err), cronExpression, timeZone });
    return null;
  }
}
