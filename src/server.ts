import express from "express";
import { config } from "./utils/config.js";
import { logger } from "./utils/logger.js";
import { stripeWebhookRouter } from "./webhooks/stripe.js";

const app = express();

// Stripe webhooks need the raw body for signature verification.
// Mount BEFORE the global JSON parser.
app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookRouter
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  logger.info("Server started", { port: config.port, env: config.nodeEnv });
});

export { app };
