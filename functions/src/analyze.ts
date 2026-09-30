import { randomUUID } from "node:crypto";
import { checkAddress } from "./address";
import type { SolarAnalysis } from "./models";

export class UserInputError extends Error {}

/**
 * Phase 1 placeholder: proves the Android -> Cloud Function -> Android plumbing.
 * Returns no solar values. Replaced by real Geocoding + Solar API calls in phases 3-5.
 */
export function analyzeAddressStub(input: unknown): SolarAnalysis {
  const checked = checkAddress(input);
  if (!checked.ok) {
    throw new UserInputError(
      checked.reason === "empty" ? "Please enter an address." : "That address is too long.",
    );
  }
  return {
    analysisId: randomUUID(),
    address: checked.address,
    latitude: null,
    longitude: null,
    timestamp: new Date().toISOString(),
    annualEnergyKwh: null,
    panelCount: null,
    sunshineHours: null,
    yearlySavings: null,
    roof: null,
    status: "stub",
    stub: true,
  };
}
