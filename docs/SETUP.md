# Setup (no card needed)

The core pipeline needs nothing: no key, no account.

    cd core
    npm install
    npm test
    node lib/live-check.js "1600 Pennsylvania Ave NW, Washington, DC"   (run `npm run build` first)

## Still needed for later phases
1. Android: install Android Studio (includes the SDK), then open `android/`.
2. Firestore (free Spark): Firebase console > Firestore Database > Create database. No billing required.
3. Firebase Auth: enable Email/Password for device accounts.
4. Hardware (before firmware): microcontroller model, voltage/current sensor parts and wiring, panel rated watts and area, tilt and orientation, sampling interval.
