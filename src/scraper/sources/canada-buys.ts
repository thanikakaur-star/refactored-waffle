import { ApiScraper } from "../api-base.js";
import { classifyUkTender } from "./uk-category-map.js";
import { logger } from "../../utils/logger.js";
import type { Tender, ProcurementCategory } from "../../types/index.js";

/**
 * CanadaBuys open tender notices — a public bilingual CSV, no login, no key.
 * https://canadabuys.canada.ca/opendata/pub/openTenderNotice-ouvertAvisAppelOffres.csv
 *
 * NOTE: written against column names confirmed only indirectly (via the
 * CanadaBuys data dictionary and third-party docs, not a live response —
 * this sandbox blocks the domain). The header lookup below matches by
 * substring against several candidate names per field so a slightly-off
 * guess degrades to "field missing" (logged, row skipped if required) rather
 * than crashing the whole scrape. Run once on the server and check
 * scrape_runs before relying on it, same as the other UK/World Bank sources
 * were before their first live run.
 */
export class CanadaBuysScraper extends ApiScraper {
  readonly source = "canada_buys" as const;
  readonly baseUrl = "https://canadabuys.canada.ca";

  private readonly csvUrl =
    "https://canadabuys.canada.ca/opendata/pub/openTenderNotice-ouvertAvisAppelOffres.csv";

  protected async fetchTenders(): Promise<Partial<Tender>[]> {
    const res = await fetch(this.csvUrl, {
      headers: { Accept: "text/csv" },
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) {
      const snippet = (await res.text().catch(() => "")).slice(0, 300);
      throw new Error(`CanadaBuys CSV returned ${res.status}: ${snippet}`);
    }

    const text = await res.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      logger.warn("CanadaBuys: CSV had no data rows");
      return [];
    }

    const headers = rows[0];
    const col = makeColumnFinder(headers);

    const titleIdx = col(["title-titre-eng", "title-titre", "titleEng"]);
    const descIdx = col(["tenderDescription-descriptionAppelOffres-eng", "description-eng", "notice-avis-eng"]);
    const closingIdx = col(["tenderClosingDate-appelOffresdateCloture", "closingDate", "dateCloture"]);
    const publishedIdx = col(["publicationDate-datePublication", "publishedDate"]);
    const orgIdx = col(["contractingEntityName-nomEntitContractante-eng", "organizationName-eng", "buyerName-eng"]);
    const regionIdx = col(["regionsOfDelivery-regionslivraison-eng", "regionOfOpportunity-eng"]);
    const refIdx = col(["referenceNumber-numeroReference", "referenceNumber", "solicitationNumber-numeroSollicitation"]);
    const unspscIdx = col(["UNSPSC-Code", "UNSPSC"]);
    const categoryIdx = col(["procurementCategory", "tenderType-typeAppelOffres-eng"]);
    const statusIdx = col(["tenderStatus-appelOffresstatut-eng", "status-eng"]);

    if (titleIdx === -1 || refIdx === -1) {
      throw new Error(
        `CanadaBuys CSV column layout didn't match expected fields (title/reference not found). ` +
        `Headers seen: ${headers.slice(0, 15).join(" | ")}`,
      );
    }

    const out: Partial<Tender>[] = [];
    for (const row of rows.slice(1)) {
      const title = row[titleIdx]?.trim();
      const reference = row[refIdx]?.trim();
      if (!title || !reference) continue;

      const description = descIdx >= 0 ? (row[descIdx] ?? "") : "";
      const unspsc = unspscIdx >= 0 ? row[unspscIdx] : undefined;
      const categoryRaw = categoryIdx >= 0 ? row[categoryIdx] : undefined;

      const category = classifyUkTender(title, description, unspsc);
      if (!isHealthcare(unspsc, categoryRaw, category)) continue;

      out.push({
        externalId: reference,
        source: "canada_buys",
        title,
        description,
        buyerName: (orgIdx >= 0 ? row[orgIdx]?.trim() : "") || "Canadian Public Sector Buyer",
        buyerCountry: "CA",
        buyerRegion: (regionIdx >= 0 ? row[regionIdx]?.trim() : "") || "Canada",
        category,
        status: mapStatus(statusIdx >= 0 ? row[statusIdx] : undefined),
        publishedAt: parseDate(publishedIdx >= 0 ? row[publishedIdx] : undefined) ?? new Date(),
        deadline: parseDate(closingIdx >= 0 ? row[closingIdx] : undefined),
        originalCurrency: "CAD",
        originalValue: null,
        valueUsd: null,
        complianceCriteria: ["Canadian Free Trade Agreement / Government Contracts Regulations"],
        cpvCodes: unspsc ? [unspsc] : [],
        url: `${this.baseUrl}/en/tender-opportunities/tender-notice/${encodeURIComponent(reference)}`,
        rawData: {},
      });
    }

    logger.info("CanadaBuys: healthcare tenders collected", { count: out.length, totalRows: rows.length - 1 });
    return out;
  }
}

function mapStatus(raw: string | undefined): "open" | "closed" | "awarded" | "cancelled" | "planned" {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("open")) return "open";
  if (s.includes("award")) return "awarded";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("closed") || s.includes("clos")) return "closed";
  return "open";
}

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// UNSPSC segment 42 = Medical Equipment/Supplies, 51 = Drugs & Pharmaceutical
// Products, 85 = Healthcare Services — the first two digits of the code.
function isHealthcare(unspsc: string | undefined, categoryRaw: string | undefined, category: ProcurementCategory): boolean {
  if (unspsc) {
    const segment = unspsc.replace(/\D/g, "").slice(0, 2);
    if (segment === "42" || segment === "51" || segment === "85") return true;
  }
  if (categoryRaw && /health|medical|pharma/i.test(categoryRaw)) return true;
  return category !== "other";
}

function makeColumnFinder(headers: string[]) {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  return (candidates: string[]): number => {
    for (const candidate of candidates) {
      const target = candidate.toLowerCase();
      const idx = normalized.findIndex((h) => h.includes(target) || target.includes(h));
      if (idx !== -1) return idx;
    }
    return -1;
  };
}

// Minimal RFC4180-ish CSV parser: handles quoted fields, embedded commas,
// escaped quotes (""), and both \n and \r\n line endings. No external
// dependency needed for a file this shape.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // skip, handled by \n
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
}
