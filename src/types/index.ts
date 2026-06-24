export interface Tender {
  id: string;
  externalId: string;
  source: TenderSource;
  title: string;
  description: string;
  buyerName: string;
  buyerCountry: string;
  buyerRegion: string;
  category: ProcurementCategory;
  status: TenderStatus;
  publishedAt: Date;
  deadline: Date | null;
  originalCurrency: string;
  originalValue: number | null;
  valueUsd: number | null;
  complianceCriteria: string[];
  cpvCodes: string[];
  url: string;
  rawData: Record<string, unknown>;
  scrapedAt: Date;
  updatedAt: Date;
}

export interface ContractAward {
  id: string;
  tenderId: string;
  awardDate: Date;
  supplierName: string;
  supplierCountry: string;
  originalCurrency: string;
  awardValue: number;
  awardValueUsd: number;
  frameworkType: string | null;
  duration: string | null;
  source: TenderSource;
  scrapedAt: Date;
}

export interface SupplyChainBenchmark {
  id: string;
  region: string;
  category: ProcurementCategory;
  avgLeadTimeDays: number | null;
  avgContractValueUsd: number | null;
  tenderCount: number;
  awardCount: number;
  complianceRate: number | null;
  period: string;
  calculatedAt: Date;
}

export interface ApiKey {
  id: string;
  key: string;
  userId: string;
  email: string;
  tier: ApiTier;
  isActive: boolean;
  requestCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export type TenderSource = "ted_europa" | "sam_gov" | "who_procurement" | "nhs_supply_chain" | "manual";

export type TenderStatus = "open" | "closed" | "awarded" | "cancelled" | "planned";

export type ProcurementCategory =
  | "medical_devices"
  | "pharmaceuticals"
  | "health_it"
  | "laboratory_equipment"
  | "hospital_infrastructure"
  | "personal_protective_equipment"
  | "diagnostics"
  | "surgical_instruments"
  | "telemedicine"
  | "other";

export type ApiTier = "free" | "basic" | "pro" | "enterprise";

export interface ScrapeResult {
  source: TenderSource;
  tendersFound: number;
  tendersNew: number;
  tendersUpdated: number;
  awardsFound: number;
  errors: string[];
  durationMs: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface TenderFilters {
  source?: TenderSource;
  category?: ProcurementCategory;
  status?: TenderStatus;
  country?: string;
  region?: string;
  minValue?: number;
  maxValue?: number;
  publishedAfter?: string;
  publishedBefore?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface DashboardStats {
  totalTenders: number;
  openTenders: number;
  totalAwardValueUsd: number;
  avgContractValueUsd: number;
  tendersByRegion: Record<string, number>;
  tendersByCategory: Record<string, number>;
  tendersBySource: Record<string, number>;
  monthlyTrend: Array<{ month: string; count: number; totalValue: number }>;
  topBuyers: Array<{ name: string; country: string; tenderCount: number }>;
}
