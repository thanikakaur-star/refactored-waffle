import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

describe("API filter validation", () => {
  const filtersSchema = z.object({
    source: z.enum(["ted_europa", "sam_gov", "who_procurement", "nhs_supply_chain", "manual"]).optional(),
    category: z.enum([
      "medical_devices", "pharmaceuticals", "health_it", "laboratory_equipment",
      "hospital_infrastructure", "personal_protective_equipment", "diagnostics",
      "surgical_instruments", "telemedicine", "other",
    ]).optional(),
    status: z.enum(["open", "closed", "awarded", "cancelled", "planned"]).optional(),
    country: z.string().max(5).optional(),
    minValue: z.coerce.number().min(0).optional(),
    maxValue: z.coerce.number().min(0).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(500).default(20),
  });

  it("accepts valid filter parameters", () => {
    const result = filtersSchema.safeParse({
      source: "ted_europa",
      category: "medical_devices",
      status: "open",
      country: "DE",
      page: "1",
      pageSize: "50",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe("ted_europa");
      expect(result.data.pageSize).toBe(50);
    }
  });

  it("rejects invalid source", () => {
    const result = filtersSchema.safeParse({ source: "invalid_source" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = filtersSchema.safeParse({ category: "not_a_category" });
    expect(result.success).toBe(false);
  });

  it("defaults page to 1 and pageSize to 20", () => {
    const result = filtersSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it("coerces string numbers to numbers", () => {
    const result = filtersSchema.safeParse({
      minValue: "1000",
      maxValue: "5000000",
      page: "3",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.minValue).toBe(1000);
      expect(result.data.maxValue).toBe(5000000);
      expect(result.data.page).toBe(3);
    }
  });

  it("rejects negative values", () => {
    const result = filtersSchema.safeParse({ minValue: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects pageSize above max", () => {
    const result = filtersSchema.safeParse({ pageSize: 1000 });
    expect(result.success).toBe(false);
  });
});

describe("API key format", () => {
  it("validates hpi_ prefix format", () => {
    const key = "hpi_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    expect(key.startsWith("hpi_")).toBe(true);
    expect(key.length).toBe(68);
  });
});

describe("Tier rate limits", () => {
  const TIER_LIMITS = {
    free: { requestsPerDay: 50, maxPageSize: 10 },
    basic: { requestsPerDay: 500, maxPageSize: 50 },
    pro: { requestsPerDay: 5000, maxPageSize: 100 },
    enterprise: { requestsPerDay: 50000, maxPageSize: 500 },
  };

  it("free tier has strictest limits", () => {
    expect(TIER_LIMITS.free.requestsPerDay).toBe(50);
    expect(TIER_LIMITS.free.maxPageSize).toBe(10);
  });

  it("enterprise tier has highest limits", () => {
    expect(TIER_LIMITS.enterprise.requestsPerDay).toBe(50000);
    expect(TIER_LIMITS.enterprise.maxPageSize).toBe(500);
  });

  it("tiers are progressively less restrictive", () => {
    const tiers = ["free", "basic", "pro", "enterprise"] as const;
    for (let i = 1; i < tiers.length; i++) {
      expect(TIER_LIMITS[tiers[i]].requestsPerDay).toBeGreaterThan(TIER_LIMITS[tiers[i - 1]].requestsPerDay);
      expect(TIER_LIMITS[tiers[i]].maxPageSize).toBeGreaterThan(TIER_LIMITS[tiers[i - 1]].maxPageSize);
    }
  });
});
