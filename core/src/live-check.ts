/**
 * Live check: runs the real pipeline against the real free APIs. No keys needed.
 *   npm run live-check -- "1600 Pennsylvania Ave NW, Washington, DC"
 * Makes at most 3 requests (Census, optional Nominatim, PVGIS), well inside each provider's limits.
 */
import { analyzeAddress } from "./analyze";
import type { FetchLike } from "./geocode";

async function main(): Promise<void> {
  const address = process.argv.slice(2).join(" ");
  const result = await analyzeAddress(address, fetch as unknown as FetchLike);
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "ok") process.exitCode = 1;
}

main().catch((e: unknown) => {
  console.error("live-check failed:", e instanceof Error ? e.message : "unknown error");
  process.exitCode = 1;
});
