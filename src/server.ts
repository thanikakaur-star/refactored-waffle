import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localStore, DEV_API_KEY } from "./db/local-store.js";
import { logger } from "./utils/logger.js";
import { startScraperSchedule } from "./scraper/schedule.js";
import { buildLeads } from "./leads/leads.js";
import { sendLeadsDigest, startLeadsDigestSchedule } from "./leads/digest.js";
import { getSeoOverviewSafe, isSearchConsoleConfigured } from "./admin/searchConsole.js";
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
    "price_1TvExtC3JZLLw9RVXpliAtZR": "pro",
    // TODO: replace with the real £99 Growth price id from your Stripe dashboard.
    "price_1TzfciC3JZLLw9RVLUILgmDw": "growth",
    "price_1TlrGvC3JZLLw9RVUSzeqONA": "basic",
  };

  function resolveTier(priceId: string, amount?: number): ApiTier {
    if (STRIPE_PRICES[priceId]) return STRIPE_PRICES[priceId];
    if (amount === 49900) return "enterprise";
    if (amount === 19900) return "pro";
    if (amount === 9900) return "growth";
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

// Kept in sync with the limits advertised on the pricing page, since these are
// now enforced — what we promise must match what we allow.
// maxResults is the total result window a tier can page through on list
// endpoints (tenders/awards). -1 = unlimited. Without this cap, page size and
// the daily request count are the only limits, so a free user can simply
// paginate through the entire database — which is what paid tiers are meant to
// unlock. Free/basic now hit a hard wall and get an upgrade prompt.
const TIER_LIMITS: Record<ApiTier, { requestsPerDay: number; maxPageSize: number; maxResults: number }> = {
  free: { requestsPerDay: 100, maxPageSize: 20, maxResults: 100 },
  basic: { requestsPerDay: 1000, maxPageSize: 50, maxResults: 1000 },
  growth: { requestsPerDay: 3000, maxPageSize: 100, maxResults: 5000 },
  pro: { requestsPerDay: 10000, maxPageSize: 200, maxResults: -1 },
  enterprise: { requestsPerDay: 1000000, maxPageSize: 500, maxResults: -1 },
};

interface AuthReq extends Request {
  tierLimits?: { requestsPerDay: number; maxPageSize: number; maxResults: number };
  tier?: ApiTier;
  apiKeyId?: string;
  apiKeyEmail?: string;
}

// Enforce a tier's total result window on a list endpoint. Returns the DB range
// to read and whether the requested page falls entirely beyond the window (a
// hard paywall — free/basic can't paginate past their cap to reach all data).
function resultWindow(
  tier: ApiTier | undefined,
  maxResults: number | undefined,
  page: number,
  pageSize: number,
) {
  const cap = maxResults ?? 100;
  const offset = (page - 1) * pageSize;
  const unlimited = cap === -1;
  const wallHit = !unlimited && offset >= cap;
  // Don't let a page straddling the cap over-read past it.
  const rangeEnd = unlimited ? offset + pageSize - 1 : Math.min(offset + pageSize - 1, cap - 1);
  return { offset, rangeEnd, wallHit, cap, unlimited, tier: tier ?? "free" };
}

// Response for a page requested beyond the tier's window.
function paywallResponse(page: number, pageSize: number, cap: number, tier: string) {
  return {
    data: [],
    pagination: { page, pageSize, total: cap, totalPages: Math.ceil(cap / pageSize) },
    meta: {
      tier,
      resultWindow: cap,
      limitReached: true,
      message: `Your ${tier} plan can access the first ${cap.toLocaleString()} results. Upgrade to Pro to see every matching record.`,
    },
  };
}

// Cap the reported total/pages to the window, and flag when more exists behind
// the paywall so the client can show an upgrade prompt.
function windowMeta(total: number, cap: number, unlimited: boolean, tier: string) {
  const windowTotal = unlimited ? total : Math.min(total, cap);
  return {
    windowTotal,
    meta: {
      tier,
      resultWindow: unlimited ? null : cap,
      totalAvailable: total,
      limitReached: !unlimited && total > cap,
    },
  };
}

// Per-day request counter, keyed by API key. Resets each calendar day (UTC).
// In-memory: fine for a single instance; move to the DB/Redis to scale out.
const dailyUsage = new Map<string, { date: string; count: number }>();

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// Returns the remaining allowance after counting this request, or null if over.
// In-memory fallback used in local mode or before the DB migration is applied.
function consumeDailyRequest(key: string, limit: number): { remaining: number; limit: number } | null {
  const today = todayUTC();
  let usage = dailyUsage.get(key);
  if (!usage || usage.date !== today) {
    usage = { date: today, count: 0 };
    dailyUsage.set(key, usage);
  }
  if (usage.count >= limit) {
    return null; // over the limit
  }
  usage.count += 1;
  return { remaining: Math.max(0, limit - usage.count), limit };
}

// Database-backed daily counter — survives restarts and works across instances.
// Reads daily_request_count / daily_reset_date off the already-fetched key row,
// resets at the start of each UTC day, and persists the new count.
async function consumeDailyRequestDb(
  client: { from: (t: string) => any },
  row: { id: string; daily_request_count?: number; daily_reset_date?: string; request_count?: number },
  limit: number,
): Promise<{ remaining: number; limit: number } | null> {
  const today = todayUTC();
  let count = Number(row.daily_request_count) || 0;
  let resetDate = row.daily_reset_date;
  if (resetDate !== today) {
    count = 0;
    resetDate = today;
  }
  if (count >= limit) {
    return null; // over the limit — don't count the blocked request
  }
  count += 1;
  await client
    .from("api_keys")
    .update({
      daily_request_count: count,
      daily_reset_date: resetDate,
      request_count: (Number(row.request_count) || 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  return { remaining: Math.max(0, limit - count), limit };
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
    req.tierLimits = TIER_LIMITS[data.tier as ApiTier];
    req.tier = data.tier as ApiTier;
    req.apiKeyId = data.id;
    req.apiKeyEmail = data.email;
    const limit = req.tierLimits.requestsPerDay;

    // Enforce the daily request limit. Prefer the DB-backed counter (survives
    // restarts / multi-instance); fall back to in-memory if the migration that
    // adds daily_reset_date hasn't been applied yet.
    let allowance: { remaining: number; limit: number } | null;
    if (data.daily_reset_date !== undefined) {
      allowance = await consumeDailyRequestDb(supabase, data, limit);
    } else {
      allowance = consumeDailyRequest(key, limit);
      await supabase
        .from("api_keys")
        .update({ request_count: data.request_count + 1, last_used_at: new Date().toISOString() })
        .eq("id", data.id);
    }

    if (!allowance) {
      res.status(429).json({
        error: `Daily request limit reached (${limit}/day on the ${data.tier} plan). Upgrade for more, or try again tomorrow.`,
        tier: data.tier,
        limit,
      });
      return;
    }
    res.setHeader("X-RateLimit-Limit", String(allowance.limit));
    res.setHeader("X-RateLimit-Remaining", String(allowance.remaining));
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
    req.tierLimits = TIER_LIMITS[found.tier];
    req.tier = found.tier;
    req.apiKeyId = found.id;
    req.apiKeyEmail = found.email;

    const allowance = consumeDailyRequest(key, req.tierLimits.requestsPerDay);
    if (!allowance) {
      res.status(429).json({
        error: `Daily request limit reached (${req.tierLimits.requestsPerDay}/day on the ${found.tier} plan). Upgrade for more, or try again tomorrow.`,
        tier: found.tier,
        limit: req.tierLimits.requestsPerDay,
      });
      return;
    }
    res.setHeader("X-RateLimit-Limit", String(allowance.limit));
    res.setHeader("X-RateLimit-Remaining", String(allowance.remaining));

    localStore.incrementKeyUsage(found.id);
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
  source: z.enum(["ted_europa", "sam_gov", "who_procurement", "nhs_supply_chain", "contracts_finder", "find_a_tender", "world_bank", "canada_buys", "manual"]).optional(),
  category: z.enum([
    "medical_devices", "pharmaceuticals", "health_it", "laboratory_equipment",
    "hospital_infrastructure", "personal_protective_equipment", "diagnostics",
    "surgical_instruments", "telemedicine", "clinical_services", "allied_health", "occupational_therapy", "paramedic_services", "patient_transport", "social_care", "other",
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

  const win = resultWindow(req.tier, req.tierLimits?.maxResults, f.page, f.pageSize);
  // Hard paywall: the requested page is entirely beyond the tier's window.
  if (win.wallHit) {
    res.json(paywallResponse(f.page, f.pageSize, win.cap, win.tier));
    return;
  }

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
    if (f.search) query = query.textSearch("search_vector", f.search, { type: "websearch" });
    const { data, count, error } = await query.order("published_at", { ascending: false }).range(win.offset, win.rangeEnd);
    if (error) { res.status(500).json({ error: "Database query failed" }); return; }
    const { windowTotal, meta } = windowMeta(count ?? 0, win.cap, win.unlimited, win.tier);
    res.json({ data: data ?? [], pagination: { page: f.page, pageSize: f.pageSize, total: windowTotal, totalPages: Math.ceil(windowTotal / f.pageSize) }, meta });
  } else {
    const { data, total } = localStore.queryTenders(f);
    const { windowTotal, meta } = windowMeta(total, win.cap, win.unlimited, win.tier);
    // Local store already sliced by page; drop rows that fall past the window.
    const capped = win.unlimited ? data : data.slice(0, Math.max(0, win.cap - win.offset));
    res.json({ data: capped, pagination: { page: f.page, pageSize: f.pageSize, total: windowTotal, totalPages: Math.ceil(windowTotal / f.pageSize) }, meta });
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
  supplierName: z.string().max(200).optional(),
  category: z.enum([
    "medical_devices", "pharmaceuticals", "health_it", "laboratory_equipment",
    "hospital_infrastructure", "personal_protective_equipment", "diagnostics",
    "surgical_instruments", "telemedicine", "clinical_services", "allied_health", "occupational_therapy", "paramedic_services", "patient_transport", "social_care", "other",
  ]).optional(),
  source: z.enum(["ted_europa", "sam_gov", "who_procurement", "nhs_supply_chain", "contracts_finder", "find_a_tender", "world_bank", "canada_buys", "manual"]).optional(),
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

  const win = resultWindow(req.tier, req.tierLimits?.maxResults, f.page, f.pageSize);
  if (win.wallHit) {
    res.json(paywallResponse(f.page, f.pageSize, win.cap, win.tier));
    return;
  }

  if (USE_SUPABASE && supabase) {
    let query = supabase.from("contract_awards").select("*", { count: "exact" });
    if (f.tenderId) query = query.eq("tender_id", f.tenderId);
    if (f.supplierCountry) query = query.eq("supplier_country", f.supplierCountry);
    if (f.supplierName) query = query.ilike("supplier_name", `%${f.supplierName}%`);
    if (f.category) query = query.eq("category", f.category);
    if (f.source) query = query.eq("source", f.source);
    if (f.minValue) query = query.gte("award_value_usd", f.minValue);
    if (f.maxValue) query = query.lte("award_value_usd", f.maxValue);
    if (f.awardedAfter) query = query.gte("award_date", f.awardedAfter);
    if (f.awardedBefore) query = query.lte("award_date", f.awardedBefore);
    const { data, count, error } = await query.order("award_date", { ascending: false }).range(win.offset, win.rangeEnd);
    if (error) { res.status(500).json({ error: "Database query failed" }); return; }
    const { windowTotal, meta } = windowMeta(count ?? 0, win.cap, win.unlimited, win.tier);
    res.json({ data: data ?? [], pagination: { page: f.page, pageSize: f.pageSize, total: windowTotal, totalPages: Math.ceil(windowTotal / f.pageSize) }, meta });
  } else {
    const { data, total } = localStore.queryAwards(f);
    const { windowTotal, meta } = windowMeta(total, win.cap, win.unlimited, win.tier);
    const capped = win.unlimited ? data : data.slice(0, Math.max(0, win.cap - win.offset));
    res.json({ data: capped, pagination: { page: f.page, pageSize: f.pageSize, total: windowTotal, totalPages: Math.ceil(windowTotal / f.pageSize) }, meta });
  }
});

// --- Analytics ---

app.get("/api/v1/analytics/stats", authMiddleware, async (req, res) => {
  const tier = (req as AuthReq).tier ?? "free";
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
        meta: { tier },
      });
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.json({ data: localStore.getStats(), meta: { tier } });
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
      { id: "ted_europa", name: "TED Europa", region: "Europe", url: "https://ted.europa.eu", description: "EU-wide public procurement notices above threshold value.", updateFrequency: "Daily" },
      { id: "sam_gov", name: "SAM.gov", region: "North America", url: "https://sam.gov", description: "U.S. federal government contract opportunities.", updateFrequency: "Daily" },
      { id: "contracts_finder", name: "Contracts Finder", region: "United Kingdom", url: "https://www.contractsfinder.service.gov.uk", description: "UK local authority and lower-value public sector contracts, including NHS trusts.", updateFrequency: "Daily" },
      { id: "find_a_tender", name: "Find a Tender", region: "United Kingdom", url: "https://www.find-tender.service.gov.uk", description: "UK central government and above-threshold public contracts, including NHS Supply Chain tenders.", updateFrequency: "Daily" },
      { id: "world_bank", name: "World Bank", region: "Global", url: "https://projects.worldbank.org", description: "Procurement notices for World Bank-financed development projects worldwide, including health-sector contracts.", updateFrequency: "Daily" },
      { id: "canada_buys", name: "CanadaBuys", region: "Canada", url: "https://canadabuys.canada.ca", description: "Canadian federal and provincial public sector tender notices, including health-sector procurement.", updateFrequency: "Daily" },
    ],
  });
});

// --- Tender Alerts ---
// Save a filter as a standing alert; new matching tenders get emailed to you
// after each scrape run (src/alerts/notifier.ts), the same way NHS Supply
// Chain, Find a Tender, and TED Europa each notify you separately — except
// this covers every source in one alert.

const ALERT_LIMITS: Record<ApiTier, number> = { free: 3, basic: 3, growth: 10, pro: 20, enterprise: 100 };

const createAlertSchema = z.object({
  category: z.enum([
    "medical_devices", "pharmaceuticals", "health_it", "laboratory_equipment",
    "hospital_infrastructure", "personal_protective_equipment", "diagnostics",
    "surgical_instruments", "telemedicine", "clinical_services", "allied_health", "occupational_therapy", "paramedic_services", "patient_transport", "social_care", "other",
  ]).optional(),
  source: z.enum(["ted_europa", "sam_gov", "who_procurement", "nhs_supply_chain", "contracts_finder", "find_a_tender", "world_bank", "canada_buys", "manual"]).optional(),
  region: z.string().max(50).optional(),
  country: z.string().max(5).optional(),
  keyword: z.string().max(200).optional(),
  email: z.string().email().optional(),
});

app.get("/api/v1/alerts", authMiddleware, async (req: AuthReq, res) => {
  if (!req.apiKeyId) { res.status(401).json({ error: "Not authenticated" }); return; }

  if (USE_SUPABASE && supabase) {
    const { data, error } = await supabase
      .from("tender_alerts")
      .select("*")
      .eq("api_key_id", req.apiKeyId)
      .order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: "Database query failed" }); return; }
    res.json({ data: data ?? [] });
  } else {
    res.json({ data: localStore.listAlerts(req.apiKeyId) });
  }
});

app.post("/api/v1/alerts", authMiddleware, async (req: AuthReq, res) => {
  if (!req.apiKeyId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const parsed = createAlertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid alert parameters", details: parsed.error.issues });
    return;
  }
  const f = parsed.data;
  if (!f.category && !f.source && !f.region && !f.country && !f.keyword) {
    res.status(400).json({ error: "Provide at least one filter (category, source, region, country, or keyword)" });
    return;
  }

  const email = f.email || req.apiKeyEmail;
  if (!email) { res.status(400).json({ error: "No email on file for this API key — pass one explicitly" }); return; }

  const limit = ALERT_LIMITS[req.tier ?? "free"];

  if (USE_SUPABASE && supabase) {
    const { count } = await supabase
      .from("tender_alerts")
      .select("*", { count: "exact", head: true })
      .eq("api_key_id", req.apiKeyId)
      .eq("is_active", true);
    if ((count ?? 0) >= limit) {
      res.status(403).json({ error: `Your ${req.tier} plan allows up to ${limit} active alerts. Delete one or upgrade for more.` });
      return;
    }

    const { data, error } = await supabase
      .from("tender_alerts")
      .insert({
        id: crypto.randomUUID(),
        api_key_id: req.apiKeyId,
        email,
        category: f.category ?? null,
        source: f.source ?? null,
        region: f.region ?? null,
        country: f.country ?? null,
        keyword: f.keyword ?? null,
        is_active: true,
      })
      .select()
      .single();
    if (error) { res.status(500).json({ error: "Failed to create alert" }); return; }
    res.status(201).json({ data });
  } else {
    if (localStore.listAlerts(req.apiKeyId).length >= limit) {
      res.status(403).json({ error: `Your ${req.tier} plan allows up to ${limit} active alerts. Delete one or upgrade for more.` });
      return;
    }
    const data = localStore.createAlert({
      api_key_id: req.apiKeyId,
      email,
      category: f.category ?? null,
      source: f.source ?? null,
      region: f.region ?? null,
      country: f.country ?? null,
      keyword: f.keyword ?? null,
    });
    res.status(201).json({ data });
  }
});

app.delete("/api/v1/alerts/:id", authMiddleware, async (req: AuthReq, res) => {
  if (!req.apiKeyId) { res.status(401).json({ error: "Not authenticated" }); return; }

  if (USE_SUPABASE && supabase) {
    const { error, count } = await supabase
      .from("tender_alerts")
      .delete({ count: "exact" })
      .eq("id", req.params.id)
      .eq("api_key_id", req.apiKeyId);
    if (error) { res.status(500).json({ error: "Failed to delete alert" }); return; }
    if (!count) { res.status(404).json({ error: "Alert not found" }); return; }
    res.status(204).send();
  } else {
    const deleted = localStore.deleteAlert(req.params.id, req.apiKeyId);
    if (!deleted) { res.status(404).json({ error: "Alert not found" }); return; }
    res.status(204).send();
  }
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
  } else {
    // Local mode — persist to the in-memory store so the key actually
    // authenticates afterwards (otherwise we'd hand out a dead key).
    if (localStore.findApiKeyByEmail(email)) {
      res.status(409).json({ error: "An API key already exists for this email" });
      return;
    }
    localStore.createApiKey({ key: apiKey, email, tier: "free" });
  }

  logger.info("Free API key provisioned", { email });
  res.json({ apiKey, tier: "free", message: "Your API key has been created. Store it securely — it cannot be retrieved again." });
});

// --- Stripe Product Info ---

app.get("/api/v1/pricing", (_req, res) => {
  res.json({
    data: [
      { tier: "free", name: "Free", price: 0, requestsPerDay: 100, maxPageSize: 20, maxResults: 100, benchmarks: false },
      { tier: "basic", name: "Basic", price: 4900, stripePriceId: "price_1TlrGvC3JZLLw9RVUSzeqONA", requestsPerDay: 1000, maxPageSize: 50, maxResults: 1000, benchmarks: false },
      { tier: "growth", name: "Growth", price: 9900, stripePriceId: "price_1TzfciC3JZLLw9RVLUILgmDw", requestsPerDay: 3000, maxPageSize: 100, maxResults: 5000, benchmarks: false },
      { tier: "pro", name: "Pro", price: 19900, stripePriceId: "price_1TvExtC3JZLLw9RVXpliAtZR", requestsPerDay: 10000, maxPageSize: 200, maxResults: -1, benchmarks: true, featured: true },
      { tier: "enterprise", name: "Enterprise", price: 49900, stripePriceId: "price_1TlrIaC3JZLLw9RVctcI96FW", requestsPerDay: -1, maxPageSize: 500, maxResults: -1, benchmarks: true },
    ],
  });
});

// Public "Live Intelligence Feed" for the landing page — a small, unauthenticated
// teaser of the most recent tenders (marketing surface, not the real API). Only
// display-safe fields, capped at 12 rows, and cached in-memory for 60s so it
// can't hammer the database from public traffic.
let feedCache: { at: number; data: unknown[] } = { at: 0, data: [] };
const FEED_TTL_MS = 60_000;

app.get("/api/v1/feed", async (_req, res) => {
  const now = Date.now();
  if (now - feedCache.at < FEED_TTL_MS && feedCache.data.length) {
    res.json({ data: feedCache.data, cached: true });
    return;
  }
  try {
    let rows: Array<Record<string, unknown>> = [];
    if (USE_SUPABASE && supabase) {
      const { data } = await supabase
        .from("tenders")
        .select("source, category, title, value_usd, deadline, buyer_country, status")
        .order("published_at", { ascending: false })
        .limit(12);
      rows = data ?? [];
    } else {
      const { data } = localStore.queryTenders({ page: 1, pageSize: 12 } as never);
      rows = (data ?? []).map((t: any) => ({
        source: t.source, category: t.category, title: t.title,
        value_usd: t.valueUsd ?? t.value_usd, deadline: t.deadline,
        buyer_country: t.buyerCountry ?? t.buyer_country, status: t.status,
      }));
    }
    feedCache = { at: now, data: rows };
    res.json({ data: rows, cached: false });
  } catch (err) {
    logger.warn("Public feed query failed", { error: String(err) });
    res.json({ data: feedCache.data, cached: true });
  }
});

// Public, filtered teaser feed powering the programmatic SEO landing pages
// (/tenders/<slug>). Same marketing surface as /api/v1/feed — display-safe
// fields only, capped, and cached per filter-combo for 5 minutes so crawler
// and organic traffic can't hammer the database. NOT the authenticated API.
const publicTendersCache = new Map<string, { at: number; data: unknown[] }>();
const PUBLIC_TENDERS_TTL_MS = 5 * 60_000;
const PUBLIC_TENDERS_MAX = 12;

app.get("/api/v1/public-tenders", async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const region = typeof req.query.region === "string" ? req.query.region : undefined;
  const country = typeof req.query.country === "string" ? req.query.country : undefined;
  const cacheKey = `${category ?? ""}|${region ?? ""}|${country ?? ""}`;

  const now = Date.now();
  const hit = publicTendersCache.get(cacheKey);
  if (hit && now - hit.at < PUBLIC_TENDERS_TTL_MS) {
    res.json({ data: hit.data, cached: true });
    return;
  }

  try {
    let rows: Array<Record<string, unknown>> = [];
    if (USE_SUPABASE && supabase) {
      let q = supabase
        .from("tenders")
        .select("source, category, title, value_usd, deadline, buyer_country, buyer_region, status, url")
        .eq("status", "open")
        .order("published_at", { ascending: false })
        .limit(PUBLIC_TENDERS_MAX);
      if (category) q = q.eq("category", category);
      if (region) q = q.eq("buyer_region", region);
      if (country) q = q.eq("buyer_country", country);
      const { data } = await q;
      rows = data ?? [];
    } else {
      const { data } = localStore.queryTenders({ page: 1, pageSize: 50, category } as never);
      rows = (data ?? [])
        .map((t: any) => ({
          source: t.source, category: t.category, title: t.title,
          value_usd: t.valueUsd ?? t.value_usd, deadline: t.deadline,
          buyer_country: t.buyerCountry ?? t.buyer_country,
          buyer_region: t.buyerRegion ?? t.buyer_region, status: t.status, url: t.url,
        }))
        .filter((t: any) => (!region || t.buyer_region === region) && (!country || t.buyer_country === country))
        .slice(0, PUBLIC_TENDERS_MAX);
    }
    publicTendersCache.set(cacheKey, { at: now, data: rows });
    res.json({ data: rows, cached: false });
  } catch (err) {
    logger.warn("Public tenders query failed", { error: String(err), cacheKey });
    res.json({ data: hit?.data ?? [], cached: true });
  }
});

// --- Admin (private) ---

// Gate admin endpoints behind a single secret token (set ADMIN_TOKEN on the
// server). Compared in constant time to avoid timing leaks.
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  // Trim both sides so a stray newline/space pasted into the Railway variable
  // (a very common gotcha) doesn't cause a false "invalid token".
  const expected = (process.env.ADMIN_TOKEN || "").trim();
  const provided = ((req.headers["x-admin-token"] as string) || "").trim();
  if (!expected) {
    res.status(503).json({ error: "Admin area is not configured (ADMIN_TOKEN not set)." });
    return;
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }
  next();
}

// Lets the admin page check whether the token is correct before rendering
app.get("/api/admin/check", requireAdmin, (_req, res) => {
  res.json({ ok: true, searchConsoleConfigured: isSearchConsoleConfigured() });
});

// Manually trigger a scrape run and return the summary. Lets you verify the
// pipeline on demand (and after deploys) without the Railway CLI. Guarded so
// only one runs at a time. Playwright is loaded lazily inside run.js so this
// endpoint never pulls it in at server boot.
let scrapeInProgress = false;
app.post("/api/admin/scrape", requireAdmin, async (req, res) => {
  if (!USE_SUPABASE || !supabase) {
    res.status(503).json({ error: "Scraping requires Supabase (production mode)." });
    return;
  }
  if (scrapeInProgress) {
    res.status(409).json({ error: "A scrape is already running. Try again shortly." });
    return;
  }
  const source = typeof req.body?.source === "string" ? req.body.source : undefined;
  scrapeInProgress = true;
  try {
    const { runScrapers } = await import("./scraper/run.js");
    const summary = await runScrapers(source);
    res.json({ ok: true, summary });
  } catch (err) {
    logger.error("Manual scrape failed", { error: String(err) });
    res.status(500).json({ error: "Scrape failed", detail: String(err) });
  } finally {
    scrapeInProgress = false;
  }
});

// Simple scraper trigger UI (mobile-friendly)
app.get("/api/admin/scrape-trigger", requireAdmin, (_req, res) => {
  res.type("text/html").send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Trigger Scraper</title>
      <style>
        body { font-family: system-ui; background: #0a0a0f; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .container { text-align: center; padding: 40px 20px; max-width: 400px; }
        h1 { margin-bottom: 10px; }
        p { color: #94a3b8; margin-bottom: 30px; }
        button { background: #c9a96e; color: #0a0a0f; border: none; padding: 16px 32px; font-size: 16px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        button:hover { background: #d4af37; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        #status { margin-top: 20px; color: #94a3b8; font-size: 14px; min-height: 20px; }
        .success { color: #0d9488; }
        .error { color: #dc2626; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔄 Scraper Control</h1>
        <p>Trigger real-time data scrape from all procurement sources</p>
        <button onclick="triggerScrape()">Start Scrape</button>
        <div id="status"></div>
      </div>
      <script>
        async function triggerScrape() {
          const btn = document.querySelector('button');
          const status = document.getElementById('status');
          btn.disabled = true;
          status.textContent = 'Scraping in progress...';
          status.className = '';

          try {
            const token = prompt('Enter ADMIN_TOKEN:');
            if (!token) return;

            const res = await fetch('/api/admin/scrape', {
              method: 'POST',
              headers: { 'X-Admin-Token': token },
            });

            if (!res.ok) {
              throw new Error(\`Error \${res.status}: \${res.statusText}\`);
            }

            const data = await res.json();
            status.textContent = \`✓ Scrape complete! Tenders: \${data.summary?.totalTenders || 0}, Awards: \${data.summary?.totalAwards || 0}\`;
            status.className = 'success';
          } catch (err) {
            status.textContent = \`Error: \${err.message}\`;
            status.className = 'error';
          } finally {
            btn.disabled = false;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// SEO overview from Google Search Console
app.get("/api/admin/seo", requireAdmin, async (req, res) => {
  if (!isSearchConsoleConfigured()) {
    res.status(503).json({
      error: "Search Console is not connected. Set GSC_SERVICE_ACCOUNT_EMAIL, GSC_PRIVATE_KEY and GSC_SITE_URL.",
      configured: false,
    });
    return;
  }
  const days = Math.min(Math.max(Number(req.query.days) || 28, 1), 90);
  const result = await getSeoOverviewSafe(days);
  if (!result.ok) {
    res.status(502).json({ error: result.error, configured: true });
    return;
  }
  res.json({ data: result.data, configured: true });
});

// Business overview — signups, subscribers, MRR, usage, content counts
app.get("/api/admin/overview", requireAdmin, async (_req, res) => {
  // Monthly price per tier, in USD
  const TIER_PRICE_USD: Record<string, number> = { free: 0, basic: 49, growth: 99, pro: 199, enterprise: 499 };

  try {
    if (USE_SUPABASE && supabase) {
      const [keysRes, tendersRes, awardsRes, benchmarksRes] = await Promise.all([
        supabase.from("api_keys").select("tier, is_active, created_at, request_count, daily_request_count, email"),
        supabase.from("tenders").select("*", { count: "exact", head: true }),
        supabase.from("contract_awards").select("*", { count: "exact", head: true }),
        supabase.from("supply_chain_benchmarks").select("*", { count: "exact", head: true }),
      ]);

      const keys = (keysRes.data ?? []).filter((k: any) => k.is_active !== false);
      const byTier: Record<string, number> = { free: 0, basic: 0, growth: 0, pro: 0, enterprise: 0 };
      let mrr = 0;
      let totalRequests = 0;
      let requestsToday = 0;
      const today = new Date().toISOString().slice(0, 10);
      let signups7d = 0;
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      for (const k of keys) {
        const tier = (k.tier as string) || "free";
        byTier[tier] = (byTier[tier] ?? 0) + 1;
        mrr += TIER_PRICE_USD[tier] ?? 0;
        totalRequests += Number(k.request_count) || 0;
        if (k.daily_reset_date === today) requestsToday += Number(k.daily_request_count) || 0;
        if (k.created_at && new Date(k.created_at).getTime() >= weekAgo) signups7d += 1;
      }

      const paying = byTier.basic + byTier.growth + byTier.pro + byTier.enterprise;

      // Most recent signups (up to 5)
      const recent = [...keys]
        .filter((k: any) => k.created_at)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map((k: any) => ({ email: k.email, tier: k.tier, created_at: k.created_at }));

      res.json({
        data: {
          users: { total: keys.length, paying, free: byTier.free, signups7d, byTier },
          revenue: { mrr, arr: mrr * 12, currency: "USD" },
          usage: { totalRequests, requestsToday },
          content: {
            tenders: tendersRes.count ?? 0,
            awards: awardsRes.count ?? 0,
            benchmarks: benchmarksRes.count ?? 0,
          },
          recentSignups: recent,
        },
      });
    } else {
      // Local/dev fallback
      res.json({
        data: {
          users: { total: 1, paying: 1, free: 0, signups7d: 0, byTier: { free: 0, basic: 0, pro: 0, enterprise: 1 } },
          revenue: { mrr: 0, arr: 0, currency: "USD" },
          usage: { totalRequests: 0, requestsToday: 0 },
          content: { tenders: 0, awards: 0, benchmarks: 0 },
          recentSignups: [],
        },
      });
    }
  } catch (err) {
    logger.error("Admin overview failed", { error: String(err) });
    res.status(500).json({ error: "Failed to load overview" });
  }
});

// Scraper source diagnostics — which sources need an API key, whether that key
// is actually present in this environment (boolean only, the value is never
// exposed), and each source's most recent scrape run. Use this to confirm
// SAM.gov / GovCon keys are wired up on the deployed server and to spot a
// source that's silently erroring or returning nothing.
app.get("/api/admin/sources", requireAdmin, async (_req, res) => {
  const sources = [
    { source: "ted_europa", label: "TED Europa", keyEnv: null as string | null },
    { source: "sam_gov", label: "SAM.gov (official API)", keyEnv: "SAM_GOV_API_KEY" },
    { source: "sam_gov", label: "GovCon API (govconapi.com)", keyEnv: "GOVCON_API_KEY" },
    { source: "contracts_finder", label: "Contracts Finder (UK)", keyEnv: null },
    { source: "find_a_tender", label: "Find a Tender (UK)", keyEnv: null },
    { source: "world_bank", label: "World Bank", keyEnv: null },
    { source: "canada_buys", label: "CanadaBuys", keyEnv: null },
    { source: "who_procurement", label: "WHO Procurement (UNGM)", keyEnv: null },
    { source: "nhs_supply_chain", label: "NHS Supply Chain (SCCL)", keyEnv: null },
  ].map((s) => ({
    ...s,
    keyRequired: s.keyEnv !== null,
    keyConfigured: s.keyEnv ? !!process.env[s.keyEnv] : null,
  }));

  // Recent scrape_runs per source (best-effort — omitted in local mode). Kept
  // as a short list rather than a single row because SAM.gov and GovCon both
  // log under source="sam_gov" (GovCon persists tenders under the same source
  // by design), so a single newest-row-per-source would mask one behind the
  // other. In ALL_SCRAPERS order SAM.gov runs immediately before GovCon, so
  // within one scrape batch the earlier of the two sam_gov rows is SAM.gov and
  // the later is GovCon. Keep several rows so a full batch stays visible.
  const RUNS_PER_SOURCE = 5;
  let lastRuns: Record<string, unknown[]> = {};
  if (USE_SUPABASE && supabase) {
    try {
      const { data } = await supabase
        .from("scrape_runs")
        .select("source, completed_at, tenders_found, tenders_new, errors, status, duration_ms")
        .order("completed_at", { ascending: false })
        .limit(200);
      for (const run of data ?? []) {
        const src = (run as any).source as string;
        const bucket = (lastRuns[src] ??= []);
        if (bucket.length < RUNS_PER_SOURCE) bucket.push(run);
      }
    } catch (err) {
      logger.warn("Admin sources: failed to read scrape_runs", { error: String(err) });
    }
  }

  res.json({ data: { sources, lastRuns, mode: USE_SUPABASE ? "production" : "local" } });
});

// Automated outreach leads: suppliers who recently won healthcare contracts,
// ranked by recency and value. These are the warmest possible prospects (real,
// verifiable high intent), each with a built-in icebreaker (their latest win).
// Replaces running the leads SQL by hand.
app.get("/api/admin/leads", requireAdmin, async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 180, 7), 730);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);

  if (!(USE_SUPABASE && supabase)) {
    res.json({ data: { leads: [], mode: "local", note: "Leads require Supabase (production)." } });
    return;
  }

  try {
    const leads = await buildLeads(days, limit);
    res.json({ data: { leads, days, mode: "production", generatedAt: new Date().toISOString() } });
  } catch (err) {
    logger.warn("Admin leads query failed", { error: String(err) });
    res.status(500).json({ error: "Failed to build leads." });
  }
});

// Send the weekly leads digest on demand (to test the email before the cron runs).
app.post("/api/admin/leads/send-test", requireAdmin, async (_req, res) => {
  try {
    const result = await sendLeadsDigest();
    res.json({ data: result });
  } catch (err) {
    logger.warn("Admin leads test-send failed", { error: String(err) });
    res.status(500).json({ error: "Failed to send test digest." });
  }
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

// Redirect the Railway URL to the canonical custom domain (SEO: avoid duplicate
// indexing of the same site under two hostnames). Localhost and the custom
// domain are left untouched.
const CANONICAL_HOST = process.env.CANONICAL_HOST || "healthprocureintel.com";
app.use((req, res, next) => {
  const host = (req.headers.host || "").toLowerCase();
  if (host.endsWith(".up.railway.app")) {
    res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
    return;
  }
  next();
});

// Serve sitemap.xml and robots.txt from explicit routes with the correct
// content-types, BEFORE static/SPA handling. Google rejects a sitemap served
// as text/html ("Sitemap is HTML"), so we never want these falling through to
// any HTML handler — this guarantees the raw file with an XML/plain mime type.
app.get("/sitemap.xml", (_req, res) => {
  res.type("application/xml").sendFile(path.join(publicDir, "sitemap.xml"));
});
app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").sendFile(path.join(publicDir, "robots.txt"));
});

// Serve marketing site
app.use(express.static(publicDir));
app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// Serve static pages
const staticPages = ["terms", "privacy", "docs", "products", "support", "blog", "admin", "changelog", "carbon-reduction-policy", "modern-slavery-statement"];
for (const page of staticPages) {
  app.get(`/${page}`, (_req, res) => {
    res.sendFile(path.join(publicDir, `${page}.html`));
  });
}

// Programmatic SEO landing pages: /tenders (hub) and /tenders/<slug>
app.get("/tenders", (_req, res) => {
  res.sendFile(path.join(publicDir, "tenders", "index.html"));
});
app.get("/tenders/:slug", (req, res) => {
  const slug = path.basename(req.params.slug, ".html");
  const filePath = path.join(publicDir, "tenders", `${slug}.html`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).sendFile(path.join(publicDir, "index.html"));
  }
});

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

  // Start the schedules. Guard each so a bad cron/timezone env var logs and is
  // skipped rather than crashing the whole server at boot.
  try {
    startScraperSchedule();
  } catch (err) {
    logger.error("Failed to start scraper schedule (continuing)", { error: String(err) });
  }
  try {
    startLeadsDigestSchedule();
  } catch (err) {
    logger.error("Failed to start leads digest schedule (continuing)", { error: String(err) });
  }
});

export { app, server };
