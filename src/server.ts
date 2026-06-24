import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localStore, DEV_API_KEY } from "./db/local-store.js";
import { logger } from "./utils/logger.js";
import type { ApiTier } from "./types/index.js";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(express.json());

const TIER_LIMITS: Record<ApiTier, { requestsPerDay: number; maxPageSize: number }> = {
  free: { requestsPerDay: 50, maxPageSize: 10 },
  basic: { requestsPerDay: 500, maxPageSize: 50 },
  pro: { requestsPerDay: 5000, maxPageSize: 100 },
  enterprise: { requestsPerDay: 50000, maxPageSize: 500 },
};

interface AuthReq extends Request {
  tierLimits?: { requestsPerDay: number; maxPageSize: number };
}

function authMiddleware(req: AuthReq, res: Response, next: NextFunction): void {
  const key = req.headers["x-api-key"] as string | undefined;
  if (!key) {
    res.status(401).json({ error: "Missing API key. Pass it via X-API-Key header." });
    return;
  }
  const found = localStore.findApiKey(key);
  if (!found) {
    res.status(401).json({ error: "Invalid or inactive API key." });
    return;
  }
  if (found.expires_at && new Date(found.expires_at) < new Date()) {
    res.status(401).json({ error: "API key has expired." });
    return;
  }
  localStore.incrementKeyUsage(found.id);
  req.tierLimits = TIER_LIMITS[found.tier];
  next();
}

const limiter = rateLimit({
  windowMs: 900000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

app.use("/api", limiter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0", mode: "local" });
});

// Tenders filter schema
const tendersFilters = z.object({
  source: z.enum(["ted_europa", "sam_gov", "who_procurement", "nhs_supply_chain", "manual"]).optional(),
  category: z.enum([
    "medical_devices", "pharmaceuticals", "health_it", "laboratory_equipment",
    "hospital_infrastructure", "personal_protective_equipment", "diagnostics",
    "surgical_instruments", "telemedicine", "other",
  ]).optional(),
  status: z.enum(["open", "closed", "awarded", "cancelled", "planned"]).optional(),
  country: z.string().max(5).optional(),
  region: z.string().max(50).optional(),
  minValue: z.coerce.number().min(0).optional(),
  maxValue: z.coerce.number().min(0).optional(),
  publishedAfter: z.string().optional(),
  publishedBefore: z.string().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
});

// GET /api/v1/tenders
app.get("/api/v1/tenders", authMiddleware, (req: AuthReq, res) => {
  const parsed = tendersFilters.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters", details: parsed.error.issues });
    return;
  }
  const f = parsed.data;
  f.pageSize = Math.min(f.pageSize, req.tierLimits?.maxPageSize ?? 20);
  const { data, total } = localStore.queryTenders(f);
  res.json({
    data,
    pagination: { page: f.page, pageSize: f.pageSize, total, totalPages: Math.ceil(total / f.pageSize) },
  });
});

// GET /api/v1/tenders/:id
app.get("/api/v1/tenders/:id", authMiddleware, (req, res) => {
  const tender = localStore.tenders.find((t) => t.id === req.params.id);
  if (!tender) { res.status(404).json({ error: "Tender not found" }); return; }
  res.json({ data: tender });
});

// Awards filter schema
const awardsFilters = z.object({
  tenderId: z.string().uuid().optional(),
  supplierCountry: z.string().max(5).optional(),
  source: z.enum(["ted_europa", "sam_gov", "who_procurement", "nhs_supply_chain", "manual"]).optional(),
  minValue: z.coerce.number().min(0).optional(),
  maxValue: z.coerce.number().min(0).optional(),
  awardedAfter: z.string().optional(),
  awardedBefore: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
});

// GET /api/v1/awards
app.get("/api/v1/awards", authMiddleware, (req: AuthReq, res) => {
  const parsed = awardsFilters.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters", details: parsed.error.issues });
    return;
  }
  const f = parsed.data;
  f.pageSize = Math.min(f.pageSize, req.tierLimits?.maxPageSize ?? 20);
  const { data, total } = localStore.queryAwards(f);
  res.json({
    data,
    pagination: { page: f.page, pageSize: f.pageSize, total, totalPages: Math.ceil(total / f.pageSize) },
  });
});

// GET /api/v1/analytics/stats
app.get("/api/v1/analytics/stats", authMiddleware, (_req, res) => {
  res.json({ data: localStore.getStats() });
});

// GET /api/v1/analytics/benchmarks
app.get("/api/v1/analytics/benchmarks", authMiddleware, (req, res) => {
  const region = req.query.region as string | undefined;
  const category = req.query.category as string | undefined;
  res.json({ data: localStore.queryBenchmarks({ region, category }) });
});

// GET /api/v1/sources
app.get("/api/v1/sources", authMiddleware, (_req, res) => {
  res.json({
    data: [
      { id: "ted_europa", name: "TED Europa", region: "Europe", url: "https://ted.europa.eu" },
      { id: "sam_gov", name: "SAM.gov", region: "North America", url: "https://sam.gov" },
      { id: "who_procurement", name: "WHO Procurement", region: "Global", url: "https://www.who.int/procurement" },
      { id: "nhs_supply_chain", name: "NHS Supply Chain", region: "United Kingdom", url: "https://nhssupplychain.nhs.uk" },
    ],
  });
});

// Serve dashboard
app.use(express.static(path.join(__dirname, "..", "dashboard")));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "dashboard", "index.html"));
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const port = Number(process.env.API_PORT) || 3000;

const server = app.listen(port, () => {
  logger.info(`HealthProcure Intel API running`, { port, mode: "local" });
  logger.info(`Dashboard: http://localhost:${port}`);
  logger.info(`Dev API key: ${DEV_API_KEY}`);
  logger.info(`Try: curl -H "X-API-Key: ${DEV_API_KEY}" http://localhost:${port}/api/v1/tenders`);
});

export { app, server };
