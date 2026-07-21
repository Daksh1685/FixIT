# FixiT API

TypeScript Express service for visual device diagnosis. It accepts one uploaded image, normalizes it with Sharp before inference, and calls the Gemini API with structured JSON output. The model response is then parsed and validated with Zod before it is returned to the client.

## Setup

```sh
cd server
npm install
Copy-Item .env.example .env
# Set GEMINI_API_KEY in .env
npm run dev
```

The API listens on `http://localhost:3001` by default.

## Stable mobile deployment (Render)

For a phone build that does not depend on your PC's changing LAN address, deploy the API using the root [`render.yaml`](../render.yaml) Blueprint:

1. Push this project to a private GitHub repository and create a new Blueprint on Render from that repository.
2. Set `GEMINI_API_KEY` in Render's Environment settings. Do not commit the key.
3. Once the deploy is healthy at its `https://...onrender.com` URL, set that URL as `EXPO_PUBLIC_API_URL` for the mobile preview build and create one replacement APK.

Render provides the public HTTPS URL and passes its `PORT` environment variable to this server automatically.

## Endpoint

`POST /api/diagnoses`

Send multipart form-data with exactly one `image` field. Accepted formats are JPEG, PNG, WebP, HEIC, and HEIF; the upload limit is 10 MB.

```sh
curl -X POST http://localhost:3001/api/diagnoses -F "image=@device.jpg"
```

A successful response is the validated diagnosis object:

```json
{
  "device": "Smartphone",
  "brand": "Unknown",
  "model": "Unknown",
  "issue": "Cracked display glass",
  "confidence": "medium",
  "causes": ["Impact damage"],
  "fix_steps": ["Power off the device before arranging a screen repair."],
  "highlight": { "x": 0.42, "y": 0.58, "width": 0.15, "height": 0.1, "label": "Damaged display" },
  "safety_note": "Do not use a damaged battery or a device that becomes hot."
}
```

`highlight.x` and `highlight.y` are normalized top-left coordinates in the original source image. `width` and `height` are normalized dimensions; all values are between 0 and 1.

When the image is insufficient for a 70% confidence diagnosis, the service deliberately skips repair generation and returns only:

```json
{
  "confidence": "low",
  "missing_information": "The device's error indicator is not visible.",
  "suggested_photo": "Move closer to the blinking LED and capture it in focus."
}
```

Errors use an HTTP status code and an `{ "error": { "code", "message" } }` body. `GET /health` returns the service health status.

## Diagnosis follow-up

`POST /api/diagnoses/follow-up` accepts JSON only—never an image. The mobile app sends the original diagnosis, the in-memory conversation history, and the new question. Nothing is persisted.

```json
{
  "diagnosis": { "device": "Smartphone", "brand": "Unknown", "model": "Unknown", "issue": "Cracked display glass", "confidence": "medium", "causes": ["Impact damage"], "fix_steps": ["Power off the device."], "highlight": { "x": 0.42, "y": 0.58, "width": 0.15, "height": 0.1, "label": "Damaged display" }, "safety_note": "Avoid heat." },
  "messages": [{ "role": "user", "content": "Can I still use it?" }],
  "question": "What should I do before repair?"
}
```
