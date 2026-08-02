import { getSupabaseClient } from "../db/client.js";

// A supplier that recently won healthcare contracts: the warmest, highest-intent
// outreach prospect, with a built-in icebreaker (their latest win).
export interface Lead {
  supplier: string;
  country: string;
  wins: number;
  totalUsd: number;
  latestWin: string;
  latestContract: string;
  latestValueUsd: number;
  source: string;
  categories: string[];
}

/**
 * Aggregate recent contract-award winners into ranked outreach leads. Groups
 * contract_awards by supplier over the last `days`, summing wins and value and
 * keeping the most recent award as the icebreaker. Ranked by recency, then value.
 */
export async function buildLeads(days = 180, limit = 50): Promise<Lead[]> {
  const client = getSupabaseClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data, error } = await client
    .from("contract_awards")
    .select("supplier_name, supplier_country, award_value_usd, award_date, tender_title, category, source")
    .not("supplier_name", "is", null)
    .gte("award_date", since)
    .order("award_date", { ascending: false })
    .limit(3000);
  if (error) throw new Error(error.message);

  const bySupplier = new Map<
    string,
    { supplier: string; country: string; wins: number; totalUsd: number; latest: any; categories: Set<string> }
  >();
  for (const a of (data ?? []) as any[]) {
    const name = (a.supplier_name || "").trim();
    if (!name) continue;
    let e = bySupplier.get(name);
    if (!e) {
      e = { supplier: name, country: a.supplier_country || "", wins: 0, totalUsd: 0, latest: a, categories: new Set() };
      bySupplier.set(name, e);
    }
    e.wins += 1;
    e.totalUsd += Number(a.award_value_usd) || 0;
    if (a.category) e.categories.add(a.category);
    if (a.award_date > e.latest.award_date) e.latest = a;
  }

  return [...bySupplier.values()]
    .map((e) => ({
      supplier: e.supplier,
      country: e.country,
      wins: e.wins,
      totalUsd: Math.round(e.totalUsd),
      latestWin: e.latest.award_date,
      latestContract: e.latest.tender_title || "",
      latestValueUsd: Math.round(Number(e.latest.award_value_usd) || 0),
      source: e.latest.source,
      categories: [...e.categories],
    }))
    .sort((a, b) => (a.latestWin < b.latestWin ? 1 : a.latestWin > b.latestWin ? -1 : b.totalUsd - a.totalUsd))
    .slice(0, limit);
}

function humanizeCat(cat?: string): string {
  return cat ? cat.replace(/_/g, " ") : "healthcare";
}

/**
 * A unique-per-supplier outreach opener, filled with the supplier, their category
 * and their latest win. [Name] stays a placeholder (award data identifies the
 * company, not the individual). Kept in sync with the dashboard copy button.
 */
export function outreachOpener(l: Lead): string {
  const S = l.supplier;
  const C = humanizeCat(l.categories[0]);
  let K = (l.latestContract || "").trim();
  if (K.length > 70) K = `${K.slice(0, 67).trim()}...`;
  const onK = K ? ` on ${K}` : "";
  const winK = K || "a healthcare contract";
  const variants = [
    `Hi [Name], congrats on ${S}'s recent win${onK}. I track new NHS and EU ${C} tenders so you can line up the next one early. I pulled a few that are open right now, want me to send them?`,
    `Hi [Name], I noticed ${S} won ${winK} recently, nice one. I aggregate ${C} tenders from the NHS, EU and global sources into one feed. Happy to send the open ones in your space, genuinely no pitch. Want them?`,
    `Hi [Name], saw ${S} is active in ${C} procurement (congrats on the recent win). I built a tool that surfaces new ${C} tenders across the NHS and EU the day they publish. Would a quick look be useful?`,
    `Hi [Name], ${S}'s recent win${onK} caught my eye. Most suppliers miss the next tender because it sits on a portal they don't check. I pull every new ${C} tender into one feed. Want the open ones for your category?`,
    `Hi [Name], congrats to ${S} on the recent ${C} win. I help suppliers catch the next opportunity early by aggregating NHS, EU and global ${C} tenders in one place. I found a few open now, shall I send them?`,
  ];
  let h = 0;
  for (let i = 0; i < S.length; i++) h = (h * 31 + S.charCodeAt(i)) >>> 0;
  return variants[h % variants.length];
}
