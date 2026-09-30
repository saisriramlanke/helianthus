Files named real-*.json are REAL responses recorded from the live APIs on 2026-09-30
(US Census Geocoder, OSM Nominatim, EU JRC PVGIS v5.3). They are used only to test parsing offline.
Inline objects inside the tests are hand-written fixtures for failure cases we cannot trigger on demand.
Never present any fixture as a real result in the app. Live results come from `npm run live-check`.
