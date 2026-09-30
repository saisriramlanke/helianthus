/**
 * Typed application models. Every numeric value carries its provenance so the UI
 * can never present a calculated value as if Google supplied it (spec section 8).
 */

/** Where a value came from. */
export type ValueSource = "google" | "helianthic" | "measured";

export type AnalysisStatus =
  | "stub" // phase 1 plumbing only; contains no real data
  | "ok"
  | "address_not_found"
  | "no_solar_data"
  | "upstream_error";

export interface SolarAnalysis {
  analysisId: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  /** ISO-8601 UTC. */
  timestamp: string;
  /** Google-provided. Null when the API did not return it; never invented. */
  annualEnergyKwh: number | null;
  panelCount: number | null;
  sunshineHours: number | null;
  yearlySavings: number | null;
  roof: RoofInfo | null;
  status: AnalysisStatus;
  /** True only for phase 1 placeholder responses. */
  stub: boolean;
}

export interface RoofInfo {
  areaMeters2: number | null;
  segmentCount: number | null;
}

export interface AnalyzeAddressRequest {
  address: string;
}
