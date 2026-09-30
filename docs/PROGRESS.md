# Progress

## Phase 1: Project architecture (backend done, Android pending)
Built `functions/` (TypeScript, Node 22): typed `SolarAnalysis` model, address validation, and a stub `analyzeAddress` callable that returns `stub: true` with no solar values.

Verified on this machine:
- `npm run typecheck`: clean
- `npm test`: 5 tests passed (address validation, stub shape, empty-address error)
- `npm run build`: succeeded
- Functions emulator: valid address returned the stub result; blank address returned `INVALID_ARGUMENT` "Please enter an address."

Not done: the Android project. This machine has no Android SDK or Gradle, so the gate for `./gradlew assembleDebug` has not run.

## STOPPED at phase 2
Needs from the project owner: Firebase project ID on the Blaze plan, APIs enabled, a restricted key stored as a secret, the Android package name. Steps are in `SETUP.md`.

## Update: no Blaze plan
Owner declined Blaze, so Cloud Functions and Secret Manager are unavailable. Note: Solar and Geocoding APIs still need a billing-enabled Google Cloud project (per Google's get-started page), so a card-backed billing account is needed either way. Firebase project `helianthic` and Android app `com.example.helianthic` already exist (Spark plan). `google-services.json` is in `android/app/` (git-ignored).

Built while waiting (no credentials needed): `geocode.ts`, `solar.ts`, `calc.ts` with fixture tests. 16 tests pass. `yearlySavings` is not parsed until a real response confirms the money format.
