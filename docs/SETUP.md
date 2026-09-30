# Setup: what the human must do

Do these once. Nothing here goes in git or chat. Use the project owner's own Google account in their own browser profile.

## Phase 2: Google Cloud and Firebase
1. Go to https://console.firebase.google.com and create a project (this also creates the Google Cloud project). Note the **project ID**.
2. Upgrade the project to the **Blaze** plan (needs a billing account and card). Cloud Functions 2nd gen, Secret Manager, and the Solar API need it. Set a budget alert (Billing > Budgets) so a mistake cannot run up a bill.
3. In Google Cloud Console > APIs & Services > Library, enable: **Geocoding API**, **Solar API**. (Cloud Functions, Firestore and Secret Manager get enabled on first deploy.)
4. Create Firestore: Firebase console > Firestore Database > Create database (production mode, region near users).
5. Create an API key: Google Cloud Console > APIs & Services > Credentials > Create credentials > API key. Restrict it to **Geocoding API** and **Solar API** only. Do not put it in the app or in git.
6. On the dev machine, log in: `npx firebase login` (from `functions/`), then `npx firebase use <project-id>`.
7. Store the key as a secret: `npx firebase functions:secrets:set GOOGLE_MAPS_API_KEY` and paste when prompted.
8. Add the Android app: Firebase console > Project settings > Add app > Android, using the chosen package name. Download `google-services.json` into `android/app/` (it is not committed).

## Phase 9: hardware (needed before firmware)
Microcontroller model, voltage/current sensor parts and wiring, panel rated watts and area, tilt and orientation, sampling interval.
