/**
 * Typed application models. Provenance is explicit so the UI can never present a
 * calculated value as if a data provider supplied it (spec section 8).
 *
 * Providers (all free, no key, no card):
 *  - Geocoding: US Census Geocoder first, OpenStreetMap Nominatim as fallback
 *  - Solar estimate: EU JRC PVGIS (PVcalc), a model-based estimate for a stated system
 */

export type AnalysisStatus = "ok" | "address_not_found" | "no_solar_data" | "upstream_error";

export type GeocodeSource = "census" | "nominatim";

/** The hypothetical PV system the estimate is for. PVGIS needs these inputs; Google Solar did not. */
export interface SystemAssumptions {
  peakPowerKw: number;
  lossPercent: number;
  tiltDegrees: number;
  /** PVGIS convention: 0 = south, 90 = west, -90 = east, 180 = north. */
  azimuthDegrees: number;
}

export interface MonthlyEstimate {
  month: number; // 1-12
  /** Provider-supplied energy for the month, kWh. */
  energyKwh: number;
  /** Provider-supplied in-plane irradiation for the month, kWh/m2. */
  irradiationKwhPerM2: number;
}

export interface SolarAnalysis {
  analysisId: string;
  /** Exactly what the user typed (trimmed). */
  address: string;
  /** What the geocoder matched; may differ from the input. */
  matchedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  geocodeSource: GeocodeSource | null;
  /** ISO-8601 UTC. */
  timestamp: string;
  status: AnalysisStatus;
  system: SystemAssumptions | null;
  /** Provider-supplied (PVGIS E_y): expected yearly energy of `system`, after system losses. */
  annualEnergyKwh: number | null;
  /** Provider-supplied (PVGIS H(i)_y): yearly in-plane irradiation, kWh/m2. Numerically equal to peak-sun-hours per year. */
  annualIrradiationKwhPerM2: number | null;
  /** Helianthic-calculated: annualEnergyKwh / 365. A flat average, ignores seasons. */
  averageDailyEnergyKwh: number | null;
  monthly: MonthlyEstimate[];
  /** Short description of the dataset behind the numbers, e.g. "PVGIS PVGIS-ERA5 2005-2023". */
  dataSource: string | null;
}
