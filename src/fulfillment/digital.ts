import crypto from "node:crypto";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";

interface DigitalOrder {
  email: string;
  sessionId: string;
}

function generateDownloadToken(sessionId: string): string {
  const payload = `${sessionId}:${Date.now()}`;
  return crypto.createHmac("sha256", config.stripe.secretKey).update(payload).digest("hex");
}

export async function fulfillDigital(order: DigitalOrder) {
  const token = generateDownloadToken(order.sessionId);
  const downloadUrl = `${config.download.baseUrl}/${token}`;

  logger.info("Generated download link", {
    sessionId: order.sessionId,
    email: order.email,
    expiresInHours: config.download.expiryHours,
  });

  // Phase 2 will wire this to src/email/sender.ts
  logger.info("TODO: send delivery email", { email: order.email, downloadUrl });
}
