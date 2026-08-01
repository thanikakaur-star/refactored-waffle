import { describe, it, expect } from "vitest";
import { classifyUkTender } from "../src/scraper/sources/uk-category-map.js";
import { regionForCountry } from "../src/scraper/regions.js";

describe("menstrual_health / wash_hygiene classification", () => {
  it("classifies sanitary pad supply as menstrual_health", () => {
    expect(classifyUkTender("Supply of sanitary pads to schools", "")).toBe("menstrual_health");
  });

  it("classifies menstrual cups and period products as menstrual_health", () => {
    expect(classifyUkTender("Reusable menstrual cup procurement", "")).toBe("menstrual_health");
    expect(classifyUkTender("Dignity kits for adolescent girls", "")).toBe("menstrual_health");
  });

  it("classifies school WASH and hygiene kits as wash_hygiene", () => {
    expect(classifyUkTender("School sanitation and hygiene kit distribution", "")).toBe("wash_hygiene");
    expect(classifyUkTender("Construction of latrines and handwashing stations", "")).toBe("wash_hygiene");
  });

  it("does NOT match bare 'sanitary' in unrelated infrastructure tenders", () => {
    expect(classifyUkTender("Sanitary sewer rehabilitation works", "")).not.toBe("menstrual_health");
    expect(classifyUkTender("Supply of sanitaryware and bathroom fittings", "")).not.toBe("menstrual_health");
  });

  it("prioritises menstrual health over PPE when both could match", () => {
    expect(classifyUkTender("Menstrual hygiene products and face masks", "")).toBe("menstrual_health");
  });
});

describe("regionForCountry", () => {
  it("buckets East African countries", () => {
    expect(regionForCountry("Rwanda")).toBe("East Africa");
    expect(regionForCountry("United Republic of Tanzania")).toBe("East Africa");
  });

  it("buckets South Asian countries", () => {
    expect(regionForCountry("India")).toBe("South Asia");
    expect(regionForCountry("Bangladesh")).toBe("South Asia");
  });

  it("buckets Ireland as Europe and is case-insensitive", () => {
    expect(regionForCountry("ireland")).toBe("Europe");
  });

  it("falls back to Global for unknown or empty countries", () => {
    expect(regionForCountry("Atlantis")).toBe("Global");
    expect(regionForCountry(null)).toBe("Global");
    expect(regionForCountry("")).toBe("Global");
  });
});
