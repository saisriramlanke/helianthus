import { defineConfig } from "vitest/config";

// Default run: offline unit tests only. Rules tests need the Firestore emulator
// and run through `npm run test:rules` (see vitest.rules.config.ts).
export default defineConfig({
  test: { include: ["test/*.test.ts"] },
});
