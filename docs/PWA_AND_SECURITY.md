# PWA and AI security notes

## AI endpoint

The browser never receives a Gemini or OpenAI API key. Unknown waste identification is sent to `/.netlify/functions/identify-waste`, where `GEMINI_API_KEY` is read from Netlify environment variables.

The function validates text length, image MIME type and image size, applies a request timeout, returns normalized JSON and hides provider internals from the client. This is not a complete abuse-prevention system; production protection should add Netlify rate limiting, bot protection or a server-side quota store.

Legacy API keys formerly stored in localStorage are removed on app startup and are no longer used.

## Service worker lifecycle

The service worker does not call `skipWaiting()` during install. A new worker stays waiting, the app shows one update prompt, and only after confirmation sends `SKIP_WAITING`. The page reloads once on `controllerchange`.

HTML navigation uses network-first caching with an offline fallback. Static same-origin assets use stale-while-revalidate. Function calls and non-GET requests are not cached.

## Notifications

Web service workers cannot reliably run `setInterval` in the background. The app therefore does not promise exact-time reminders. It checks the collection schedule while the app is open and supports `periodicSync` only as progressive enhancement. Reliable future push reminders require a server-side Web Push implementation.

## Schedule source

`wasteSchedule.json` is the single authoritative collection schedule. `wasteSchedule.ts` imports it for UI helpers, and `npm run validate:schedule` checks duplicates, date format and sorting.
