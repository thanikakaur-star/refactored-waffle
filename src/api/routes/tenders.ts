import { Router } from "express";
import { getSupabaseClient } from "../../db/client.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import type { TenderFilters, PaginatedResponse, Tender } from "../../types/index.js";
import { z } from "zod";

const router = Router();

const filtersSchema = z.object({
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

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = filtersSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.issues });
      return;
    }

    const filters = parsed.data;
    const maxPageSize = req.tierLimits?.maxPageSize ?? 20;
    filters.pageSize = Math.min(filters.pageSize, maxPageSize);

    const client = getSupabaseClient();
    let query = client.from("tenders").select("*", { count: "exact" });

    if (filters.source) query = query.eq("source", filters.source);
    if (filters.category) query = query.eq("category", filters.category);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.country) query = query.eq("buyer_country", filters.country);
    if (filters.region) query = query.eq("buyer_region", filters.region);
    if (filters.minValue) query = query.gte("value_usd", filters.minValue);
    if (filters.maxValue) query = query.lte("value_usd", filters.maxValue);
    if (filters.publishedAfter) query = query.gte("published_at", filters.publishedAfter);
    if (filters.publishedBefore) query = query.lte("published_at", filters.publishedBefore);
    if (filters.search) query = query.textSearch("title", filters.search, { type: "websearch" });

    const offset = (filters.page - 1) * filters.pageSize;
    query = query.order("published_at", { ascending: false }).range(offset, offset + filters.pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      res.status(500).json({ error: "Database query failed", details: error.message });
      return;
    }

    const response: PaginatedResponse<Tender> = {
      data: (data ?? []) as unknown as Tender[],
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / filters.pageSize),
      },
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("tenders")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !data) {
      res.status(404).json({ error: "Tender not found" });
      return;
    }

    res.json({ data });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as tendersRouter };
