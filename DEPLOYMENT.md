# Deployment Checklist - Recyklace Asistent

## Current Scope

Recyklace Asistent is a local-first React PWA. Waste lookup runs in the browser from the bundled database, fuzzy search and user-added local records.

The app does not require waste-recognition API keys, serverless identification functions or camera permissions.

## Netlify Build

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Environment Variables

No environment variable is required for waste recognition.

If old project settings still contain AI-related variables from earlier versions, remove them manually after this PR is merged.

## Deployment Workflow

Each push to the configured deployment branch triggers a Netlify deploy.

```bash
git add .
git commit -m "Describe the change"
git push
```

## PWA Notes

- Service worker caches the app shell and same-origin static assets.
- HTML is fetched network-first so updates are discoverable.
- A waiting service worker activates only after user confirmation.
- `/service-worker.js` is served with `Cache-Control: no-store`.
- Notifications are used only for waste collection reminders.

## Security Notes

- Do not commit local environment files.
- Keep Netlify headers in `netlify.toml`.
- Camera permission is disabled; microphone permission is used only for voice-to-text input in supported browsers.

## Reset

Use `/reset.html` to clear cached PWA state during manual troubleshooting.
