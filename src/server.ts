import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localStore, DEV_API_KEY } from "./db/local-store.js";
import { logger } from "./utils/logger.js";
import type { ApiTier } from "./types/index.js";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import dotenv from "dotenv";
import Stripe from "stripe";
import crypto from "node:crypto";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const USE_SUPABASE = !!(SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.startsWith("https://") && !process.env.FORCE_LOCAL);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabase: any = null;
if (USE_SUPABASE) {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);
    logger.info("Connected to Supabase", { url: SUPABASE_URL });
  } catch (err) {
    logger.error("Failed to init Supabase, falling back to local mode", { error: String(err) });
  }
} else {
  logger.info("Running in local mode (no Supabase credentials)");
}

const mode = supabase ? "supabase" : "local";

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());

// Stripe webhooks need raw body — must come before express.json()
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  if (!STRIPE_SECRET || !STRIPE_WEBHOOK_SECRET) {
    res.status(503).json({ error: "Stripe not configured" });
    return;
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(STRIPE_SECRET);
    const sig = req.headers["stripe-signature"] as string;
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error("Stripe signature verification failed", { error: String(err) });
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  const STRIPE_PRICES: Record<string, ApiTier> = {
    "price_1TlrIaC3JZLLw9RVctcI96FW": "enterprise",
    "price_1TlrI0C3JZLLw9RVM2BRHEy9": "pro",
    "price_1TlrGvC3JZLLw9RVUSzeqONA": "basic",
  };

  function resolveTier(priceId: string, amount?: number): ApiTier {
    if (STRIPE_PRICES[priceId]) return STRIPE_PRICES[priceId];
    if (amount === 49900) return "enterprise";
    if (amount === 19900) return "pro";
    if (amount === 4900) return "basic";
    return "basic";
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_email ?? session.customer_details?.email ?? "";
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const priceId = session.metadata?.price_id ?? "";
        const amount = session.amount_total ?? undefined;
        const tier = resolveTier(priceId, amount);
        const apiKey = `hpi_${crypto.randomBytes(32).toString("hex")}`;

        if (USE_SUPABASE && supabase) {
          await supabase.from("api_keys").insert({
            id: crypto.randomUUID(),
            key: apiKey,
            user_id: customerId,
            email,
            tier,
            is_active: true,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          });
        }
        logger.info("API key provisioned", { email, tier });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        if (USE_SUPABASE && supabase) {
          await supabase.from("api_keys").update({ is_active: false }).eq("stripe_subscription_id", sub.id);
        }
        logger.info("API key deactivated", { subscriptionId: sub.id });
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const item = sub.items.data[0];
        const newTier = resolveTier(item?.price.id ?? "", (item?.price.unit_amount ?? undefined) as number | undefined);
        if (USE_SUPABASE && supabase) {
          await supabase.from("api_keys").update({ tier: newTier }).eq("stripe_subscription_id", sub.id);
        }
        logger.info("Subscription tier updated", { subscriptionId: sub.id, tier: newTier });
        break;
      }
    }
  } catch (err) {
    logger.error("Webhook processing error", { type: event.type, error: String(err) });
  }

  res.json({ received: true });
});

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

async function authMiddleware(req: AuthReq, res: Response, next: NextFunction): Promise<void> {
  const key = req.headers["x-api-key"] as string | undefined;
  if (!key) {
    res.status(401).json({ error: "Missing API key. Pass it via X-API-Key header." });
    return;
  }

  if (USE_SUPABASE && supabase) {
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key", key)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      res.status(401).json({ error: "Invalid or inactive API key." });
      return;
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      res.status(401).json({ error: "API key has expired." });
      return;
    }
    await supabase
      .from("api_keys")
      .update({ request_count: data.request_count + 1, last_used_at: new Date().toISOString() })
      .eq("id", data.id);
    req.tierLimits = TIER_LIMITS[data.tier as ApiTier];
  } else {
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
  }
  next();
}

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

app.use("/api", limiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0", mode });
});

// --- Tenders ---

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

app.get("/api/v1/tenders", authMiddleware, async (req: AuthReq, res) => {
  const parsed = tendersFilters.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters", details: parsed.error.issues });
    return;
  }
  const f = parsed.data;
  f.pageSize = Math.min(f.pageSize, req.tierLimits?.maxPageSize ?? 20);

  if (USE_SUPABASE && supabase) {
    let query = supabase.from("tenders").select("*", { count: "exact" });
    if (f.source) query = query.eq("source", f.source);
    if (f.category) query = query.eq("category", f.category);
    if (f.status) query = query.eq("status", f.status);
    if (f.country) query = query.eq("buyer_country", f.country);
    if (f.region) query = query.eq("buyer_region", f.region);
    if (f.minValue) query = query.gte("value_usd", f.minValue);
    if (f.maxValue) query = query.lte("value_usd", f.maxValue);
    if (f.publishedAfter) query = query.gte("published_at", f.publishedAfter);
    if (f.publishedBefore) query = query.lte("published_at", f.publishedBefore);
    if (f.search) query = query.textSearch("title", f.search, { type: "websearch" });
    const offset = (f.page - 1) * f.pageSize;
    const { data, count, error } = await query.order("published_at", { ascending: false }).range(offset, offset + f.pageSize - 1);
    if (error) { res.status(500).json({ error: "Database query failed" }); return; }
    res.json({ data: data ?? [], pagination: { page: f.page, pageSize: f.pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / f.pageSize) } });
  } else {
    const { data, total } = localStore.queryTenders(f);
    res.json({ data, pagination: { page: f.page, pageSize: f.pageSize, total, totalPages: Math.ceil(total / f.pageSize) } });
  }
});

app.get("/api/v1/tenders/:id", authMiddleware, async (req, res) => {
  if (USE_SUPABASE && supabase) {
    const { data, error } = await supabase.from("tenders").select("*").eq("id", req.params.id).single();
    if (error || !data) { res.status(404).json({ error: "Tender not found" }); return; }
    res.json({ data });
  } else {
    const tender = localStore.tenders.find((t) => t.id === req.params.id);
    if (!tender) { res.status(404).json({ error: "Tender not found" }); return; }
    res.json({ data: tender });
  }
});

// --- Awards ---

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

app.get("/api/v1/awards", authMiddleware, async (req: AuthReq, res) => {
  const parsed = awardsFilters.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters", details: parsed.error.issues });
    return;
  }
  const f = parsed.data;
  f.pageSize = Math.min(f.pageSize, req.tierLimits?.maxPageSize ?? 20);

  if (USE_SUPABASE && supabase) {
    let query = supabase.from("contract_awards").select("*", { count: "exact" });
    if (f.tenderId) query = query.eq("tender_id", f.tenderId);
    if (f.supplierCountry) query = query.eq("supplier_country", f.supplierCountry);
    if (f.source) query = query.eq("source", f.source);
    if (f.minValue) query = query.gte("award_value_usd", f.minValue);
    if (f.maxValue) query = query.lte("award_value_usd", f.maxValue);
    if (f.awardedAfter) query = query.gte("award_date", f.awardedAfter);
    if (f.awardedBefore) query = query.lte("award_date", f.awardedBefore);
    const offset = (f.page - 1) * f.pageSize;
    const { data, count, error } = await query.order("award_date", { ascending: false }).range(offset, offset + f.pageSize - 1);
    if (error) { res.status(500).json({ error: "Database query failed" }); return; }
    res.json({ data: data ?? [], pagination: { page: f.page, pageSize: f.pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / f.pageSize) } });
  } else {
    const { data, total } = localStore.queryAwards(f);
    res.json({ data, pagination: { page: f.page, pageSize: f.pageSize, total, totalPages: Math.ceil(total / f.pageSize) } });
  }
});

// --- Analytics ---

app.get("/api/v1/analytics/stats", authMiddleware, async (_req, res) => {
  if (USE_SUPABASE && supabase) {
    try {
      const [tenderRes, openRes, awardRes] = await Promise.all([
        supabase.from("tenders").select("*", { count: "exact", head: true }),
        supabase.from("tenders").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("contract_awards").select("award_value_usd"),
      ]);
      const totalTenders = tenderRes.count ?? 0;
      const openTenders = openRes.count ?? 0;
      const awards = awardRes.data ?? [];
      const totalAwardValueUsd = awards.reduce((s: number, a: any) => s + (Number(a.award_value_usd) || 0), 0);
      const avgContractValueUsd = awards.length > 0 ? totalAwardValueUsd / awards.length : 0;

      const { data: allTenders } = await supabase
        .from("tenders")
        .select("buyer_region, category, source, published_at, value_usd, buyer_name, buyer_country");

      const tendersByRegion: Record<string, number> = {};
      const tendersByCategory: Record<string, number> = {};
      const tendersBySource: Record<string, number> = {};
      const monthlyMap: Record<string, { count: number; totalValue: number }> = {};
      const buyerMap: Record<string, { country: string; count: number }> = {};

      for (const t of allTenders ?? []) {
        tendersByRegion[t.buyer_region || "Unknown"] = (tendersByRegion[t.buyer_region || "Unknown"] ?? 0) + 1;
        tendersByCategory[t.category || "other"] = (tendersByCategory[t.category || "other"] ?? 0) + 1;
        tendersBySource[t.source || "unknown"] = (tendersBySource[t.source || "unknown"] ?? 0) + 1;
        if (t.published_at) {
          const month = t.published_at.slice(0, 7);
          if (!monthlyMap[month]) monthlyMap[month] = { count: 0, totalValue: 0 };
          monthlyMap[month].count++;
          monthlyMap[month].totalValue += Number(t.value_usd) || 0;
        }
        if (t.buyer_name) {
          if (!buyerMap[t.buyer_name]) buyerMap[t.buyer_name] = { country: t.buyer_country ?? "", count: 0 };
          buyerMap[t.buyer_name].count++;
        }
      }

      res.json({
        data: {
          totalTenders, openTenders,
          totalAwardValueUsd: Math.round(totalAwardValueUsd),
          avgContractValueUsd: Math.round(avgContractValueUsd),
          tendersByRegion, tendersByCategory, tendersBySource,
          monthlyTrend: Object.entries(monthlyMap).map(([month, d]) => ({ month, ...d })).sort((a, b) => a.month.localeCompare(b.month)),
          topBuyers: Object.entries(buyerMap).map(([name, d]) => ({ name, country: d.country, tenderCount: d.count })).sort((a, b) => b.tenderCount - a.tenderCount).slice(0, 10),
        },
      });
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.json({ data: localStore.getStats() });
  }
});

app.get("/api/v1/analytics/benchmarks", authMiddleware, async (req, res) => {
  const region = req.query.region as string | undefined;
  const category = req.query.category as string | undefined;

  if (USE_SUPABASE && supabase) {
    let query = supabase.from("supply_chain_benchmarks").select("*");
    if (region) query = query.eq("region", region);
    if (category) query = query.eq("category", category);
    const { data, error } = await query.order("calculated_at", { ascending: false });
    if (error) { res.status(500).json({ error: "Database query failed" }); return; }
    res.json({ data: data ?? [] });
  } else {
    res.json({ data: localStore.queryBenchmarks({ region, category }) });
  }
});

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

// --- Stripe Checkout & Billing ---

app.post("/api/v1/checkout", async (req, res) => {
  if (!STRIPE_SECRET) {
    res.status(503).json({ error: "Stripe not configured" });
    return;
  }
  const { priceId, email } = req.body;
  if (!priceId || !email) {
    res.status(400).json({ error: "priceId and email are required" });
    return;
  }

  try {
    const stripe = new Stripe(STRIPE_SECRET);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { price_id: priceId },
      success_url: `${req.headers.origin || req.protocol + "://" + req.get("host")}/dashboard?checkout=success`,
      cancel_url: `${req.headers.origin || req.protocol + "://" + req.get("host")}/#pricing`,
    });
    res.json({ url: session.url });
  } catch (err) {
    logger.error("Checkout session creation failed", { error: String(err) });
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

app.post("/api/v1/billing/portal", async (req, res) => {
  if (!STRIPE_SECRET) {
    res.status(503).json({ error: "Stripe not configured" });
    return;
  }
  const { customerId } = req.body;
  if (!customerId) {
    res.status(400).json({ error: "customerId is required" });
    return;
  }

  try {
    const stripe = new Stripe(STRIPE_SECRET);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin || req.protocol + "://" + req.get("host")}/dashboard`,
    });
    res.json({ url: session.url });
  } catch (err) {
    logger.error("Billing portal session failed", { error: String(err) });
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

app.post("/api/v1/signup/free", async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }

  const apiKey = `hpi_${crypto.randomBytes(32).toString("hex")}`;

  if (USE_SUPABASE && supabase) {
    const { data: existing } = await supabase
      .from("api_keys")
      .select("key")
      .eq("email", email)
      .eq("is_active", true)
      .limit(1);

    if (existing && existing.length > 0) {
      res.status(409).json({ error: "An API key already exists for this email" });
      return;
    }

    const { error } = await supabase.from("api_keys").insert({
      id: crypto.randomUUID(),
      key: apiKey,
      user_id: email,
      email,
      tier: "free",
      is_active: true,
    });
    if (error) {
      logger.error("Free signup failed", { error: error.message });
      res.status(500).json({ error: "Failed to create API key" });
      return;
    }
  }

  logger.info("Free API key provisioned", { email });
  res.json({ apiKey, tier: "free", message: "Your API key has been created. Store it securely — it cannot be retrieved again." });
});

// --- Stripe Product Info ---

app.get("/api/v1/pricing", (_req, res) => {
  res.json({
    data: [
      { tier: "free", name: "Free", price: 0, requestsPerDay: 100, maxPageSize: 20, benchmarks: false },
      { tier: "basic", name: "Basic", price: 4900, stripePriceId: "price_1TlrGvC3JZLLw9RVUSzeqONA", requestsPerDay: 1000, maxPageSize: 50, benchmarks: false },
      { tier: "pro", name: "Pro", price: 19900, stripePriceId: "price_1TlrI0C3JZLLw9RVM2BRHEy9", requestsPerDay: 10000, maxPageSize: 200, benchmarks: true, featured: true },
      { tier: "enterprise", name: "Enterprise", price: 49900, stripePriceId: "price_1TlrIaC3JZLLw9RVctcI96FW", requestsPerDay: -1, maxPageSize: 500, benchmarks: true },
    ],
  });
});

// Resolve static asset directories — bulletproof for any CWD or __dirname
const publicDir = [
  path.resolve(__dirname, "..", "public"),
  path.resolve(__dirname, "public"),
  path.join(process.cwd(), "public"),
].find((d) => fs.existsSync(d)) ?? path.join(process.cwd(), "public");

const dashboardDir = [
  path.resolve(__dirname, "..", "dashboard"),
  path.resolve(__dirname, "dashboard"),
  path.join(process.cwd(), "dashboard"),
].find((d) => fs.existsSync(d)) ?? path.join(process.cwd(), "dashboard");

logger.info("Static dirs", { publicDir, dashboardDir });

// Serve marketing site
app.use(express.static(publicDir));
app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// Serve static pages
const staticPages = ["terms", "privacy", "docs", "products", "support", "blog"];
for (const page of staticPages) {
  app.get(`/${page}`, (_req, res) => {
    res.sendFile(path.join(publicDir, `${page}.html`));
  });
}

// Serve individual blog posts with clean URLs: /blog/<slug>
app.get("/blog/:slug", (req, res) => {
  const slug = path.basename(req.params.slug, ".html");
  const filePath = path.join(publicDir, "blog", `${slug}.html`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).sendFile(path.join(publicDir, "index.html"));
  }
});

// Serve dashboard at /dashboard
app.use("/dashboard", express.static(dashboardDir));
app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(dashboardDir, "index.html"));
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const port = Number(process.env.PORT) || Number(process.env.API_PORT) || 3000;
const server = app.listen(port, () => {
  logger.info(`HealthProcure Intel API running`, { port, mode });
  logger.info(`Website: http://localhost:${port}`);
  logger.info(`Dashboard: http://localhost:${port}/dashboard`);
  if (!USE_SUPABASE) {
    logger.info(`Dev API key: ${DEV_API_KEY}`);
    logger.info(`Try: curl -H "X-API-Key: ${DEV_API_KEY}" http://localhost:${port}/api/v1/tenders`);
  }
});

export { app, server };
