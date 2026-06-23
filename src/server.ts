import path from "node:path";
import express from "express";
import { config } from "./utils/config.js";
import { logger } from "./utils/logger.js";
import { stripeWebhookRouter } from "./webhooks/stripe.js";
import { verifyDownloadToken } from "./fulfillment/digital.js";
import { chatbotRouter } from "./chatbot/routes.js";

const app = express();

// Stripe webhooks need the raw body for signature verification.
// Mount BEFORE the global JSON parser.
app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookRouter
);

app.use(express.json());

app.use("/api/chat", chatbotRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PDF_DIR = path.resolve(process.cwd(), "assets/pdf");

app.get("/download/:token", (req, res) => {
  const payload = verifyDownloadToken(req.params.token);

  if (!payload) {
    res.status(403).json({ error: "Invalid or expired download link" });
    return;
  }

  logger.info("Download initiated", { sessionId: payload.sessionId });

  const filePath = path.join(PDF_DIR, "panjabi-colouring-book.pdf");
  res.download(filePath, "Khalsa-Kreatives-Colouring-Book.pdf", (err) => {
    if (err) {
      logger.error("Download file send failed", { error: (err as Error).message });
      if (!res.headersSent) {
        res.status(404).json({ error: "File not found" });
      }
    }
  });
});

const port = parseInt(process.env.PORT || "3000", 10);
app.listen(port, "0.0.0.0", () => {
  logger.info("Server started", { port, env: process.env.NODE_ENV || "development" });
});

export { app };
