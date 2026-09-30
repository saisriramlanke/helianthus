/**
 * Geocoding with two free, keyless providers.
 *  - US Census Geocoder: good for US street addresses.
 *  - OpenStreetMap Nominatim: worldwide fallback. Usage policy: max 1 request/second,
 *    identify the app in User-Agent, cache results. https://operations.osmfoundation.org/policies/nominatim/
 * Parsers are pure; `geocodeAddress` takes an injectable fetch so it can be tested offline.
 */
import type { GeocodeSource } from "./models";

export type GeocodeResult =
  | { ok: true; latitude: number; longitude: number; matchedAddress: string; source: GeocodeSource }
  | { ok: false; reason: "not_found" | "upstream_error" };

export function parseCensusResponse(raw: unknown): GeocodeResult {
  const matches = (raw as { result?: { addressMatches?: unknown } } | null)?.result?.addressMatches;
  if (!Array.isArray(matches)) return { ok: false, reason: "upstream_error" };
  const m = matches[0] as { matchedAddress?: unknown; coordinates?: { x?: unknown; y?: unknown } } | undefined;
  if (!m) return { ok: false, reason: "not_found" };
  // Census returns x = longitude, y = latitude.
  const lon = m.coordinates?.x;
  const lat = m.coordinates?.y;
  if (!isCoord(lat, 90) || !isCoord(lon, 180)) return { ok: false, reason: "not_found" };
  return {
    ok: true,
    latitude: lat,
    longitude: lon,
    matchedAddress: typeof m.matchedAddress === "string" ? m.matchedAddress : "",
    source: "census",
  };
}

export function parseNominatimResponse(raw: unknown): GeocodeResult {
  if (!Array.isArray(raw)) return { ok: false, reason: "upstream_error" };
  const first = raw[0] as { lat?: unknown; lon?: unknown; display_name?: unknown } | undefined;
  if (!first) return { ok: false, reason: "not_found" };
  // Nominatim returns coordinates as strings.
  const lat = Number(first.lat);
  const lon = Number(first.lon);
  if (!isCoord(lat, 90) || !isCoord(lon, 180)) return { ok: false, reason: "not_found" };
  return {
    ok: true,
    latitude: lat,
    longitude: lon,
    matchedAddress: typeof first.display_name === "string" ? first.display_name : "",
    source: "nominatim",
  };
}

export const USER_AGENT = "Helianthic/0.1 (student project; contact: see repository)";
const TIMEOUT_MS = 10_000;

export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

async function getJson(fetchFn: FetchLike, url: string): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    const res = await fetchFn(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false };
    return { ok: true, body: await res.json() };
  } catch {
    return { ok: false };
  }
}

/** Tries Census, then Nominatim. Returns not_found only if a provider answered and found nothing. */
export async function geocodeAddress(address: string, fetchFn: FetchLike): Promise<GeocodeResult> {
  const q = encodeURIComponent(address);
  let answeredEmpty = false;

  const census = await getJson(
    fetchFn,
    `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${q}&benchmark=Public_AR_Current&format=json`,
  );
  if (census.ok) {
    const r = parseCensusResponse(census.body);
    if (r.ok) return r;
    if (r.reason === "not_found") answeredEmpty = true;
  }

  const osm = await getJson(fetchFn, `https://nominatim.openstreetmap.org/search?q=${q}&format=jsonv2&limit=1`);
  if (osm.ok) {
    const r = parseNominatimResponse(osm.body);
    if (r.ok) return r;
    if (r.reason === "not_found") answeredEmpty = true;
  }

  return { ok: false, reason: answeredEmpty ? "not_found" : "upstream_error" };
}

function isCoord(v: unknown, limit: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= limit;
}
