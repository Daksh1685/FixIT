
# FixiT

FixiT is an AI-assisted mobile device-inspection app that helps users understand visible hardware issues from a camera capture or gallery image. It gives a careful visual assessment, highlights a suspected component only when a fault is visibly present, and supports follow-up questions without re-uploading the image.

## What is the problem statement?

When a device stops working or appears damaged, users often do not know what part to inspect, whether a repair is safe, or whether professional help is necessary. Finding reliable information can involve searching through manuals, videos, and repair forums, while a wrong diagnosis can waste time, money, or create a safety risk. FixiT makes the first inspection step faster by turning a photo of a device into a clear, cautious repair-oriented assessment.

## What is the intuition behind this project?

Most people already reach for their phone camera when they notice a damaged connector, an error light, a loose component, or an unusual physical change. FixiT uses that natural behavior as its starting point: capture what you see, let a vision model interpret only the visible evidence, and present the result in simple language. The app is intentionally conservative: if no clear defect is visible, it reports that no visible fault was detected instead of inventing a repair problem.

## What technology stack is used in this project?

- **Mobile app:** React Native, Expo, and TypeScript.
- **Device input:** Expo Camera for live capture and Expo Image Picker for gallery selection.
- **UI and interactions:** React Native Animated, Expo Haptics, and a dark, mobile-first HUD interface.
- **Networking:** Axios with reusable API service modules.
- **Backend:** Node.js, Express, and TypeScript, organized into controllers, routes, services, prompts, and schemas.
- **Image handling:** Multer accepts one image and Sharp compresses it before analysis.
- **AI:** Google Gemini Vision through `@google/genai`, with schema-guided JSON responses and Zod validation before a result reaches the app.
- **Deployment:** Render hosts the API; Expo Application Services builds the Android APK.

## How will this be helpful?

FixiT gives users an accessible first layer of troubleshooting before they attempt a repair or visit a service center. It can help them:

- Identify visibly damaged or suspicious components more quickly.
- Understand likely causes, safe first checks, and basic repair steps.
- Avoid unnecessary repairs when an image shows no visible fault.
- Ask context-aware follow-up questions about cost, safety, replacement parts, and repair difficulty without uploading the same image again.
- Make more informed decisions about whether a DIY repair is appropriate or professional support is safer.

The app does not replace a technician. It is designed to provide cautious guidance, especially for visible issues, and to encourage safe handling of electrical, battery, liquid, or heat-related risks.

## What are the future work opportunities?

- Add support for multi-image inspections, such as front, back, connector, and error-screen views.
- Let users describe symptoms alongside the image for more accurate functional diagnoses.
- Build device-specific repair guides, part compatibility checks, and verified service-manual references.
- Add repair-cost estimates based on region, device age, and available parts.
- Improve on-device quality checks for blur, glare, and framing before an image is sent for analysis.
- Add repair history, saved assessments, and optional user accounts with privacy controls.
- Introduce technician escalation or marketplace integrations for issues that require professional repair.
