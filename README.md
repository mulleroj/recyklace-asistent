# Recyklacni asistent Povrly

Jednoducha PWA pro obyvatele obce Povrly. Pomaha rychle najit, kam patri konkretni odpad, zobrazuje svozovy kalendar a funguje i po prvnim nacteni offline.

## Architecture

Aplikace nepouziva generativni AI. Vyhledavani odpadu probiha lokalne nad vestavenou databazi, fuzzy vyhledavanim a rucne pridanymi uzivatelskymi polozkami. Data uzivatele neopousteji zarizeni kvuli rozpoznavani odpadu a fotografie odpadu se neodesilaji zadnemu rozpoznavacimu poskytovateli.

Vlastni polozky, historie a lokalni statistiky zustavaji v `localStorage`. Aplikace nema UI pro zadani API klice a nema serverovy endpoint pro rozpoznavani odpadu.

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

No environment variable is required for waste recognition. If older AI-related variables still exist in Netlify project settings, they can be removed manually after this PR is merged.

## Waste schedule

`wasteSchedule.json` is the authoritative schedule source for the current application. `wasteSchedule.ts` imports it for UI helpers, notifications and validation. After edits run:

```bash
npm run validate:schedule
```

The future yearly schedule editor milestone should use versioned yearly files:

```text
public/data/schedules/2026.json
public/data/schedules/2027.json
public/data/schedules/index.json
```

Proposed yearly file:

```json
{
  "schemaVersion": 1,
  "municipality": "Povrly",
  "year": 2027,
  "updatedAt": "2026-12-15",
  "schedule": [
    {
      "date": "2027-01-06",
      "types": ["smesny"]
    },
    {
      "date": "2027-01-13",
      "types": ["plast"]
    }
  ]
}
```

Proposed index:

```json
{
  "schemaVersion": 1,
  "municipality": "Povrly",
  "availableYears": [2026, 2027],
  "defaultYear": 2027
}
```

The next milestone is `feat/yearly-schedule-editor`.

## PWA updates and offline behavior

The service worker waits for user confirmation before activating a new version. HTML is not cached as immutable, and `/service-worker.js` is served with no-store headers so browsers can discover updates.

If a user is stuck on an old version, ask them to close all app tabs and reopen the app. If needed, clear site data for `recyklace.netlify.app`.

## Notifications

The app does not promise exact-time background reminders. Browsers may stop service workers at any time. The app checks upcoming collections while open; `periodicSync` is only progressive enhancement where supported. iOS PWA notification support depends on the installed PWA, permissions and the Safari/WebKit version.
