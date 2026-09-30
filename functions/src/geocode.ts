/** Parses a Google Geocoding API JSON response into a typed result. No network calls here. */

export type GeocodeResult =
  | { ok: true; latitude: number; longitude: number; formattedAddress: string; partialMatch: boolean }
  | { ok: false; reason: "not_found" | "auth" | "quota" | "invalid_request" | "upstream_error" };

interface RawGeocode {
  status?: string;
  results?: Array<{
    formatted_address?: string;
    partial_match?: boolean;
    geometry?: { location?: { lat?: unknown; lng?: unknown } };
  }>;
}

export function parseGeocodeResponse(raw: unknown): GeocodeResult {
  const body = (raw ?? {}) as RawGeocode;
  switch (body.status) {
    case "OK":
      break;
    case "ZERO_RESULTS":
      return { ok: false, reason: "not_found" };
    case "REQUEST_DENIED":
      return { ok: false, reason: "auth" };
    case "OVER_QUERY_LIMIT":
    case "OVER_DAILY_LIMIT":
      return { ok: false, reason: "quota" };
    case "INVALID_REQUEST":
      return { ok: false, reason: "invalid_request" };
    default:
      return { ok: false, reason: "upstream_error" };
  }
  const first = body.results?.[0];
  const lat = first?.geometry?.location?.lat;
  const lng = first?.geometry?.location?.lng;
  if (!isCoordinate(lat, 90) || !isCoordinate(lng, 180)) {
    return { ok: false, reason: "not_found" };
  }
  return {
    ok: true,
    latitude: lat,
    longitude: lng,
    formattedAddress: first?.formatted_address ?? "",
    partialMatch: first?.partial_match === true,
  };
}

function isCoordinate(v: unknown, limit: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= limit;
}
