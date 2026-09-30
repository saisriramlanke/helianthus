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
