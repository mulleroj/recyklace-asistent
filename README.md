# Recyklacni asistent Povrly

Jednoducha PWA pro obyvatele obce Povrly. Pomaha rychle najit, kam patri konkretni odpad, zobrazuje svozovy kalendar a funguje i po prvnim nacteni offline.

## Local development

```bash
npm ci
npm run dev
```

## Quality gates

```bash
npm run typecheck
npm run lint
npm run test:run
npm run validate:schedule
npm run build
npm run validate
```

Browser smoke:

```bash
npm run build
npm run preview
npm run smoke
```

## Netlify deployment

Build command: `npm run build`

Publish directory: `dist`

Required environment variables:

```text
GEMINI_API_KEY
```

The key must exist only in Netlify environment variables. Do not put it in `.env`, source code or client-side Vite variables.

## Waste schedule

`wasteSchedule.json` is the authoritative schedule source. After edits run:

```bash
npm run validate:schedule
```

## PWA updates and offline behavior

The service worker waits for user confirmation before activating a new version. HTML is not cached as immutable, and `/service-worker.js` is served with no-store headers so browsers can discover updates.

If a user is stuck on an old version, ask them to close all app tabs and reopen the app. If needed, clear site data for `recyklace.netlify.app`.

## Notifications

The app does not promise exact-time background reminders. Browsers may stop service workers at any time. The app checks upcoming collections while open; `periodicSync` is only progressive enhancement where supported. iOS PWA notification support depends on the installed PWA, permissions and the Safari/WebKit version.

## AI security

Unknown-item identification uses `/.netlify/functions/identify-waste`. The browser sends only the user's query or image. The server function validates input, calls Gemini with the server-side `GEMINI_API_KEY`, and returns normalized JSON without provider error details.
