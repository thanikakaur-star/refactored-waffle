import { Router } from "express";
import { getSupabaseClient } from "../../db/client.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

const filtersSchema = z.object({
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
    let query = client.from("contract_awards").select("*", { count: "exact" });

    if (filters.tenderId) query = query.eq("tender_id", filters.tenderId);
    if (filters.supplierCountry) query = query.eq("supplier_country", filters.supplierCountry);
    if (filters.source) query = query.eq("source", filters.source);
    if (filters.minValue) query = query.gte("award_value_usd", filters.minValue);
    if (filters.maxValue) query = query.lte("award_value_usd", filters.maxValue);
    if (filters.awardedAfter) query = query.gte("award_date", filters.awardedAfter);
    if (filters.awardedBefore) query = query.lte("award_date", filters.awardedBefore);

    const offset = (filters.page - 1) * filters.pageSize;
    query = query.order("award_date", { ascending: false }).range(offset, offset + filters.pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      res.status(500).json({ error: "Database query failed" });
      return;
    }

    res.json({
      data: data ?? [],
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / filters.pageSize),
      },
    });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as awardsRouter };
