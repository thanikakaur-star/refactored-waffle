import { Router, type Request, type Response } from "express";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";
import { sendFreeSamplePack } from "../email/sender.js";
import { generateDownloadToken } from "../fulfillment/digital.js";

export const leadCaptureRouter = Router();

async function subscribeToConvertKit(email: string, name?: string) {
  const res = await fetch(
    `https://api.convertkit.com/v3/forms/${config.convertkit.formId}/subscribe`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: config.convertkit.apiKey,
        email,
        first_name: name || "",
        tags: ["free-sample-pack", "chatbot-lead"],
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ConvertKit subscribe failed (${res.status}): ${text}`);
  }

  logger.info("Subscribed to ConvertKit", { email });
}

leadCaptureRouter.post("/", async (req: Request, res: Response) => {
  const { email, name } = req.body as { email?: string; name?: string };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Valid email address required" });
    return;
  }

  try {
    const token = generateDownloadToken(`sample-${Date.now()}`);
    const downloadUrl = `${config.download.baseUrl}/${token}`;

    await Promise.all([
      subscribeToConvertKit(email, name),
      sendFreeSamplePack(email, downloadUrl),
    ]);

    logger.info("Lead captured", { email });
    res.json({ success: true, message: "Sample pack on its way!" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lead capture failed";
    logger.error("Lead capture error", { email, error: message });
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});
