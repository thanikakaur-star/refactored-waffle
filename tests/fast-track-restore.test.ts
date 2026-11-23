import { describe, it, expect } from "vitest";
import { signRestoreToken, verifyRestoreToken, escapeLike, looksLikeEmail } from "../src/fast-track/restore.js";

const SECRET = "test-secret-value";

describe("restore access tokens", () => {
  it("accepts a fresh token and returns the purchase session", () => {
    const t = signRestoreToken("cs_live_abc", SECRET);
    expect(verifyRestoreToken(t, SECRET)).toEqual({ sessionId: "cs_live_abc" });
  });

  it("rejects an expired token", () => {
    const t = signRestoreToken("cs_live_abc", SECRET, 1_000_000, 60_000);
    expect(verifyRestoreToken(t, SECRET, 1_000_000 + 60_001)).toBeNull();
    expect(verifyRestoreToken(t, SECRET, 1_000_000 + 59_000)).not.toBeNull();
  });

  it("rejects a tampered token or the wrong secret", () => {
    const t = signRestoreToken("cs_live_abc", SECRET);
    const [payload, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ s: "cs_live_other", e: Date.now() + 100000 })).toString("base64url");
    expect(verifyRestoreToken(`${forged}.${sig}`, SECRET)).toBeNull();
    expect(verifyRestoreToken(`${payload}.${sig}x`, SECRET)).toBeNull();
    expect(verifyRestoreToken(t, "another-secret")).toBeNull();
  });

  it("rejects junk input", () => {
    for (const bad of ["", "abc", "a.b.c", ".", "x".repeat(700)]) {
      expect(verifyRestoreToken(bad, SECRET)).toBeNull();
    }
  });
});

describe("restore helpers", () => {
  it("escapes LIKE wildcards so emails match literally", () => {
    expect(escapeLike("a_b%c@x.com")).toBe("a\\_b\\%c@x.com");
  });
  it("validates email shape", () => {
    expect(looksLikeEmail("me@example.com")).toBe(true);
    expect(looksLikeEmail("thani")).toBe(false);
    expect(looksLikeEmail("a b@c.com")).toBe(false);
  });
});
