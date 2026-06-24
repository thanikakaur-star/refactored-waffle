import { describe, it, expect } from "vitest";
import type {
  Tender,
  ContractAward,
  ApiKey,
  TenderSource,
  TenderStatus,
  ProcurementCategory,
  ApiTier,
  DashboardStats,
  PaginatedResponse,
  TenderFilters,
  ScrapeResult,
  SupplyChainBenchmark,
} from "../src/types/index.js";

describe("Type definitions", () => {
  it("TenderSource includes expected sources", () => {
    const sources: TenderSource[] = ["ted_europa", "sam_gov", "who_procurement", "nhs_supply_chain", "manual"];
    expect(sources).toHaveLength(5);
  });

  it("TenderStatus includes expected statuses", () => {
    const statuses: TenderStatus[] = ["open", "closed", "awarded", "cancelled", "planned"];
    expect(statuses).toHaveLength(5);
  });

  it("ProcurementCategory includes health-tech categories", () => {
    const categories: ProcurementCategory[] = [
      "medical_devices", "pharmaceuticals", "health_it", "laboratory_equipment",
      "hospital_infrastructure", "personal_protective_equipment", "diagnostics",
      "surgical_instruments", "telemedicine", "other",
    ];
    expect(categories).toHaveLength(10);
  });

  it("ApiTier defines subscription tiers", () => {
    const tiers: ApiTier[] = ["free", "basic", "pro", "enterprise"];
    expect(tiers).toHaveLength(4);
  });

  it("Tender interface has required fields", () => {
    const tender: Tender = {
      id: "uuid",
      externalId: "TED-001",
      source: "ted_europa",
      title: "Test Tender",
      description: "Desc",
      buyerName: "Buyer",
      buyerCountry: "DE",
      buyerRegion: "Europe",
      category: "medical_devices",
      status: "open",
      publishedAt: new Date(),
      deadline: null,
      originalCurrency: "EUR",
      originalValue: 1000000,
      valueUsd: 1090000,
      complianceCriteria: ["CE marking"],
      cpvCodes: ["33100000"],
      url: "https://example.com",
      rawData: {},
      scrapedAt: new Date(),
      updatedAt: new Date(),
    };
    expect(tender.source).toBe("ted_europa");
    expect(tender.category).toBe("medical_devices");
  });

  it("ContractAward interface works", () => {
    const award: ContractAward = {
      id: "uuid",
      tenderId: "tender-uuid",
      awardDate: new Date(),
      supplierName: "Supplier Co",
      supplierCountry: "US",
      originalCurrency: "USD",
      awardValue: 500000,
      awardValueUsd: 500000,
      frameworkType: "Single supplier",
      duration: "24 months",
      source: "sam_gov",
      scrapedAt: new Date(),
    };
    expect(award.source).toBe("sam_gov");
  });

  it("DashboardStats shape is correct", () => {
    const stats: DashboardStats = {
      totalTenders: 100,
      openTenders: 50,
      totalAwardValueUsd: 5000000,
      avgContractValueUsd: 250000,
      tendersByRegion: { Europe: 60, "North America": 40 },
      tendersByCategory: { medical_devices: 30, pharmaceuticals: 20 },
      tendersBySource: { ted_europa: 60, sam_gov: 40 },
      monthlyTrend: [{ month: "2024-09", count: 10, totalValue: 500000 }],
      topBuyers: [{ name: "NHS", country: "GB", tenderCount: 5 }],
    };
    expect(stats.totalTenders).toBe(100);
    expect(stats.monthlyTrend).toHaveLength(1);
  });

  it("PaginatedResponse wraps data with pagination", () => {
    const response: PaginatedResponse<{ id: string }> = {
      data: [{ id: "1" }, { id: "2" }],
      pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
    };
    expect(response.data).toHaveLength(2);
    expect(response.pagination.totalPages).toBe(1);
  });

  it("ScrapeResult tracks scraper output", () => {
    const result: ScrapeResult = {
      source: "ted_europa",
      tendersFound: 20,
      tendersNew: 15,
      tendersUpdated: 5,
      awardsFound: 3,
      errors: [],
      durationMs: 45000,
    };
    expect(result.tendersFound).toBe(20);
  });

  it("SupplyChainBenchmark includes regional metrics", () => {
    const benchmark: SupplyChainBenchmark = {
      id: "uuid",
      region: "Europe",
      category: "medical_devices",
      avgLeadTimeDays: 45,
      avgContractValueUsd: 2500000,
      tenderCount: 120,
      awardCount: 80,
      complianceRate: 0.92,
      period: "2024-Q3",
      calculatedAt: new Date(),
    };
    expect(benchmark.region).toBe("Europe");
    expect(benchmark.complianceRate).toBe(0.92);
  });
});
