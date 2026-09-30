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
