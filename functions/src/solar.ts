/**
 * Parses a Google Solar API buildingInsights:findClosest response.
 * Every field is optional in practice: anything missing becomes null, never a guess.
 *
 * Provenance:
 *  - annualEnergyKwh: Google-provided. It is DC energy (yearlyEnergyDcKwh) of the largest
 *    panel configuration Google returned, NOT AC energy delivered to the house.
 *  - yearlySavings: intentionally not parsed yet. The financialAnalyses money format must be
 *    confirmed against a real response (scripts/live-check) before we read it.
 */
import type { RoofInfo } from "./models";

export interface ParsedSolar {
  annualEnergyKwh: number | null;
  panelCount: number | null;
  sunshineHours: number | null;
  roof: RoofInfo | null;
}

export type SolarFailure = "no_solar_data" | "auth" | "quota" | "invalid_request" | "upstream_error";

export type SolarParseResult = { ok: true; data: ParsedSolar } | { ok: false; reason: SolarFailure };

/** Maps an HTTP failure from the Solar API to a reason. 404 means no coverage, which is normal. */
export function classifySolarHttpError(status: number): SolarFailure {
  if (status === 404) return "no_solar_data";
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "quota";
  if (status === 400) return "invalid_request";
  return "upstream_error";
}

interface RawConfig {
  panelsCount?: unknown;
  yearlyEnergyDcKwh?: unknown;
}
interface RawSolar {
  solarPotential?: {
    maxArrayPanelsCount?: unknown;
    maxSunshineHoursPerYear?: unknown;
    wholeRoofStats?: { areaMeters2?: unknown };
    roofSegmentStats?: unknown[];
    solarPanelConfigs?: RawConfig[];
  };
}

export function parseBuildingInsights(raw: unknown): SolarParseResult {
  const sp = (raw as RawSolar | null | undefined)?.solarPotential;
  if (!sp || typeof sp !== "object") return { ok: false, reason: "no_solar_data" };

  // Largest configuration = the one with the most panels.
  let best: RawConfig | null = null;
  for (const c of Array.isArray(sp.solarPanelConfigs) ? sp.solarPanelConfigs : []) {
    const n = num(c?.panelsCount);
    if (n !== null && (best === null || n > (num(best.panelsCount) ?? -1))) best = c;
  }

  const area = num(sp.wholeRoofStats?.areaMeters2);
  const segments = Array.isArray(sp.roofSegmentStats) ? sp.roofSegmentStats.length : null;

  return {
    ok: true,
    data: {
      annualEnergyKwh: best ? num(best.yearlyEnergyDcKwh) : null,
      panelCount: best ? num(best.panelsCount) : num(sp.maxArrayPanelsCount),
      sunshineHours: num(sp.maxSunshineHoursPerYear),
      roof: area === null && segments === null ? null : { areaMeters2: area, segmentCount: segments },
    },
  };
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
