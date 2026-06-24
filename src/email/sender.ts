import { Resend } from "resend";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";

let _resend: Resend;
function getResend() {
  if (!_resend) _resend = new Resend(config.resend.apiKey);
  return _resend;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function send(options: EmailOptions) {
  const { data, error } = await getResend().emails.send({
    from: config.resend.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  if (error) {
    logger.error("Email send failed", { to: options.to, error: error.message });
    throw new Error(`Email failed: ${error.message}`);
  }

  logger.info("Email sent", { to: options.to, emailId: data?.id });
  return data;
}

export async function sendDigitalDelivery(to: string, downloadUrl: string) {
  return send({
    to,
    subject: "Your Khalsa Kreatives Colouring Book is Ready! 🎨",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f5f0;font-family:Georgia,serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:32px;margin-bottom:32px">
    <tr><td style="background:linear-gradient(135deg,#ff6b35,#f7931e);padding:40px 32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:26px;letter-spacing:0.5px">Sat Sri Akaal!</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:16px">Your colouring book is ready to download</p>
    </td></tr>
    <tr><td style="padding:32px">
      <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px">
        Thank you for supporting Sikh &amp; Panjabi cultural education. Your digital colouring book PDF is waiting for you.
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px">
        This link expires in ${config.download.expiryHours} hours. Please download your file promptly.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto"><tr><td style="background:#ff6b35;border-radius:8px;padding:14px 36px">
        <a href="${downloadUrl}" style="color:#fff;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block">Download Your Colouring Book</a>
      </td></tr></table>
      <p style="color:#999;font-size:12px;text-align:center;margin:24px 0 0">
        If the button doesn't work, copy this link:<br>
        <a href="${downloadUrl}" style="color:#ff6b35;word-break:break-all">${downloadUrl}</a>
      </p>
    </td></tr>
    <tr><td style="background:#f8f5f0;padding:20px 32px;text-align:center">
      <p style="color:#999;font-size:12px;margin:0">Khalsa Kreatives</p>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

export async function sendFreeSamplePack(to: string, downloadUrl: string) {
  return send({
    to,
    subject: "Your Free Colouring Sample Pack is Here!",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f5f0;font-family:Georgia,serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:32px;margin-bottom:32px">
    <tr><td style="background:linear-gradient(135deg,#4a90d9,#7b68ee);padding:40px 32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:26px">Your Free Sample Pack</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:16px">3 pages of Panjabi cultural colouring fun</p>
    </td></tr>
    <tr><td style="padding:32px">
      <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px">
        Here are your free colouring pages featuring Gurmukhi letters, Gurdwara architecture, and Panjabi festival scenes.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto"><tr><td style="background:#4a90d9;border-radius:8px;padding:14px 36px">
        <a href="${downloadUrl}" style="color:#fff;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block">Download Sample Pages</a>
      </td></tr></table>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:24px 0 0;text-align:center">
        Love it? The full book has 40+ pages of cultural learning through art.
      </p>
    </td></tr>
    <tr><td style="background:#f8f5f0;padding:20px 32px;text-align:center">
      <p style="color:#999;font-size:12px;margin:0">Khalsa Kreatives</p>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

export async function sendPhysicalOrderConfirmation(to: string, name: string) {
  return send({
    to,
    subject: "Your Colouring Book is Being Printed!",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f5f0;font-family:Georgia,serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:32px;margin-bottom:32px">
    <tr><td style="background:linear-gradient(135deg,#2e7d32,#66bb6a);padding:40px 32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:26px">Order Confirmed!</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:16px">Your printed colouring book is on its way</p>
    </td></tr>
    <tr><td style="padding:32px">
      <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px">
        Sat Sri Akaal, ${name}!
      </p>
      <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px">
        Your <strong>Khalsa Kreatives Colouring Book</strong> has been sent to print and will be shipped directly to your address. Here's what to expect:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
        <tr>
          <td style="padding:12px 16px;background:#f0f7f0;border-radius:8px">
            <p style="color:#2e7d32;font-size:14px;font-weight:bold;margin:0 0 8px">Production & Shipping Timeline</p>
            <p style="color:#555;font-size:14px;line-height:1.6;margin:0">Printing: 3-5 business days</p>
            <p style="color:#555;font-size:14px;line-height:1.6;margin:0">UK Shipping: 5-7 business days</p>
            <p style="color:#555;font-size:14px;line-height:1.6;margin:0">International: 7-14 business days</p>
          </td>
        </tr>
      </table>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px">
        While you wait, share your excitement with friends and family — every book purchased supports Sikh &amp; Panjabi cultural education.
      </p>
    </td></tr>
    <tr><td style="background:#f8f5f0;padding:20px 32px;text-align:center">
      <p style="color:#999;font-size:12px;margin:0">Khalsa Kreatives &bull; Celebrating Heritage Through Art</p>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

export async function sendBundleConfirmation(to: string, name: string, downloadUrl: string) {
  return send({
    to,
    subject: "Your Khalsa Kreatives Bundle is Ready! Download + Print",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f5f0;font-family:Georgia,serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:32px;margin-bottom:32px">
    <tr><td style="background:linear-gradient(135deg,#ff6b35,#f7931e);padding:40px 32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:26px">Your Bundle is Ready!</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:16px">Digital download + printed book on the way</p>
    </td></tr>
    <tr><td style="padding:32px">
      <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px">
        Sat Sri Akaal, ${name}! Thank you for choosing the bundle — the best way to enjoy Khalsa Kreatives.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
        <tr><td style="padding:16px;background:#fff5f0;border-radius:8px;border-left:4px solid #ff6b35">
          <p style="color:#ff6b35;font-size:14px;font-weight:bold;margin:0 0 8px">Step 1: Download Your Digital Copy Now</p>
          <p style="color:#555;font-size:14px;line-height:1.6;margin:0">Start colouring right away while your printed copy is being made.</p>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px"><tr><td style="background:#ff6b35;border-radius:8px;padding:14px 36px">
        <a href="${downloadUrl}" style="color:#fff;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block">Download Your PDF</a>
      </td></tr></table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
        <tr><td style="padding:16px;background:#f0f7f0;border-radius:8px;border-left:4px solid #2e7d32">
          <p style="color:#2e7d32;font-size:14px;font-weight:bold;margin:0 0 8px">Step 2: Your Printed Book is Being Made</p>
          <p style="color:#555;font-size:14px;line-height:1.6;margin:0">Production takes 3-5 days, then shipping to your door.</p>
        </td></tr>
      </table>
      <p style="color:#999;font-size:12px;text-align:center;margin:16px 0 0">
        Download link expires in ${config.download.expiryHours} hours. Please save your PDF promptly.
      </p>
    </td></tr>
    <tr><td style="background:#f8f5f0;padding:20px 32px;text-align:center">
      <p style="color:#999;font-size:12px;margin:0">Khalsa Kreatives &bull; Celebrating Heritage Through Art</p>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
