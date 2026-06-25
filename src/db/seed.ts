import { v4 as uuidv4 } from "uuid";
import { getSupabaseClient } from "./client.js";
import { logger } from "../utils/logger.js";
import type { ProcurementCategory, TenderSource, TenderStatus } from "../types/index.js";

const SAMPLE_TENDERS = [
  {
    external_id: "TED-2026-001234",
    source: "ted_europa" as TenderSource,
    title: "Supply of MRI Scanners for Regional Hospital Network — Germany",
    description: "Framework agreement for supply, installation, and maintenance of 3T MRI systems across 12 university hospitals in Bavaria",
    buyer_name: "Bayerische Krankenhausgesellschaft",
    buyer_country: "DE",
    buyer_region: "Europe",
    category: "medical_devices" as ProcurementCategory,
    status: "open" as TenderStatus,
    published_at: "2026-05-15T08:00:00Z",
    deadline: "2026-08-30T17:00:00Z",
    original_currency: "EUR",
    original_value: 28500000,
    value_usd: 31065000,
    compliance_criteria: ["CE marking", "ISO 13485", "EU MDR 2017/745"],
    cpv_codes: ["33111000-1"],
    url: "https://ted.europa.eu/notice/2024-001234",
  },
  {
    external_id: "SAM-W912DY-26-R-0089",
    source: "sam_gov" as TenderSource,
    title: "Telehealth Platform for Veterans Affairs Medical Centers",
    description: "Acquisition of cloud-based telehealth and remote patient monitoring platform for 37 VA medical centers nationwide",
    buyer_name: "Department of Veterans Affairs",
    buyer_country: "US",
    buyer_region: "North America",
    category: "telemedicine" as ProcurementCategory,
    status: "open" as TenderStatus,
    published_at: "2026-06-01T14:00:00Z",
    deadline: "2026-09-15T23:59:00Z",
    original_currency: "USD",
    original_value: 42000000,
    value_usd: 42000000,
    compliance_criteria: ["FedRAMP High", "HIPAA", "Section 508", "FISMA"],
    cpv_codes: ["85140000-2"],
    url: "https://sam.gov/opp/W912DY-24-R-0089",
  },
  {
    external_id: "NHS-SC-2026-PPE-0456",
    source: "nhs_supply_chain" as TenderSource,
    title: "National PPE Framework — Surgical Gowns and Drapes",
    description: "Multi-lot framework for supply of sterile and non-sterile surgical gowns, drapes, and procedural packs to NHS Trusts across England",
    buyer_name: "NHS Supply Chain",
    buyer_country: "GB",
    buyer_region: "Europe",
    category: "personal_protective_equipment" as ProcurementCategory,
    status: "open" as TenderStatus,
    published_at: "2026-05-20T09:00:00Z",
    deadline: "2026-08-15T12:00:00Z",
    original_currency: "GBP",
    original_value: 15000000,
    value_usd: 19050000,
    compliance_criteria: ["BSI certification", "NHS commercial standards", "Modern Slavery Act"],
    cpv_codes: ["33199000-1"],
    url: "https://nhssupplychain.nhs.uk/frameworks/PPE-0456",
  },
  {
    external_id: "WHO-PRO-2026-DIAG-078",
    source: "who_procurement" as TenderSource,
    title: "Rapid Diagnostic Test Kits — Sub-Saharan Africa Distribution",
    description: "Procurement of WHO-prequalified rapid diagnostic test kits for malaria, HIV, and tuberculosis for distribution across 14 countries",
    buyer_name: "World Health Organization",
    buyer_country: "CH",
    buyer_region: "Africa",
    category: "diagnostics" as ProcurementCategory,
    status: "awarded" as TenderStatus,
    published_at: "2026-03-01T10:00:00Z",
    deadline: "2026-05-15T23:59:00Z",
    original_currency: "USD",
    original_value: 8700000,
    value_usd: 8700000,
    compliance_criteria: ["WHO prequalification", "GMP certification", "ISO 13485"],
    cpv_codes: ["33124100-6"],
    url: "https://www.who.int/procurement/DIAG-078",
  },
  {
    external_id: "TED-2026-005678",
    source: "ted_europa" as TenderSource,
    title: "Laboratory Automation Systems — Swedish National Board of Health",
    description: "Design, supply, and commissioning of fully automated clinical laboratory systems for 6 regional laboratories in Sweden",
    buyer_name: "Socialstyrelsen",
    buyer_country: "SE",
    buyer_region: "Europe",
    category: "laboratory_equipment" as ProcurementCategory,
    status: "open" as TenderStatus,
    published_at: "2026-06-10T07:00:00Z",
    deadline: "2026-09-20T16:00:00Z",
    original_currency: "SEK",
    original_value: 180000000,
    value_usd: 17280000,
    compliance_criteria: ["CE-IVD", "ISO 15189", "GDPR data handling"],
    cpv_codes: ["38000000-5"],
    url: "https://ted.europa.eu/notice/2024-005678",
  },
];

const SAMPLE_AWARDS = [
  {
    tender_id: null as string | null,
    award_date: "2026-05-20T00:00:00Z",
    supplier_name: "Becton Dickinson",
    supplier_country: "US",
    original_currency: "USD",
    award_value: 8700000,
    award_value_usd: 8700000,
    framework_type: "Single supplier",
    duration: "36 months",
    source: "who_procurement" as TenderSource,
  },
];

async function seed() {
  const client = getSupabaseClient();
  logger.info("Seeding database with sample data");

  const { data: tenders, error: tenderErr } = await client
    .from("tenders")
    .upsert(
      SAMPLE_TENDERS.map((t) => ({ ...t, id: uuidv4() })),
      { onConflict: "source,external_id" }
    )
    .select("id, external_id");

  if (tenderErr) {
    logger.error("Failed to seed tenders", { error: tenderErr.message });
    return;
  }

  logger.info("Seeded tenders", { count: tenders?.length });

  const whoTender = tenders?.find((t) => t.external_id === "WHO-PRO-2026-DIAG-078");
  if (whoTender) {
    SAMPLE_AWARDS[0].tender_id = whoTender.id;
    const { error: awardErr } = await client.from("contract_awards").insert(
      SAMPLE_AWARDS.map((a) => ({ ...a, id: uuidv4() }))
    );
    if (awardErr) {
      logger.error("Failed to seed awards", { error: awardErr.message });
    } else {
      logger.info("Seeded awards", { count: SAMPLE_AWARDS.length });
    }
  }

  logger.info("Seed complete");
}

seed().catch((err) => {
  logger.error("Seed failed", { error: String(err) });
  process.exit(1);
});
