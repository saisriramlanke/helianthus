import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkAddress } from "../src/address";
import { analyzeAddress, UserInputError } from "../src/analyze";
import { dailyEnergyKwh, percentDifference, powerWatts } from "../src/calc";
import { parseCensusResponse, parseNominatimResponse, type FetchLike } from "../src/geocode";
import { buildPvgisUrl, DEFAULT_SYSTEM, parsePvgisResponse } from "../src/pvgis";

const fx = (n: string) => JSON.parse(readFileSync(join(__dirname, "fixtures", n), "utf8"));
const reply = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

/** Routes by hostname. A handler value of "throw" simulates a network failure. */
function fakeFetch(routes: { census?: unknown | "throw"; nominatim?: unknown | "throw"; pvgis?: unknown | "throw"; pvStatus?: number }): FetchLike {
  return async (url) => {
    const key = url.includes("census.gov") ? "census" : url.includes("nominatim") ? "nominatim" : "pvgis";
    const v = routes[key];
    if (v === "throw" || v === undefined) throw new Error("network down");
    return reply(v, key === "pvgis" ? (routes.pvStatus ?? 200) : 200);
  };
}

describe("checkAddress", () => {
  it("normalizes a valid address", () => {
    expect(checkAddress("  123 Main Street,   Prosper, TX ")).toEqual({ ok: true, address: "123 Main Street, Prosper, TX" });
  });
  it("rejects empty, whitespace and non-string input", () => {
    for (const v of ["", "   ", undefined, null, 42]) expect(checkAddress(v)).toEqual({ ok: false, reason: "empty" });
  });
  it("rejects overly long input", () => {
    expect(checkAddress("a".repeat(301))).toEqual({ ok: false, reason: "too_long" });
  });
});

describe("geocode parsers (real recorded responses)", () => {
  it("Census success: x is longitude, y is latitude", () => {
    const r = parseCensusResponse(fx("real-census-ok.json"));
    expect(r).toMatchObject({ ok: true, source: "census" });
    if (r.ok) {
      expect(r.latitude).toBeCloseTo(38.8987, 3);
      expect(r.longitude).toBeCloseTo(-77.0352, 3);
    }
  });
  it("Census no match", () => {
    expect(parseCensusResponse(fx("real-census-empty.json"))).toEqual({ ok: false, reason: "not_found" });
  });
  it("Nominatim success parses string coordinates", () => {
    const r = parseNominatimResponse(fx("real-nominatim-ok.json"));
    expect(r).toMatchObject({ ok: true, source: "nominatim" });
    if (r.ok) expect(r.latitude).toBeCloseTo(38.8976, 3);
  });
  it("Nominatim empty list is not_found; garbage is upstream_error", () => {
    expect(parseNominatimResponse([])).toEqual({ ok: false, reason: "not_found" });
    expect(parseNominatimResponse({ error: "x" })).toEqual({ ok: false, reason: "upstream_error" });
  });
  it("rejects impossible coordinates", () => {
    const bad = { result: { addressMatches: [{ coordinates: { x: 500, y: 0 } }] } };
    expect(parseCensusResponse(bad)).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("PVGIS", () => {
  it("builds the request URL from assumptions", () => {
    const u = buildPvgisUrl(38.9, -77.03, DEFAULT_SYSTEM);
    expect(u).toContain("lat=38.9");
    expect(u).toContain("lon=-77.03");
    expect(u).toContain("peakpower=1");
    expect(u).toContain("angle=30");
    expect(u).toContain("aspect=0");
  });
  it("parses a real response", () => {
    const r = parsePvgisResponse(fx("real-pvgis-ok.json"), 200);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.annualEnergyKwh).toBeGreaterThan(1000);
      expect(r.data.monthly).toHaveLength(12);
      expect(r.data.dataSource).toContain("ERA5");
    }
  });
  it("treats HTTP 400 (over sea) as no_solar_data", () => {
    expect(parsePvgisResponse(fx("real-pvgis-sea.json"), 400)).toEqual({ ok: false, reason: "no_solar_data" });
  });
  it("treats server errors and malformed bodies as upstream_error", () => {
    expect(parsePvgisResponse(null, 503)).toEqual({ ok: false, reason: "upstream_error" });
    expect(parsePvgisResponse({ outputs: {} }, 200)).toEqual({ ok: false, reason: "upstream_error" });
  });
});

describe("analyzeAddress", () => {
  it("succeeds end to end with recorded responses", async () => {
    const r = await analyzeAddress("1600 Pennsylvania Ave NW", fakeFetch({ census: fx("real-census-ok.json"), pvgis: fx("real-pvgis-ok.json") }));
    expect(r.status).toBe("ok");
    expect(r.geocodeSource).toBe("census");
    expect(r.annualEnergyKwh).toBeGreaterThan(1000);
    expect(r.averageDailyEnergyKwh).toBeCloseTo((r.annualEnergyKwh as number) / 365);
  });
  it("falls back to Nominatim when Census is unreachable", async () => {
    const r = await analyzeAddress("x", fakeFetch({ census: "throw", nominatim: fx("real-nominatim-ok.json"), pvgis: fx("real-pvgis-ok.json") }));
    expect(r.status).toBe("ok");
    expect(r.geocodeSource).toBe("nominatim");
  });
  it("reports address_not_found when providers answer with no match", async () => {
    const r = await analyzeAddress("zzzz", fakeFetch({ census: fx("real-census-empty.json"), nominatim: [] }));
    expect(r.status).toBe("address_not_found");
    expect(r.annualEnergyKwh).toBeNull();
  });
  it("reports upstream_error, not a crash, when every provider is down", async () => {
    const r = await analyzeAddress("anything", fakeFetch({ census: "throw", nominatim: "throw" }));
    expect(r.status).toBe("upstream_error");
  });
  it("reports no_solar_data when PVGIS rejects the location", async () => {
    const r = await analyzeAddress("x", fakeFetch({ census: fx("real-census-ok.json"), pvgis: fx("real-pvgis-sea.json"), pvStatus: 400 }));
    expect(r.status).toBe("no_solar_data");
    expect(r.latitude).not.toBeNull();
    expect(r.annualEnergyKwh).toBeNull();
  });
  it("throws a user-facing error for an empty address", async () => {
    await expect(analyzeAddress("  ", fakeFetch({}))).rejects.toThrow(UserInputError);
  });
});

describe("calculations", () => {
  it("converts annual to daily energy", () => {
    expect(dailyEnergyKwh(3650)).toBe(10);
    expect(dailyEnergyKwh(null)).toBeNull();
    expect(dailyEnergyKwh(-1)).toBeNull();
  });
  it("calculates power", () => {
    expect(powerWatts(5, 0.4)).toBeCloseTo(2);
    expect(powerWatts(5, null)).toBeNull();
    expect(powerWatts(-5, 1)).toBeNull();
  });
  it("calculates percentage difference", () => {
    expect(percentDifference(10, 9)).toBeCloseTo(-10);
    expect(percentDifference(0, 9)).toBeNull();
    expect(percentDifference(10, null)).toBeNull();
  });
});
