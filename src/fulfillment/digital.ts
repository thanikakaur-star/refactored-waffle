import crypto from "node:crypto";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";
import { sendDigitalDelivery } from "../email/sender.js";

interface DigitalOrder {
  email: string;
  sessionId: string;
}

interface DownloadToken {
  sessionId: string;
  expires: number;
}

const ALGORITHM = "aes-256-gcm";

function deriveKey(): Buffer {
  return crypto.scryptSync(config.stripe.secretKey, "download-token-salt", 32);
}

export function generateDownloadToken(sessionId: string): string {
  const payload: DownloadToken = {
    sessionId,
    expires: Date.now() + config.download.expiryHours * 3600_000,
  };

  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function verifyDownloadToken(token: string): DownloadToken | null {
  try {
    const raw = Buffer.from(token, "base64url");
    const iv = raw.subarray(0, 16);
    const tag = raw.subarray(16, 32);
    const encrypted = raw.subarray(32);

    const key = deriveKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    const payload: DownloadToken = JSON.parse(decrypted.toString("utf8"));

    if (payload.expires < Date.now()) {
      logger.warn("Download token expired", { sessionId: payload.sessionId });
      return null;
    }

    return payload;
  } catch {
    logger.warn("Invalid download token");
    return null;
  }
}

export async function fulfillDigital(order: DigitalOrder) {
  const token = generateDownloadToken(order.sessionId);
  const downloadUrl = `${config.download.baseUrl}/${token}`;

  logger.info("Generated secure download link", {
    sessionId: order.sessionId,
    email: order.email,
    expiresInHours: config.download.expiryHours,
  });

  await sendDigitalDelivery(order.email, downloadUrl);
}
