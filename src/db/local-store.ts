import crypto from "node:crypto";
import type { ProcurementCategory, TenderSource, TenderStatus, ApiTier } from "../types/index.js";

export interface TenderRow {
  id: string;
  external_id: string;
  source: TenderSource;
  title: string;
  description: string;
  buyer_name: string;
  buyer_country: string;
  buyer_region: string;
  category: ProcurementCategory;
  status: TenderStatus;
  published_at: string;
  deadline: string | null;
  original_currency: string;
  original_value: number | null;
  value_usd: number | null;
  compliance_criteria: string[];
  cpv_codes: string[];
  url: string;
  raw_data: Record<string, unknown>;
  scraped_at: string;
  updated_at: string;
}

export interface AwardRow {
  id: string;
  tender_id: string | null;
  award_date: string;
  supplier_name: string;
  supplier_country: string;
  original_currency: string;
  award_value: number;
  award_value_usd: number;
  framework_type: string | null;
  duration: string | null;
  source: TenderSource;
  scraped_at: string;
}

export interface BenchmarkRow {
  id: string;
  region: string;
  category: ProcurementCategory;
  avg_lead_time_days: number | null;
  avg_contract_value_usd: number | null;
  tender_count: number;
  award_count: number;
  compliance_rate: number | null;
  period: string;
  calculated_at: string;
}

export interface ApiKeyRow {
  id: string;
  key: string;
  user_id: string;
  email: string;
  tier: ApiTier;
  is_active: boolean;
  request_count: number;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

function uuid(): string {
  return crypto.randomUUID();
}

const DEV_API_KEY = "hpi_dev_0000000000000000000000000000000000000000000000000000000000000000";

const SEED_TENDERS: TenderRow[] = [
  {
    id: uuid(), external_id: "TED-2024-001234", source: "ted_europa",
    title: "Supply of MRI Scanners for Regional Hospital Network — Germany",
    description: "Framework agreement for supply, installation, and maintenance of 3T MRI systems across 12 university hospitals in Bavaria",
    buyer_name: "Bayerische Krankenhausgesellschaft", buyer_country: "DE", buyer_region: "Europe",
    category: "medical_devices", status: "open",
    published_at: "2024-09-01T08:00:00Z", deadline: "2024-11-15T17:00:00Z",
    original_currency: "EUR", original_value: 28500000, value_usd: 31065000,
    compliance_criteria: ["CE marking", "ISO 13485", "EU MDR 2017/745"], cpv_codes: ["33111000-1"],
    url: "https://ted.europa.eu/notice/2024-001234", raw_data: {},
    scraped_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: uuid(), external_id: "SAM-W912DY-24-R-0089", source: "sam_gov",
    title: "Telehealth Platform for Veterans Affairs Medical Centers",
    description: "Acquisition of cloud-based telehealth and remote patient monitoring platform for 37 VA medical centers nationwide",
    buyer_name: "Department of Veterans Affairs", buyer_country: "US", buyer_region: "North America",
    category: "telemedicine", status: "open",
    published_at: "2024-08-20T14:00:00Z", deadline: "2024-10-30T23:59:00Z",
    original_currency: "USD", original_value: 42000000, value_usd: 42000000,
    compliance_criteria: ["FedRAMP High", "HIPAA", "Section 508", "FISMA"], cpv_codes: ["85140000-2"],
    url: "https://sam.gov/opp/W912DY-24-R-0089", raw_data: {},
    scraped_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: uuid(), external_id: "NHS-SC-2024-PPE-0456", source: "nhs_supply_chain",
    title: "National PPE Framework — Surgical Gowns and Drapes",
    description: "Multi-lot framework for supply of sterile and non-sterile surgical gowns, drapes, and procedural packs to NHS Trusts across England",
    buyer_name: "NHS Supply Chain", buyer_country: "GB", buyer_region: "Europe",
    category: "personal_protective_equipment", status: "open",
    published_at: "2024-09-10T09:00:00Z", deadline: "2024-12-01T12:00:00Z",
    original_currency: "GBP", original_value: 15000000, value_usd: 19050000,
    compliance_criteria: ["BSI certification", "NHS commercial standards", "Modern Slavery Act"], cpv_codes: ["33199000-1"],
    url: "https://nhssupplychain.nhs.uk/frameworks/PPE-0456", raw_data: {},
    scraped_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: uuid(), external_id: "WHO-PRO-2024-DIAG-078", source: "who_procurement",
    title: "Rapid Diagnostic Test Kits — Sub-Saharan Africa Distribution",
    description: "Procurement of WHO-prequalified rapid diagnostic test kits for malaria, HIV, and tuberculosis for distribution across 14 countries",
    buyer_name: "World Health Organization", buyer_country: "CH", buyer_region: "Africa",
    category: "diagnostics", status: "awarded",
    published_at: "2024-06-01T10:00:00Z", deadline: "2024-08-15T23:59:00Z",
    original_currency: "USD", original_value: 8700000, value_usd: 8700000,
    compliance_criteria: ["WHO prequalification", "GMP certification", "ISO 13485"], cpv_codes: ["33124100-6"],
    url: "https://www.who.int/procurement/DIAG-078", raw_data: {},
    scraped_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: uuid(), external_id: "TED-2024-005678", source: "ted_europa",
    title: "Laboratory Automation Systems — Swedish National Board of Health",
    description: "Design, supply, and commissioning of fully automated clinical laboratory systems for 6 regional laboratories in Sweden",
    buyer_name: "Socialstyrelsen", buyer_country: "SE", buyer_region: "Europe",
    category: "laboratory_equipment", status: "open",
    published_at: "2024-09-15T07:00:00Z", deadline: "2024-12-20T16:00:00Z",
    original_currency: "SEK", original_value: 180000000, value_usd: 17280000,
    compliance_criteria: ["CE-IVD", "ISO 15189", "GDPR data handling"], cpv_codes: ["38000000-5"],
    url: "https://ted.europa.eu/notice/2024-005678", raw_data: {},
    scraped_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: uuid(), external_id: "SAM-FA8732-24-R-0012", source: "sam_gov",
    title: "Next-Generation Patient Monitoring Systems — DoD Military Hospitals",
    description: "Procurement of wireless patient monitoring systems with real-time vital sign telemetry for 22 military treatment facilities",
    buyer_name: "Defense Health Agency", buyer_country: "US", buyer_region: "North America",
    category: "medical_devices", status: "open",
    published_at: "2024-10-01T12:00:00Z", deadline: "2025-01-15T23:59:00Z",
    original_currency: "USD", original_value: 67000000, value_usd: 67000000,
    compliance_criteria: ["FDA 510(k)", "HIPAA", "FedRAMP Moderate", "MIL-STD-810G"], cpv_codes: ["33195000-3"],
    url: "https://sam.gov/opp/FA8732-24-R-0012", raw_data: {},
    scraped_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: uuid(), external_id: "TED-2024-009012", source: "ted_europa",
    title: "Hospital Information System Upgrade — French Public Hospitals",
    description: "Modernization of electronic health record systems across 45 public hospitals in Ile-de-France region",
    buyer_name: "Assistance Publique – Hopitaux de Paris", buyer_country: "FR", buyer_region: "Europe",
    category: "health_it", status: "open",
    published_at: "2024-10-05T08:00:00Z", deadline: "2025-02-01T17:00:00Z",
    original_currency: "EUR", original_value: 95000000, value_usd: 103550000,
    compliance_criteria: ["GDPR", "HDS certification", "Interop santé standards"], cpv_codes: ["48814000-7"],
    url: "https://ted.europa.eu/notice/2024-009012", raw_data: {},
    scraped_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: uuid(), external_id: "WHO-PRO-2024-SURG-034", source: "who_procurement",
    title: "Surgical Instrument Kits for Emergency Field Hospitals",
    description: "Supply of standardized surgical instrument kits for WHO emergency response operations in conflict zones",
    buyer_name: "World Health Organization", buyer_country: "CH", buyer_region: "Global",
    category: "surgical_instruments", status: "open",
    published_at: "2024-07-15T10:00:00Z", deadline: "2024-09-30T23:59:00Z",
    original_currency: "USD", original_value: 3200000, value_usd: 3200000,
    compliance_criteria: ["WHO prequalification", "ISO 7153-1", "CE marking"], cpv_codes: ["33162000-3"],
    url: "https://www.who.int/procurement/SURG-034", raw_data: {},
    scraped_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: uuid(), external_id: "NHS-SC-2024-PHARMA-089", source: "nhs_supply_chain",
    title: "Generic Pharmaceuticals Framework — Cardiovascular and Respiratory",
    description: "National framework agreement for supply of generic cardiovascular and respiratory medications to all NHS trusts",
    buyer_name: "NHS Supply Chain", buyer_country: "GB", buyer_region: "Europe",
    category: "pharmaceuticals", status: "planned",
    published_at: "2024-11-01T09:00:00Z", deadline: "2025-03-01T12:00:00Z",
    original_currency: "GBP", original_value: 220000000, value_usd: 279400000,
    compliance_criteria: ["MHRA authorization", "GMP", "NHS Standard Contract"], cpv_codes: ["33600000-6"],
    url: "https://nhssupplychain.nhs.uk/frameworks/PHARMA-089", raw_data: {},
    scraped_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: uuid(), external_id: "SAM-HHS-24-R-0155", source: "sam_gov",
    title: "COVID-19 & Influenza Point-of-Care Testing Devices",
    description: "Blanket purchase agreement for rapid molecular diagnostic devices capable of simultaneous SARS-CoV-2 and influenza A/B detection",
    buyer_name: "Department of Health & Human Services", buyer_country: "US", buyer_region: "North America",
    category: "diagnostics", status: "closed",
    published_at: "2024-05-01T14:00:00Z", deadline: "2024-07-15T23:59:00Z",
    original_currency: "USD", original_value: 18500000, value_usd: 18500000,
    compliance_criteria: ["FDA EUA", "CLIA waived", "HIPAA"], cpv_codes: ["33124100-6"],
    url: "https://sam.gov/opp/HHS-24-R-0155", raw_data: {},
    scraped_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: uuid(), external_id: "TED-2024-011345", source: "ted_europa",
    title: "Robotic Surgery Systems — Italian National Health Service",
    description: "Acquisition of da Vinci-class robotic surgical systems for 8 major teaching hospitals across Italy",
    buyer_name: "Servizio Sanitario Nazionale", buyer_country: "IT", buyer_region: "Europe",
    category: "surgical_instruments", status: "open",
    published_at: "2024-10-20T08:00:00Z", deadline: "2025-01-31T17:00:00Z",
    original_currency: "EUR", original_value: 52000000, value_usd: 56680000,
    compliance_criteria: ["CE marking", "ISO 13485", "EU MDR 2017/745", "Italian tender law D.Lgs 50/2016"], cpv_codes: ["33162200-5"],
    url: "https://ted.europa.eu/notice/2024-011345", raw_data: {},
    scraped_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: uuid(), external_id: "TED-2024-007890", source: "ted_europa",
    title: "Modular Hospital Construction — Polish Ministry of Health",
    description: "Design-build contract for 3 modular hospital facilities with 200-bed capacity each in underserved regions of eastern Poland",
    buyer_name: "Ministerstwo Zdrowia", buyer_country: "PL", buyer_region: "Europe",
    category: "hospital_infrastructure", status: "open",
    published_at: "2024-08-01T07:00:00Z", deadline: "2024-12-15T16:00:00Z",
    original_currency: "EUR", original_value: 180000000, value_usd: 196200000,
    compliance_criteria: ["EU structural funds requirements", "Polish building code", "Environmental impact assessment"], cpv_codes: ["45215100-8"],
    url: "https://ted.europa.eu/notice/2024-007890", raw_data: {},
    scraped_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
];

const SEED_AWARDS: AwardRow[] = [
  {
    id: uuid(), tender_id: SEED_TENDERS[3].id,
    award_date: "2024-08-20T00:00:00Z",
    supplier_name: "Becton Dickinson", supplier_country: "US",
    original_currency: "USD", award_value: 8700000, award_value_usd: 8700000,
    framework_type: "Single supplier", duration: "36 months",
    source: "who_procurement", scraped_at: new Date().toISOString(),
  },
  {
    id: uuid(), tender_id: SEED_TENDERS[9].id,
    award_date: "2024-07-25T00:00:00Z",
    supplier_name: "Abbott Laboratories", supplier_country: "US",
    original_currency: "USD", award_value: 18500000, award_value_usd: 18500000,
    framework_type: "Blanket Purchase Agreement", duration: "24 months",
    source: "sam_gov", scraped_at: new Date().toISOString(),
  },
  {
    id: uuid(), tender_id: null,
    award_date: "2024-09-10T00:00:00Z",
    supplier_name: "Siemens Healthineers", supplier_country: "DE",
    original_currency: "EUR", award_value: 14200000, award_value_usd: 15478000,
    framework_type: "Framework agreement", duration: "48 months",
    source: "ted_europa", scraped_at: new Date().toISOString(),
  },
  {
    id: uuid(), tender_id: null,
    award_date: "2024-06-15T00:00:00Z",
    supplier_name: "Medline Industries", supplier_country: "US",
    original_currency: "GBP", award_value: 8900000, award_value_usd: 11303000,
    framework_type: "Multi-lot framework", duration: "36 months",
    source: "nhs_supply_chain", scraped_at: new Date().toISOString(),
  },
];

const SEED_BENCHMARKS: BenchmarkRow[] = [
  { id: uuid(), region: "Europe", category: "medical_devices", avg_lead_time_days: 42, avg_contract_value_usd: 28500000, tender_count: 156, award_count: 98, compliance_rate: 0.94, period: "2024-Q3", calculated_at: new Date().toISOString() },
  { id: uuid(), region: "North America", category: "telemedicine", avg_lead_time_days: 35, avg_contract_value_usd: 15000000, tender_count: 89, award_count: 52, compliance_rate: 0.91, period: "2024-Q3", calculated_at: new Date().toISOString() },
  { id: uuid(), region: "Africa", category: "diagnostics", avg_lead_time_days: 60, avg_contract_value_usd: 5200000, tender_count: 43, award_count: 28, compliance_rate: 0.87, period: "2024-Q3", calculated_at: new Date().toISOString() },
  { id: uuid(), region: "Europe", category: "pharmaceuticals", avg_lead_time_days: 55, avg_contract_value_usd: 95000000, tender_count: 210, award_count: 145, compliance_rate: 0.96, period: "2024-Q3", calculated_at: new Date().toISOString() },
  { id: uuid(), region: "Global", category: "surgical_instruments", avg_lead_time_days: 48, avg_contract_value_usd: 3800000, tender_count: 67, award_count: 41, compliance_rate: 0.89, period: "2024-Q3", calculated_at: new Date().toISOString() },
  { id: uuid(), region: "Europe", category: "health_it", avg_lead_time_days: 38, avg_contract_value_usd: 45000000, tender_count: 112, award_count: 73, compliance_rate: 0.92, period: "2024-Q3", calculated_at: new Date().toISOString() },
];

const SEED_API_KEYS: ApiKeyRow[] = [
  {
    id: uuid(), key: DEV_API_KEY, user_id: "dev-user", email: "dev@healthprocure.io",
    tier: "enterprise", is_active: true, request_count: 0, last_used_at: null,
    created_at: new Date().toISOString(), expires_at: null,
    stripe_customer_id: null, stripe_subscription_id: null,
  },
];

class LocalStore {
  tenders: TenderRow[] = [...SEED_TENDERS];
  awards: AwardRow[] = [...SEED_AWARDS];
  benchmarks: BenchmarkRow[] = [...SEED_BENCHMARKS];
  apiKeys: ApiKeyRow[] = [...SEED_API_KEYS];

  findApiKey(key: string): ApiKeyRow | undefined {
    return this.apiKeys.find((k) => k.key === key && k.is_active);
  }

  incrementKeyUsage(id: string): void {
    const key = this.apiKeys.find((k) => k.id === id);
    if (key) {
      key.request_count++;
      key.last_used_at = new Date().toISOString();
    }
  }

  queryTenders(filters: {
    source?: string; category?: string; status?: string; country?: string;
    region?: string; minValue?: number; maxValue?: number;
    publishedAfter?: string; publishedBefore?: string; search?: string;
    page: number; pageSize: number;
  }): { data: TenderRow[]; total: number } {
    let result = [...this.tenders];

    if (filters.source) result = result.filter((t) => t.source === filters.source);
    if (filters.category) result = result.filter((t) => t.category === filters.category);
    if (filters.status) result = result.filter((t) => t.status === filters.status);
    if (filters.country) result = result.filter((t) => t.buyer_country === filters.country);
    if (filters.region) result = result.filter((t) => t.buyer_region === filters.region);
    if (filters.minValue) result = result.filter((t) => (t.value_usd ?? 0) >= filters.minValue!);
    if (filters.maxValue) result = result.filter((t) => (t.value_usd ?? 0) <= filters.maxValue!);
    if (filters.publishedAfter) result = result.filter((t) => t.published_at >= filters.publishedAfter!);
    if (filters.publishedBefore) result = result.filter((t) => t.published_at <= filters.publishedBefore!);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }

    result.sort((a, b) => b.published_at.localeCompare(a.published_at));
    const total = result.length;
    const offset = (filters.page - 1) * filters.pageSize;
    return { data: result.slice(offset, offset + filters.pageSize), total };
  }

  queryAwards(filters: {
    tenderId?: string; supplierCountry?: string; source?: string;
    minValue?: number; maxValue?: number;
    awardedAfter?: string; awardedBefore?: string;
    page: number; pageSize: number;
  }): { data: AwardRow[]; total: number } {
    let result = [...this.awards];

    if (filters.tenderId) result = result.filter((a) => a.tender_id === filters.tenderId);
    if (filters.supplierCountry) result = result.filter((a) => a.supplier_country === filters.supplierCountry);
    if (filters.source) result = result.filter((a) => a.source === filters.source);
    if (filters.minValue) result = result.filter((a) => a.award_value_usd >= filters.minValue!);
    if (filters.maxValue) result = result.filter((a) => a.award_value_usd <= filters.maxValue!);
    if (filters.awardedAfter) result = result.filter((a) => a.award_date >= filters.awardedAfter!);
    if (filters.awardedBefore) result = result.filter((a) => a.award_date <= filters.awardedBefore!);

    result.sort((a, b) => b.award_date.localeCompare(a.award_date));
    const total = result.length;
    const offset = (filters.page - 1) * filters.pageSize;
    return { data: result.slice(offset, offset + filters.pageSize), total };
  }

  getStats() {
    const totalTenders = this.tenders.length;
    const openTenders = this.tenders.filter((t) => t.status === "open").length;

    const totalAwardValueUsd = this.awards.reduce((s, a) => s + a.award_value_usd, 0);
    const avgContractValueUsd = this.awards.length > 0 ? totalAwardValueUsd / this.awards.length : 0;

    const tendersByRegion: Record<string, number> = {};
    const tendersByCategory: Record<string, number> = {};
    const tendersBySource: Record<string, number> = {};
    const monthlyMap: Record<string, { count: number; totalValue: number }> = {};
    const buyerMap: Record<string, { country: string; count: number }> = {};

    for (const t of this.tenders) {
      tendersByRegion[t.buyer_region] = (tendersByRegion[t.buyer_region] ?? 0) + 1;
      tendersByCategory[t.category] = (tendersByCategory[t.category] ?? 0) + 1;
      tendersBySource[t.source] = (tendersBySource[t.source] ?? 0) + 1;

      const month = t.published_at.slice(0, 7);
      if (!monthlyMap[month]) monthlyMap[month] = { count: 0, totalValue: 0 };
      monthlyMap[month].count++;
      monthlyMap[month].totalValue += t.value_usd ?? 0;

      if (!buyerMap[t.buyer_name]) buyerMap[t.buyer_name] = { country: t.buyer_country, count: 0 };
      buyerMap[t.buyer_name].count++;
    }

    const monthlyTrend = Object.entries(monthlyMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const topBuyers = Object.entries(buyerMap)
      .map(([name, data]) => ({ name, country: data.country, tenderCount: data.count }))
      .sort((a, b) => b.tenderCount - a.tenderCount)
      .slice(0, 10);

    return {
      totalTenders, openTenders,
      totalAwardValueUsd: Math.round(totalAwardValueUsd),
      avgContractValueUsd: Math.round(avgContractValueUsd),
      tendersByRegion, tendersByCategory, tendersBySource,
      monthlyTrend, topBuyers,
    };
  }

  queryBenchmarks(filters: { region?: string; category?: string }): BenchmarkRow[] {
    let result = [...this.benchmarks];
    if (filters.region) result = result.filter((b) => b.region === filters.region);
    if (filters.category) result = result.filter((b) => b.category === filters.category);
    return result.sort((a, b) => b.calculated_at.localeCompare(a.calculated_at));
  }
}

export const localStore = new LocalStore();
export { DEV_API_KEY };
