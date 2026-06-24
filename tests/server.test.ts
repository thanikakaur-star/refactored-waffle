import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app, server } from "../src/server.js";
import type { Server } from "node:http";

const API_KEY = "hpi_dev_0000000000000000000000000000000000000000000000000000000000000000";
const BASE = "http://localhost:3099";

let testServer: Server;

beforeAll(async () => {
  testServer = app.listen(3099);
});

afterAll(async () => {
  testServer.close();
  server.close();
});

async function apiFetch(path: string, key = API_KEY) {
  const res = await fetch(`${BASE}${path}`, { headers: { "X-API-Key": key } });
  return { status: res.status, body: await res.json() };
}

describe("Health endpoint", () => {
  it("returns ok without auth", async () => {
    const res = await fetch(`${BASE}/health`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.mode).toBe("local");
  });
});

describe("Auth middleware", () => {
  it("rejects requests without API key", async () => {
    const res = await fetch(`${BASE}/api/v1/tenders`);
    expect(res.status).toBe(401);
  });

  it("rejects invalid API key", async () => {
    const { status } = await apiFetch("/api/v1/tenders", "invalid_key");
    expect(status).toBe(401);
  });

  it("accepts valid dev API key", async () => {
    const { status } = await apiFetch("/api/v1/tenders");
    expect(status).toBe(200);
  });
});

describe("GET /api/v1/tenders", () => {
  it("returns paginated tenders", async () => {
    const { status, body } = await apiFetch("/api/v1/tenders");
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBeGreaterThan(0);
    expect(body.pagination.page).toBe(1);
  });

  it("filters by source", async () => {
    const { body } = await apiFetch("/api/v1/tenders?source=ted_europa");
    expect(body.data.every((t: any) => t.source === "ted_europa")).toBe(true);
  });

  it("filters by status", async () => {
    const { body } = await apiFetch("/api/v1/tenders?status=open");
    expect(body.data.every((t: any) => t.status === "open")).toBe(true);
  });

  it("filters by category", async () => {
    const { body } = await apiFetch("/api/v1/tenders?category=medical_devices");
    expect(body.data.every((t: any) => t.category === "medical_devices")).toBe(true);
  });

  it("filters by country", async () => {
    const { body } = await apiFetch("/api/v1/tenders?country=US");
    expect(body.data.every((t: any) => t.buyer_country === "US")).toBe(true);
  });

  it("supports search", async () => {
    const { body } = await apiFetch("/api/v1/tenders?search=MRI");
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].title.toLowerCase()).toContain("mri");
  });

  it("paginates correctly", async () => {
    const { body } = await apiFetch("/api/v1/tenders?page=1&pageSize=3");
    expect(body.data.length).toBe(3);
    expect(body.pagination.pageSize).toBe(3);
  });

  it("rejects invalid filters", async () => {
    const { status } = await apiFetch("/api/v1/tenders?source=invalid");
    expect(status).toBe(400);
  });
});

describe("GET /api/v1/tenders/:id", () => {
  it("returns a single tender", async () => {
    const { body: list } = await apiFetch("/api/v1/tenders?pageSize=1");
    const id = list.data[0].id;
    const { status, body } = await apiFetch(`/api/v1/tenders/${id}`);
    expect(status).toBe(200);
    expect(body.data.id).toBe(id);
  });

  it("returns 404 for missing tender", async () => {
    const { status } = await apiFetch("/api/v1/tenders/00000000-0000-0000-0000-000000000000");
    expect(status).toBe(404);
  });
});

describe("GET /api/v1/awards", () => {
  it("returns paginated awards", async () => {
    const { status, body } = await apiFetch("/api/v1/awards");
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.pagination.total).toBeGreaterThan(0);
  });

  it("filters by supplier country", async () => {
    const { body } = await apiFetch("/api/v1/awards?supplierCountry=US");
    expect(body.data.every((a: any) => a.supplier_country === "US")).toBe(true);
  });
});

describe("GET /api/v1/analytics/stats", () => {
  it("returns dashboard stats", async () => {
    const { status, body } = await apiFetch("/api/v1/analytics/stats");
    expect(status).toBe(200);
    const d = body.data;
    expect(d.totalTenders).toBeGreaterThan(0);
    expect(d.openTenders).toBeGreaterThan(0);
    expect(d.totalAwardValueUsd).toBeGreaterThan(0);
    expect(d.avgContractValueUsd).toBeGreaterThan(0);
    expect(Object.keys(d.tendersByRegion).length).toBeGreaterThan(0);
    expect(Object.keys(d.tendersByCategory).length).toBeGreaterThan(0);
    expect(Object.keys(d.tendersBySource).length).toBeGreaterThan(0);
    expect(d.monthlyTrend.length).toBeGreaterThan(0);
    expect(d.topBuyers.length).toBeGreaterThan(0);
  });
});

describe("GET /api/v1/analytics/benchmarks", () => {
  it("returns benchmarks", async () => {
    const { status, body } = await apiFetch("/api/v1/analytics/benchmarks");
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("filters by region", async () => {
    const { body } = await apiFetch("/api/v1/analytics/benchmarks?region=Europe");
    expect(body.data.every((b: any) => b.region === "Europe")).toBe(true);
  });
});

describe("GET /api/v1/sources", () => {
  it("returns data source list", async () => {
    const { status, body } = await apiFetch("/api/v1/sources");
    expect(status).toBe(200);
    expect(body.data.length).toBe(4);
    expect(body.data.map((s: any) => s.id)).toContain("ted_europa");
    expect(body.data.map((s: any) => s.id)).toContain("sam_gov");
  });
});

describe("Static serving", () => {
  it("serves the marketing site at /", async () => {
    const res = await fetch(`${BASE}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("HealthProcure Intel");
  });

  it("serves the dashboard at /dashboard", async () => {
    const res = await fetch(`${BASE}/dashboard`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("HealthProcure Intel");
  });
});
