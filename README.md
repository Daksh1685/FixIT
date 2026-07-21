# SnapFix

SnapFix is a camera-first Expo app for capturing a device image before diagnosis.

## Run locally

```sh
npm install
npx expo install expo-camera expo-image-picker @expo/vector-icons expo-status-bar
npm start
```

Use a physical device for the live camera experience. The app asks for camera access when it opens; select **Photo library** to inspect an existing image instead.

## Install SnapFix directly on Android

If Expo Go cannot open the project on your phone, make an installable preview APK instead. This build runs independently of Expo Go and does not need the development server after installation.

```sh
npx eas-cli login
npm run build:android:preview
```

When the EAS build finishes, open its install link on the Android phone, download the APK, and allow the browser or file manager to install unknown apps if Android asks. The `preview` profile creates an installable APK; the `production` profile remains configured for a Play Store AAB.

## Project structure

```text
src/
  components/       Reusable camera, preview, HUD, and UI components
  features/scanner/ Screen-level camera flow and state
  hooks/            Reusable behavior hooks
  theme/            Design tokens
  types/            Shared domain types
```

AI diagnosis is intentionally not implemented. The result HUD is a visual placeholder for that future capability.

## Connect the mobile app to the API

Set the API address before starting Expo. On a physical phone, use your computer's LAN IP rather than `localhost`.

```sh
Copy-Item .env.example .env
# Update EXPO_PUBLIC_API_URL in .env, then restart Expo with cache cleared
npm start -- --clear
```

The scan preview uploads the captured or selected image automatically. It shows a loading HUD, error/retry state, and an expandable diagnosis card when the API responds.

SnapFix first verifies that Vision can diagnose the image with at least 70% confidence. A lower-confidence image returns only a specific missing-information request and a suggested replacement photo; repair steps and follow-up chat stay unavailable until the replacement image passes triage.

Follow-up questions are scoped to the current scan session. SnapFix sends the original diagnosis, prior chat messages, and the new question to the API—never the image again.

The expanded diagnosis card provides quick actions for fault location, cause, DIY suitability, cost, safety, and replacement parts. Each action uses the same session-only follow-up API, and free-form chat remains available below the actions.

## Backend

The Express API lives in [`server/`](./server). See [`server/README.md`](./server/README.md) for setup and the `POST /api/diagnoses` image-upload endpoint.
