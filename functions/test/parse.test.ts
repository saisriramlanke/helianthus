import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dailyEnergyKwh, percentDifference, powerWatts } from "../src/calc";
import { parseGeocodeResponse } from "../src/geocode";
import { classifySolarHttpError, parseBuildingInsights } from "../src/solar";

const fx = (n: string) => JSON.parse(readFileSync(join(__dirname, "fixtures", n), "utf8"));

describe("parseGeocodeResponse", () => {
  it("returns coordinates on success", () => {
    const r = parseGeocodeResponse(fx("geocode-ok.json"));
    expect(r).toMatchObject({ ok: true, latitude: 33.0, longitude: -96.0, partialMatch: false });
  });
  it("maps ZERO_RESULTS to not_found", () => {
    expect(parseGeocodeResponse({ status: "ZERO_RESULTS", results: [] })).toEqual({ ok: false, reason: "not_found" });
  });
  it("maps API failures", () => {
    expect(parseGeocodeResponse({ status: "REQUEST_DENIED" })).toEqual({ ok: false, reason: "auth" });
    expect(parseGeocodeResponse({ status: "OVER_QUERY_LIMIT" })).toEqual({ ok: false, reason: "quota" });
    expect(parseGeocodeResponse(null)).toEqual({ ok: false, reason: "upstream_error" });
  });
  it("rejects OK responses with missing or impossible coordinates", () => {
    expect(parseGeocodeResponse({ status: "OK", results: [] })).toEqual({ ok: false, reason: "not_found" });
    const bad = { status: "OK", results: [{ geometry: { location: { lat: 999, lng: 0 } } }] };
    expect(parseGeocodeResponse(bad)).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("parseBuildingInsights", () => {
  it("picks the largest panel configuration", () => {
    const r = parseBuildingInsights(fx("solar-ok.json"));
    expect(r).toEqual({
      ok: true,
      data: { annualEnergyKwh: 11000.5, panelCount: 30, sunshineHours: 1800, roof: { areaMeters2: 200.5, segmentCount: 3 } },
    });
  });
  it("turns missing fields into nulls, not guesses", () => {
    const r = parseBuildingInsights({ solarPotential: {} });
    expect(r).toEqual({ ok: true, data: { annualEnergyKwh: null, panelCount: null, sunshineHours: null, roof: null } });
  });
  it("reports no_solar_data when solarPotential is absent", () => {
    expect(parseBuildingInsights({})).toEqual({ ok: false, reason: "no_solar_data" });
  });
  it("classifies HTTP errors", () => {
    expect(classifySolarHttpError(404)).toBe("no_solar_data");
    expect(classifySolarHttpError(403)).toBe("auth");
    expect(classifySolarHttpError(429)).toBe("quota");
    expect(classifySolarHttpError(503)).toBe("upstream_error");
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
