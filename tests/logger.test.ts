import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "../src/utils/logger.js";

describe("logger", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("outputs structured JSON", () => {
    logger.info("test message", { key: "value" });
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("test message");
    expect(parsed.key).toBe("value");
    expect(parsed.timestamp).toBeDefined();
  });

  it("includes timestamp in ISO format", () => {
    logger.info("timestamp test");
    const output = consoleSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp);
  });

  it("handles messages without metadata", () => {
    logger.info("simple message");
    const output = consoleSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.message).toBe("simple message");
  });
});
