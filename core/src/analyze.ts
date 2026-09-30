import { randomUUID } from "node:crypto";
import { checkAddress } from "./address";
import { dailyEnergyKwh } from "./calc";
import { geocodeAddress, type FetchLike } from "./geocode";
import type { SolarAnalysis, SystemAssumptions } from "./models";
import { DEFAULT_SYSTEM, fetchPvgis } from "./pvgis";

export class UserInputError extends Error {}

function blank(address: string): SolarAnalysis {
  return {
    analysisId: randomUUID(),
    address,
    matchedAddress: null,
    latitude: null,
    longitude: null,
    geocodeSource: null,
    timestamp: new Date().toISOString(),
    status: "upstream_error",
    system: null,
    annualEnergyKwh: null,
    annualIrradiationKwhPerM2: null,
    averageDailyEnergyKwh: null,
    monthly: [],
    dataSource: null,
  };
}

/**
 * address -> coordinates -> PVGIS estimate -> SolarAnalysis.
 * Throws UserInputError only for bad input. Every upstream failure becomes a status, never a throw.
 */
export async function analyzeAddress(
  input: unknown,
  fetchFn: FetchLike,
  system: SystemAssumptions = DEFAULT_SYSTEM,
): Promise<SolarAnalysis> {
  const checked = checkAddress(input);
  if (!checked.ok) {
    throw new UserInputError(checked.reason === "empty" ? "Please enter an address." : "That address is too long.");
  }
  const result = blank(checked.address);

  const geo = await geocodeAddress(checked.address, fetchFn);
  if (!geo.ok) {
    result.status = geo.reason === "not_found" ? "address_not_found" : "upstream_error";
    return result;
  }
  result.latitude = geo.latitude;
  result.longitude = geo.longitude;
  result.matchedAddress = geo.matchedAddress;
  result.geocodeSource = geo.source;

  const pv = await fetchPvgis(geo.latitude, geo.longitude, system, fetchFn);
  if (!pv.ok) {
    result.status = pv.reason;
    return result;
  }
  result.status = "ok";
  result.system = system;
  result.annualEnergyKwh = pv.data.annualEnergyKwh;
  result.annualIrradiationKwhPerM2 = pv.data.annualIrradiationKwhPerM2;
  result.averageDailyEnergyKwh = dailyEnergyKwh(pv.data.annualEnergyKwh);
  result.monthly = pv.data.monthly;
  result.dataSource = pv.data.dataSource;
  return result;
}
