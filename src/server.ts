import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { getConfigSafe } from "./config/index.js";
import { authenticateApiKey } from "./api/middleware/auth.js";
import { tendersRouter } from "./api/routes/tenders.js";
import { awardsRouter } from "./api/routes/awards.js";
import { analyticsRouter } from "./api/routes/analytics.js";
import { stripeWebhooksRouter } from "./api/routes/stripe-webhooks.js";
import { logger } from "./utils/logger.js";

const app = express();
const config = getConfigSafe();

app.use(helmet());
app.use(cors());

app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhooksRouter
);

app.use(express.json());

const limiter = rateLimit({
  windowMs: Number(config.RATE_LIMIT_WINDOW_MS) || 900000,
  max: Number(config.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

app.use("/api", limiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0" });
});

app.use("/api/v1/tenders", authenticateApiKey, tendersRouter);
app.use("/api/v1/awards", authenticateApiKey, awardsRouter);
app.use("/api/v1/analytics", authenticateApiKey, analyticsRouter);

app.get("/api/v1/sources", authenticateApiKey, (_req, res) => {
  res.json({
    data: [
      { id: "ted_europa", name: "TED Europa", region: "Europe", url: "https://ted.europa.eu" },
      { id: "sam_gov", name: "SAM.gov", region: "North America", url: "https://sam.gov" },
      { id: "who_procurement", name: "WHO Procurement", region: "Global", url: "https://www.who.int/procurement" },
      { id: "nhs_supply_chain", name: "NHS Supply Chain", region: "United Kingdom", url: "https://nhssupplychain.nhs.uk" },
    ],
  });
});

app.use(express.static("dashboard/dist"));

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const port = Number(config.API_PORT) || 3000;

app.listen(port, () => {
  logger.info(`HealthProcure Intel API running on port ${port}`);
});

export { app };
