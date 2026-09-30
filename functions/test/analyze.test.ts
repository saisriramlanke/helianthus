import { describe, expect, it } from "vitest";
import { checkAddress } from "../src/address";
import { analyzeAddressStub, UserInputError } from "../src/analyze";

describe("checkAddress", () => {
  it("accepts and normalizes a valid address", () => {
    expect(checkAddress("  123 Main Street,   Prosper, TX ")).toEqual({
      ok: true,
      address: "123 Main Street, Prosper, TX",
    });
  });
  it("rejects empty, whitespace and non-string input", () => {
    for (const v of ["", "   ", undefined, null, 42]) {
      expect(checkAddress(v)).toEqual({ ok: false, reason: "empty" });
    }
  });
  it("rejects overly long input", () => {
    expect(checkAddress("a".repeat(301))).toEqual({ ok: false, reason: "too_long" });
  });
});

describe("analyzeAddressStub", () => {
  it("returns a stub-flagged analysis with no fabricated values", () => {
    const r = analyzeAddressStub("123 Main Street, Prosper, TX");
    expect(r.stub).toBe(true);
    expect(r.status).toBe("stub");
    expect(r.annualEnergyKwh).toBeNull();
    expect(r.latitude).toBeNull();
  });
  it("throws a user-facing error for an empty address", () => {
    expect(() => analyzeAddressStub("")).toThrow(UserInputError);
  });
});
