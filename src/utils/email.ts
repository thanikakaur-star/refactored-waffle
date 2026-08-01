import { logger } from "./logger.js";

const RESEND_API_URL = "https://api.resend.com/emails";

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Sends an email via the Resend API. No-ops (with a warning log) if
 * RESEND_API_KEY isn't set, so alert creation/matching still works in
 * environments that haven't wired up email yet.
 */
export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn("RESEND_API_KEY not set — skipping email send", { to: params.to, subject: params.subject });
    return false;
  }

  const from = process.env.ALERT_FROM_EMAIL || "HealthProcure Intel <alerts@resend.dev>";

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error("Resend email send failed", { status: res.status, body });
      return false;
    }
    return true;
  } catch (err) {
    logger.error("Resend email send threw", { error: String(err) });
    return false;
  }
}
