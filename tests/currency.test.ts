import { describe, it, expect } from "vitest";
import { convertToUsd, parseCurrencyValue, getSupportedCurrencies } from "../src/utils/currency.js";

describe("convertToUsd", () => {
  it("converts EUR to USD", () => {
    const result = convertToUsd(1000, "EUR");
    expect(result).toBe(1090);
  });

  it("converts GBP to USD", () => {
    const result = convertToUsd(1000, "GBP");
    expect(result).toBe(1270);
  });

  it("returns same value for USD", () => {
    const result = convertToUsd(5000, "USD");
    expect(result).toBe(5000);
  });

  it("is case-insensitive", () => {
    expect(convertToUsd(100, "eur")).toBe(109);
    expect(convertToUsd(100, "Gbp")).toBe(127);
  });

  it("returns null for unsupported currency", () => {
    expect(convertToUsd(100, "XYZ")).toBeNull();
  });

  it("handles zero amount", () => {
    expect(convertToUsd(0, "EUR")).toBe(0);
  });

  it("rounds to 2 decimal places", () => {
    const result = convertToUsd(333, "JPY");
    expect(result).toBe(2.23);
  });
});

describe("parseCurrencyValue", () => {
  it("parses EUR prefix format", () => {
    const result = parseCurrencyValue("EUR 1,500,000.00");
    expect(result).toEqual({ amount: 1500000, currency: "EUR" });
  });

  it("parses USD suffix format", () => {
    const result = parseCurrencyValue("1500000 USD");
    expect(result).toEqual({ amount: 1500000, currency: "USD" });
  });

  it("parses euro symbol", () => {
    const result = parseCurrencyValue("€ 2,500,000");
    expect(result).toEqual({ amount: 2500000, currency: "EUR" });
  });

  it("parses pound symbol", () => {
    const result = parseCurrencyValue("£500,000.50");
    expect(result).toEqual({ amount: 500000.5, currency: "GBP" });
  });

  it("parses dollar symbol", () => {
    const result = parseCurrencyValue("$10,000");
    expect(result).toEqual({ amount: 10000, currency: "USD" });
  });

  it("returns null for unparseable input", () => {
    expect(parseCurrencyValue("no value here")).toBeNull();
    expect(parseCurrencyValue("")).toBeNull();
  });
});

describe("getSupportedCurrencies", () => {
  it("returns an array of currency codes", () => {
    const currencies = getSupportedCurrencies();
    expect(currencies).toContain("USD");
    expect(currencies).toContain("EUR");
    expect(currencies).toContain("GBP");
    expect(currencies.length).toBeGreaterThan(20);
  });
});
