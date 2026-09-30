/**
 * EU JRC PVGIS "PVcalc" client (free, no key). https://re.jrc.ec.europa.eu/pvg_tools/en/
 * Returns a model-based estimate for a stated PV system at a location. It is NOT roof-specific:
 * it knows nothing about shading, roof shape or panel count beyond what we pass in.
 */
import type { FetchLike } from "./geocode";
import type { MonthlyEstimate, SystemAssumptions } from "./models";

export const DEFAULT_SYSTEM: SystemAssumptions = {
  peakPowerKw: 1,
  lossPercent: 14,
  tiltDegrees: 30,
  azimuthDegrees: 0,
};

export interface ParsedPv {
  annualEnergyKwh: number;
  annualIrradiationKwhPerM2: number;
  monthly: MonthlyEstimate[];
  dataSource: string;
}

export type PvResult = { ok: true; data: ParsedPv } | { ok: false; reason: "no_solar_data" | "upstream_error" };

export function buildPvgisUrl(lat: number, lon: number, s: SystemAssumptions): string {
  const p = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    peakpower: String(s.peakPowerKw),
    loss: String(s.lossPercent),
    angle: String(s.tiltDegrees),
    aspect: String(s.azimuthDegrees),
    outputformat: "json",
  });
  return `https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?${p.toString()}`;
}

/** `httpStatus` 400 means PVGIS rejected the location (over sea or outside its coverage). */
export function parsePvgisResponse(raw: unknown, httpStatus: number): PvResult {
  if (httpStatus === 400) return { ok: false, reason: "no_solar_data" };
  if (httpStatus < 200 || httpStatus >= 300) return { ok: false, reason: "upstream_error" };

  const body = raw as {
    inputs?: { meteo_data?: { radiation_db?: unknown; year_min?: unknown; year_max?: unknown } };
    outputs?: {
      monthly?: { fixed?: Array<Record<string, unknown>> };
      totals?: { fixed?: Record<string, unknown> };
    };
  } | null;

  const totals = body?.outputs?.totals?.fixed;
  const annual = num(totals?.["E_y"]);
  const irr = num(totals?.["H(i)_y"]);
  const rows = body?.outputs?.monthly?.fixed;
  if (annual === null || irr === null || !Array.isArray(rows)) return { ok: false, reason: "upstream_error" };

  const monthly: MonthlyEstimate[] = [];
  for (const r of rows) {
    const month = num(r["month"]);
    const e = num(r["E_m"]);
    const h = num(r["H(i)_m"]);
    if (month === null || e === null || h === null) return { ok: false, reason: "upstream_error" };
    monthly.push({ month, energyKwh: e, irradiationKwhPerM2: h });
  }

  const m = body?.inputs?.meteo_data;
  const dataSource = `PVGIS ${String(m?.radiation_db ?? "unknown db")} ${String(m?.year_min ?? "?")}-${String(m?.year_max ?? "?")}`;
  return { ok: true, data: { annualEnergyKwh: annual, annualIrradiationKwhPerM2: irr, monthly, dataSource } };
}

export async function fetchPvgis(lat: number, lon: number, s: SystemAssumptions, fetchFn: FetchLike): Promise<PvResult> {
  try {
    const res = await fetchFn(buildPvgisUrl(lat, lon, s), { signal: AbortSignal.timeout(20_000) });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* non-JSON body: handled by status */
    }
    return parsePvgisResponse(body, res.status);
  } catch {
    return { ok: false, reason: "upstream_error" };
  }
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
