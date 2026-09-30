# Decisions

Defaults chosen at project start. Change a row here if the owner overrides it.

| Decision | Choice |
|---|---|
| Android | Kotlin, Jetpack Compose, single activity, MVVM (ViewModel + StateFlow), minSdk 26 |
| Backend | Firebase Cloud Functions 2nd gen, TypeScript, Node 22 |
| Client to backend | Firebase callable functions (no Google API key in the app) |
| Secrets | Firebase Secret Manager (`defineSecret`) |
| Region | us-central1 |
| Device auth | Per-device random token; backend stores only its hash |
| Package name | **OPEN** (needed at phase 2, e.g. `com.example.helianthic`) |
| Firebase / GCP project ID | **OPEN** (needed at phase 2) |
| Prototype access control | **OPEN**: App Check or Anonymous Auth, to stop strangers burning API quota |
| Comparison basis | **OPEN**: defined in `docs/COMPARISON.md` before phase 11 |
