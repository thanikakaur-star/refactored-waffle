import { Router } from "express";
import { getSupabaseClient } from "../../db/client.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { requireTier } from "../middleware/auth.js";
import type { DashboardStats } from "../../types/index.js";

const router = Router();

router.get("/stats", async (_req: AuthenticatedRequest, res) => {
  try {
    const client = getSupabaseClient();

    const [tenderRes, openRes, awardRes] = await Promise.all([
      client.from("tenders").select("*", { count: "exact", head: true }),
      client.from("tenders").select("*", { count: "exact", head: true }).eq("status", "open"),
      client.from("contract_awards").select("award_value_usd"),
    ]);

    const totalTenders = tenderRes.count ?? 0;
    const openTenders = openRes.count ?? 0;

    const awards = awardRes.data ?? [];
    const totalAwardValueUsd = awards.reduce((s, a) => s + (Number(a.award_value_usd) || 0), 0);
    const avgContractValueUsd = awards.length > 0 ? totalAwardValueUsd / awards.length : 0;

    const { data: allTenders } = await client
      .from("tenders")
      .select("buyer_region, category, source, published_at, value_usd, buyer_name, buyer_country");

    const tendersByRegion: Record<string, number> = {};
    const tendersByCategory: Record<string, number> = {};
    const tendersBySource: Record<string, number> = {};
    const monthlyMap: Record<string, { count: number; totalValue: number }> = {};
    const buyerMap: Record<string, { country: string; count: number }> = {};

    for (const t of allTenders ?? []) {
      const region = t.buyer_region || "Unknown";
      tendersByRegion[region] = (tendersByRegion[region] ?? 0) + 1;

      const cat = t.category || "other";
      tendersByCategory[cat] = (tendersByCategory[cat] ?? 0) + 1;

      const src = t.source || "unknown";
      tendersBySource[src] = (tendersBySource[src] ?? 0) + 1;

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

    const monthlyTrend = Object.entries(monthlyMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const topBuyers = Object.entries(buyerMap)
      .map(([name, data]) => ({ name, country: data.country, tenderCount: data.count }))
      .sort((a, b) => b.tenderCount - a.tenderCount)
      .slice(0, 10);

    const stats: DashboardStats = {
      totalTenders,
      openTenders,
      totalAwardValueUsd: Math.round(totalAwardValueUsd),
      avgContractValueUsd: Math.round(avgContractValueUsd),
      tendersByRegion,
      tendersByCategory,
      tendersBySource,
      monthlyTrend,
      topBuyers,
    };

    res.json({ data: stats });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/benchmarks", requireTier("pro", "enterprise"), async (req: AuthenticatedRequest, res) => {
  try {
    const client = getSupabaseClient();
    const { region, category } = req.query;

    let query = client.from("supply_chain_benchmarks").select("*");
    if (region) query = query.eq("region", region);
    if (category) query = query.eq("category", category);

    const { data, error } = await query.order("calculated_at", { ascending: false });

    if (error) {
      res.status(500).json({ error: "Database query failed" });
      return;
    }

    res.json({ data: data ?? [] });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as analyticsRouter };
