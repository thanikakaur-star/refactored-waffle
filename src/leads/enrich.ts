import { logger } from "../utils/logger.js";

export interface EnrichedContact {
  email: string;
  name: string;
  position: string;
  confidence: number;
}

export interface EnrichResult {
  configured: boolean;
  domain?: string;
  contacts: EnrichedContact[];
  error?: string;
}

// Finds published, verified work emails for a company via Hunter.io Domain
// Search. Requires HUNTER_API_KEY. Returns { configured:false } when no key is
// set so the UI can prompt for one. Decision-maker roles (procurement, bid,
// sales, BD, commercial, director/owner) are surfaced first, then by confidence.
export async function enrichCompanyEmails(company: string): Promise<EnrichResult> {
  const apiKey = (process.env.HUNTER_API_KEY || "").trim();
  if (!apiKey) return { configured: false, contacts: [] };
  if (!company.trim()) return { configured: true, contacts: [], error: "No company provided" };

  const url = new URL("https://api.hunter.io/v2/domain-search");
  url.searchParams.set("company", company.trim());
  url.searchParams.set("type", "personal");
  url.searchParams.set("limit", "10");
  url.searchParams.set("api_key", apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      logger.warn("Hunter enrich non-OK", { status: res.status, company });
      const reason = res.status === 429 ? "Hunter rate limit or credits exhausted" : `Hunter returned ${res.status}`;
      return { configured: true, contacts: [], error: reason };
    }
    const json = (await res.json()) as any;
    const domain = json?.data?.domain as string | undefined;
    const emails = (json?.data?.emails ?? []) as any[];
    const prioritise = /procure|purchas|\bbid\b|tender|business development|\bbd\b|sales|commercial|director|owner|founder|chief|\bceo\b/i;

    const contacts: EnrichedContact[] = emails
      .map((e) => ({
        email: (e.value as string) || "",
        name: [e.first_name, e.last_name].filter(Boolean).join(" "),
        position: (e.position as string) || "",
        confidence: Number(e.confidence) || 0,
      }))
      .filter((c) => c.email)
      .sort((a, b) => {
        const ap = prioritise.test(a.position) ? 1 : 0;
        const bp = prioritise.test(b.position) ? 1 : 0;
        if (ap !== bp) return bp - ap;
        return b.confidence - a.confidence;
      })
      .slice(0, 6);

    return { configured: true, domain, contacts };
  } catch (err) {
    logger.warn("Hunter enrich threw", { error: String(err), company });
    return { configured: true, contacts: [], error: "Enrichment request failed" };
  }
}
