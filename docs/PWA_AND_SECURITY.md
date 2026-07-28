# PWA and security notes

## AI removal decision

Generative AI was removed from the recycling assistant. The app is intended to be reliable, local-first and offline usable, so waste lookup now uses only the built-in database, fuzzy search and user-added local records.

The decision reduces risk in five areas:

- key security, because the app no longer needs third-party model credentials;
- reliability, because lookup does not depend on provider availability;
- costs and quotas, because no recognition request calls an external model;
- offline usability, because search works after the app is cached;
- predictable results, because categories come from curated data or explicit user entries.

Legacy API-key names formerly stored in localStorage are removed on app startup. The cleanup does not enable users to enter or store a new key.

## Local lookup and privacy

Waste-search text stays in the browser. The app does not send waste-search queries or photos to a recognition provider. User-added items, history and local analytics are stored in localStorage.

## Service worker lifecycle

The service worker does not call `skipWaiting()` during install. A new worker stays waiting, the app shows one update prompt, and only after confirmation sends `SKIP_WAITING`. The page reloads once on `controllerchange`.

HTML navigation uses network-first caching with an offline fallback. Static same-origin assets use stale-while-revalidate. Non-GET requests are not cached.

## Notifications

Web service workers cannot reliably run `setInterval` in the background. The app therefore does not promise exact-time reminders. It checks the collection schedule while the app is open and supports `periodicSync` only as progressive enhancement. Reliable future push reminders require a server-side Web Push implementation.

## Schedule source

`wasteSchedule.json` is the single authoritative collection schedule for the current app. `wasteSchedule.ts` imports it for UI helpers and notification logic, and `npm run validate:schedule` checks date format, impossible dates, duplicates, sorting, non-empty `types` and allowed waste types.

Future yearly schedule work should use versioned data files under `public/data/schedules/` with an index file listing available years.
