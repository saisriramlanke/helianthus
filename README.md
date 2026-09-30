# Helianthic

An Android app that estimates the solar-energy potential of a property from its address, and is meant to be compared later against real measurements from a miniature solar panel on a model roof. It supports UN Sustainable Development Goal 7 (Affordable and Clean Energy).

**No credit card, API key, or paid plan is needed for anything in this repo.** That was a deliberate constraint, and it shaped the design (see [Design decisions](#design-decisions)).

## Where the project is

| Area | State |
|---|---|
| Address to coordinates to solar estimate (TypeScript reference, `core/`) | Working. 21 unit tests. Live check works against the real APIs. |
| Same pipeline in Kotlin (`android/`) | Working. 17 unit tests on real recorded API responses, plus a live test that ran it against the real APIs with the app's own HTTP code (status OK, 1404.93 kWh/yr for the White House address). |
| Android home screen and result screen | Builds. The real `MainActivity` launches and the screens behave correctly in 5 automated UI tests (Robolectric, on the JVM). **Not yet run on a physical phone or emulator** (see Step 6). |
| Firestore security rules (`firestore.rules`) | Written, 15 emulator tests pass. **Not deployed yet.** |
| Firebase project `helianthic` (Spark plan), Firestore database, Email/Password sign-in | Created. |
| Saved analyses, device registration, live sensor screen, history charts | Not built. |
| Comparison of estimate versus measured panel data | Not built. Needs a written definition first (see Roadmap). |
| Hardware and firmware (`firmware/`) | Not started. Hardware parts are undecided. |

Full history and exact verification notes: [`docs/PROGRESS.md`](docs/PROGRESS.md).

## How it works

```
address text
   |
   v
US Census Geocoder  (fallback: OpenStreetMap Nominatim)   -> latitude, longitude
   |
   v
EU JRC PVGIS "PVcalc"                                      -> yearly and monthly energy for an assumed PV system
   |
   v
SolarAnalysis  ->  Android result screen
```

Every value is labeled by where it came from: **provider-supplied** (PVGIS), **calculated by Helianthic** (for example daily average = yearly / 365), or later **measured** (the physical panel). The app never presents one as another.

Failures never crash the app. An unknown address, a location with no solar data, or a dead network each become a plain user message ("We couldn't find that address..."), never a raw API error.

## Design decisions

- **PVGIS instead of the Google Solar API.** The original spec called for Google's Solar API. It (like the Geocoding API) needs a billing-enabled Google Cloud project, and Cloud Functions needs Firebase's paid Blaze plan. With no card available, this repo uses free keyless services instead. The Google-based code is in git history at commit `bc3107e` if a billing account ever exists.
- **What that costs in features.** PVGIS is not roof-specific. It estimates a system you describe (size, tilt, direction, losses) at a location. It has no roof segments, panel count, or savings figures, so those are left out rather than faked. The defaults are 1 kW, 14% losses, 30 degree tilt, south-facing. The mini panel should use the same tilt and direction so the comparison is fair.
- **No backend.** With no secret keys to hide, the app calls the free APIs directly. Firebase is used only for Firestore (free Spark plan) and sign-in.
- **The TypeScript in `core/` is the reference.** It is where the logic was first tested against the live APIs, and the Kotlin app mirrors it. Keep them in agreement.
- **Test data honesty.** Files named `real-*.json` in the fixtures folders are real API responses recorded on 2026-09-30. Nothing fake is ever shown as a real result in the app.

Service limits to respect: Nominatim allows at most 1 request per second, needs a real User-Agent, and forbids bulk use. The US Census geocoder covers US addresses only (Nominatim covers the rest).

## Repo layout

```
core/                  TypeScript reference logic, tests, live check, Firestore rules tests
android/               Android app (Kotlin, Jetpack Compose)
firestore.rules        Firestore security rules (deny by default)
firebase.json          Firebase emulator and rules config
docs/                  PROGRESS.md, DECISIONS.md, SETUP.md
```

`firmware/` and `scripts/` will be added when the hardware phase starts.

## Getting started, step by step

### Step 1: Clone

```bash
git clone <this repo's URL>
cd Helianthic
```

### Step 2: Install the tools

- **Git**
- **Node.js 20 or newer** (for `core/`)
- **JDK 21** on your PATH (used by the Firestore emulator in Step 4; this project was built with OpenJDK 21). Android Studio bundles its own JDK for the Android build.
- **Android Studio** (includes the Android SDK): https://developer.android.com/studio

### Step 3: Check the TypeScript side (about 1 minute)

```bash
cd core
npm install
npm test
```

Expected: 21 tests pass. Then try the real pipeline with a real address. This hits the live free APIs and needs no key:

```bash
npm run build
node lib/live-check.js "1600 Pennsylvania Ave NW, Washington, DC"
```

Expected: JSON with `"status": "ok"`, coordinates, and a yearly energy figure.

### Step 4: Check the Firestore rules (needs JDK 21)

```bash
npm run test:rules
```

Expected: 15 tests pass. The first run downloads the Firestore emulator (about 60 MB).

### Step 5: Build the Android app

1. Open the `android/` folder in Android Studio and let it sync. It will offer to install any missing SDK pieces (accept).
2. Android Studio creates `android/local.properties` with your SDK path. If you are using the command line instead, create that file yourself, pointing at your SDK (use forward slashes on Windows):

   ```
   sdk.dir=C:/Users/<you>/AppData/Local/Android/Sdk
   ```

3. Command-line build and tests (from `android/`):

   ```bash
   ./gradlew assembleDebug testDebugUnitTest      # macOS / Linux
   .\gradlew.bat assembleDebug testDebugUnitTest  # Windows cmd or PowerShell
   ```

   Expected: `BUILD SUCCESSFUL`, 23 tests pass (2 more are skipped unless you opt in, below), and an APK at `android/app/build/outputs/apk/debug/app-debug.apk`.

   Optional: run the Kotlin pipeline against the real APIs (skipped by default so normal runs never use the network):

   ```bash
   # macOS / Linux
   HELIANTHIC_LIVE=1 ./gradlew testDebugUnitTest --tests "*LiveNetworkTest*"
   # Windows cmd
   set HELIANTHIC_LIVE=1 && .\gradlew.bat testDebugUnitTest --tests "*LiveNetworkTest*"
   ```

   **Windows on ARM (Snapdragon laptops):** Robolectric's native runtime does not support ARM64 Windows, so the 5 UI tests fail there. Run the tests on an x64 JDK 21 instead: `gradlew testDebugUnitTest -PtestJvm=C:/path/to/x64-jdk/bin/java.exe`. The Android emulator also cannot run on those machines (no virtualization exposed to the x86 emulator, and it rejects ARM images), so use a physical phone.
4. The app needs `compileSdk 37`. If Gradle reports a missing platform, install "Android 37" in Android Studio's SDK Manager.

### Step 6: Run the app on a real device

This is the one check that has not been done: the automated tests cover the code and screens, but nobody has launched the APK on a phone or emulator yet.

1. On an Android phone: Settings > About phone > tap **Build number** 7 times, then Settings > System > Developer options > turn on **USB debugging**.
2. Plug the phone into the computer and accept the "Allow USB debugging?" prompt on the phone.
3. In Android Studio, pick the phone in the device dropdown and press Run. (Or from the command line: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.)
4. Type an address such as `1600 Pennsylvania Ave NW, Washington, DC` and tap **Analyze**.
5. Expected: a LOCATION block, a PROVIDER ESTIMATE block (about 1,405 kWh for that address), a CALCULATED BY HELIANTHIC block, the assumed system, and 12 months of figures. A nonsense address should show "We couldn't find that address..." and turning on airplane mode should show the "couldn't reach the solar data services" message. Anything else is a bug to fix.

If you have no phone, use an x86 or Apple Silicon machine and Android Studio's Device Manager to create an emulator.

### Step 7: Firebase setup

The Firebase project `helianthic` already exists (Spark plan, no billing) with a Firestore database and Email/Password sign-in enabled. The project owner must do these:

1. **Download `google-services.json`:** Firebase console > Project settings > Your apps > Android app (`com.example.helianthic`) > download. Put it in `android/app/`. It is git-ignored on purpose. The app does not use Firebase yet, so this is only needed once you add it.
2. **Deploy the security rules** (until then the database denies every client request, which is safe):

   ```bash
   cd core
   npx firebase login
   npx firebase deploy --only firestore:rules --project helianthic --config ../firebase.json
   ```

3. **Enable Anonymous sign-in** in Firebase console > Authentication > Sign-in method if the app should let people save analyses without an account. Decide this before building the saved-analyses screen.

## Roadmap

Do these in order, and verify each one before starting the next.

1. **Run the app** on an emulator or phone and fix what breaks. Confirm the real network path works from Android.
2. **Saved analyses.** Add the Firebase SDK, save a result to Firestore under the signed-in user's id (the rules require an `ownerUid` field), and list previous analyses. Add tests.
3. **Decide the hardware** before any firmware: microcontroller (an ESP32 is the likely choice), voltage and current sensor parts, wiring, the panel's rated watts and area, tilt, direction, and how often to sample.
4. **Device registration and ingestion.** Each device signs in to Firebase Auth as its own user. Register it in `devices/{deviceId}` with `ownerUid` (the human owner) and `authUid` (the device's Auth id). The rules let only that device create readings in `sensorReadings`, with fixed units (volts, amps, watts, degrees Celsius) and range checks. Readings cannot be edited or deleted.
5. **Sensor screen and history chart.** Show the latest reading, a "stale" state when a device has not reported recently, and power over time.
6. **Write `docs/COMPARISON.md` before building the comparison.** It must state the time window, exactly how the PVGIS yearly figure is converted to that window and to the mini panel's size (panel area and efficiency), and the uncontrolled factors (shading, weather, tilt, sensor error). Only then show a percentage difference, always with those assumptions next to it. The mini panel is an experimental data source. It is not a direct measurement of what a full-size roof would produce.
7. **Polish the interface**, after the above works.

## Things to know before changing code

- Keep `core/` and the Kotlin app in agreement. A change to parsing or calculations goes in both, with tests.
- Do not log or commit secrets. There are none today; `.gitignore` already excludes `.env*`, keystores, service account files, and `local.properties`.
- New fixtures should come from real responses (`curl` the API once and save it), not hand-written, except for failure cases that cannot be triggered on demand. Label those clearly.
- Firestore rules changes must come with a rules test (`npm run test:rules`).
- PVGIS azimuth convention: 0 is south, 90 is west, -90 is east, 180 is north.

## Data sources and credits

- Geocoding: [US Census Geocoder](https://geocoding.geo.census.gov/) and [OpenStreetMap Nominatim](https://nominatim.org/) (data copyright OpenStreetMap contributors, ODbL).
- Solar estimates: [PVGIS](https://joint-research-centre.ec.europa.eu/pvgis-photovoltaic-geographical-information-system_en) from the European Commission Joint Research Centre. Check their terms before any public release.
