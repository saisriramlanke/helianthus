# Decisions

| Decision | Choice |
|---|---|
| Constraint | No credit card anywhere: no Blaze, no Google Cloud billing |
| Geocoding | US Census Geocoder, then OpenStreetMap Nominatim fallback (free, no key) |
| Solar estimate | EU JRC PVGIS v5.3 `PVcalc` (free, no key). Replaces Google Solar API, which needs a billing account |
| Backend | None. The app calls the free APIs directly; there are no secrets to hide |
| Database | Firebase Firestore on the free Spark plan (Functions are not used) |
| Device auth | Each device signs in as its own Firebase Auth user; Firestore rules restrict writes and validate ranges |
| Android | Kotlin, Jetpack Compose, MVVM, minSdk 26, package `com.example.helianthic` |
| Firebase project ID | `helianthic` (Spark plan) |
| Reference implementation | `core/` (TypeScript) holds the tested logic and live check; the Kotlin app mirrors it |
| Google Solar API | Dropped for now. Code is in git history (commit bc3107e) if a billing account ever exists |

## What changes versus the spec
- PVGIS is not roof-specific. It estimates a stated system (size, tilt, azimuth, losses) at a location. There is no roof segment, panel count or savings data, so those spec fields are omitted, not faked.
- The estimate takes system assumptions as inputs (defaults: 1 kW, 14% losses, 30 degree tilt, south-facing). The mini panel comparison should use the same tilt and azimuth.
- PVGIS also returns in-plane irradiation (kWh/m2), which helps calibrate the mini panel.
- Census geocoding gives a street-segment point; Nominatim gives a building or place point. Both are approximate.
- Nominatim policy: 1 request per second, a real User-Agent, no bulk use. Fine for a student app.
