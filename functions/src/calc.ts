/**
 * Helianthic-calculated values. Each formula is documented; none are supplied by Google.
 */

/** Average daily energy = annual energy / 365. A flat average; ignores seasonal variation. */
export function dailyEnergyKwh(annualKwh: number | null): number | null {
  if (annualKwh === null || !Number.isFinite(annualKwh) || annualKwh < 0) return null;
  return annualKwh / 365;
}

/** Power (W) = voltage (V) x current (A). Returns null unless both are finite and non-negative. */
export function powerWatts(voltageV: number | null, currentA: number | null): number | null {
  if (voltageV === null || currentA === null) return null;
  if (!Number.isFinite(voltageV) || !Number.isFinite(currentA) || voltageV < 0 || currentA < 0) return null;
  return voltageV * currentA;
}

/**
 * Percentage difference of measured relative to theoretical:
 *   (measured - theoretical) / theoretical x 100
 * Both values MUST already be in the same unit and time window; this function cannot check that.
 * Returns null when theoretical is zero or invalid, because the ratio is undefined.
 */
export function percentDifference(theoretical: number | null, measured: number | null): number | null {
  if (theoretical === null || measured === null) return null;
  if (!Number.isFinite(theoretical) || !Number.isFinite(measured) || theoretical === 0) return null;
  return ((measured - theoretical) / theoretical) * 100;
}
