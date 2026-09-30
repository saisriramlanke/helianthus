# Progress

## Done and verified
- Phase 1 plumbing, then pivoted: the owner has no credit card, so Blaze and Google Cloud billing are out.
- New free pipeline in `core/`: address -> Census (fallback Nominatim) -> PVGIS -> `SolarAnalysis`.
- `npm test`: 21 passed, using real responses recorded from the live APIs on 2026-09-30 plus failure cases.
- Live check against a real address (1600 Pennsylvania Ave NW, Washington DC) returned status ok: Census match, PVGIS annual energy 1404.93 kWh for a 1 kW, 30 degree, south-facing system, 12 monthly values.

## Not done
- Android project (no Android SDK on this machine).
- Firestore, device auth, sensor data, comparison, charts.

## Next
Install Android Studio, then build the Kotlin app against this contract. Create the Firestore database in the Firebase console (free).

## Update: toolchain and Firebase (2026-09-30)
- Firebase (friend's account, project `helianthic`, Spark): Firestore `(default)` created in nam5, production mode; Email/Password sign-in enabled. Anonymous sign-in not enabled yet.
- `firestore.rules` written (deny by default, owner-only analyses, registered-device-only validated sensor readings). NOT yet tested in the emulator and NOT yet deployed.
- Android Studio installed (winget). SDK at `%LOCALAPPDATA%\Android\Sdk` with platform-tools, platforms android-36 and android-37.0, build-tools 36.0.0. Gradle wrapper 9.8.0, AGP 9.4.1, Kotlin compose plugin 2.4.20, Compose BOM 2026.09.00 (needs compileSdk 37).
- `android/`: minimal Compose app. `gradlew assembleDebug testDebugUnitTest` succeeded and produced `app-debug.apk`; smoke unit test passed. Nothing has been run on a device or emulator yet.
- `android/local.properties` holds the machine-specific SDK path (git-ignored); recreate it on another machine with `sdk.dir=<path to Android SDK>`.

## Update: Kotlin port and rules tests (2026-09-30)
- `core/`: `npm run test:rules` runs 15 Firestore rules tests in the emulator; all pass. `npm test` still 21 passing.
- `android/`: Kotlin port of the pipeline (`domain/`, `data/`) plus Home and result screens (`ui/`). `gradlew assembleDebug testDebugUnitTest`: BUILD SUCCESSFUL, 18 unit tests pass (17 pipeline tests on real recorded responses, 1 smoke).
- NOT done: the app has not been run on a phone or emulator; the real network path (HttpURLConnection) has only been exercised through the Node live check, not from Android.
- NOT done: `firestore.rules` is NOT deployed (Firebase CLI login was not completed). The live database currently denies all client access.
- NOT done: Firestore/Auth are not yet used by the app; no saved analyses, device onboarding, sensor screens, comparison or charts.

## Deploy the rules (owner, once)
    cd core
    npx firebase login
    npx firebase deploy --only firestore:rules --project helianthic --config ../firebase.json
