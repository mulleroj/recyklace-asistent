// Service Worker pro Recyklační Asistent
// Verze 7 - oprava white screen issues: Network First pro HTML, lepší lifecycle, SKIP_WAITING podpora

const CACHE_NAME = 'recyklace-asistent-v7';

// Výchozí preference pro notifikace
const DEFAULT_PREFS = {
  enabled: false,
  daysBefore: 2,
  time: '10:00',
  soundEnabled: true
};

// Only cache local assets that are safe to cache
// External CDN assets are handled dynamically in the fetch event
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// External assets to cache on first fetch (CORS-safe approach)
const EXTERNAL_ASSETS_TO_CACHE_ON_FETCH = [
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn-icons-png.flaticon.com'
];

// Waste schedule data (copy from wasteSchedule.ts for SW access)
const WASTE_SCHEDULE = [
  { date: "2026-01-07", types: ["smesny"] },
  { date: "2026-01-14", types: ["plast"] },
  { date: "2026-01-21", types: ["smesny"] },
  { date: "2026-01-28", types: ["papir"] },
  { date: "2026-02-04", types: ["smesny"] },
  { date: "2026-02-11", types: ["plast"] },
  { date: "2026-02-18", types: ["smesny"] },
  { date: "2026-02-25", types: ["papir"] },
  { date: "2026-03-04", types: ["smesny"] },
  { date: "2026-03-11", types: ["plast"] },
  { date: "2026-03-18", types: ["smesny"] },
  { date: "2026-03-25", types: ["papir"] },
  { date: "2026-04-01", types: ["smesny"] },
  { date: "2026-04-08", types: ["plast"] },
  { date: "2026-04-15", types: ["smesny"] },
  { date: "2026-04-22", types: ["papir"] },
  { date: "2026-04-29", types: ["smesny"] },
  { date: "2026-05-06", types: ["plast"] },
  { date: "2026-05-13", types: ["smesny"] },
  { date: "2026-05-20", types: ["papir"] },
  { date: "2026-05-27", types: ["smesny"] },
  { date: "2026-06-03", types: ["plast"] },
  { date: "2026-06-10", types: ["smesny"] },
  { date: "2026-06-17", types: ["papir"] },
  { date: "2026-06-24", types: ["smesny"] },
  { date: "2026-07-01", types: ["plast"] },
  { date: "2026-07-08", types: ["smesny"] },
  { date: "2026-07-15", types: ["papir"] },
  { date: "2026-07-22", types: ["smesny"] },
  { date: "2026-07-29", types: ["plast"] },
  { date: "2026-08-05", types: ["smesny"] },
  { date: "2026-08-12", types: ["papir"] },
  { date: "2026-08-19", types: ["smesny"] },
  { date: "2026-08-26", types: ["plast"] },
  { date: "2026-09-02", types: ["smesny"] },
  { date: "2026-09-09", types: ["papir"] },
  { date: "2026-09-16", types: ["smesny"] },
  { date: "2026-09-23", types: ["plast"] },
  { date: "2026-09-30", types: ["smesny"] },
  { date: "2026-10-07", types: ["papir"] },
  { date: "2026-10-14", types: ["smesny"] },
  { date: "2026-10-21", types: ["plast"] },
  { date: "2026-10-28", types: ["smesny"] },
  { date: "2026-11-04", types: ["papir"] },
  { date: "2026-11-11", types: ["smesny"] },
  { date: "2026-11-18", types: ["plast"] },
  { date: "2026-11-25", types: ["smesny"] },
  { date: "2026-12-02", types: ["papir"] },
  { date: "2026-12-09", types: ["smesny"] },
  { date: "2026-12-16", types: ["plast"] },
  { date: "2026-12-23", types: ["smesny"] },
  { date: "2026-12-30", types: ["papir"] },
];

const TYPE_LABELS = {
  plast: 'Plasty (žlutá)',
  papir: 'Papír (modrá)',
  sklo: 'Sklo (zelená)',
  bio: 'Bioodpad (hnědá)',
  smesny: 'Směsný odpad (černá)',
};

// Helper functions
function getNextCollection() {
  const today = new Date().toISOString().split('T')[0];
  return WASTE_SCHEDULE.find(entry => entry.date >= today) || null;
}

function getDaysUntil(targetDate) {
  const target = new Date(targetDate);
  const from = new Date(new Date().toISOString().split('T')[0]);
  const diffTime = target.getTime() - from.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// Check and show notification if needed - respects user preferences
async function checkAndNotify() {
  const prefs = await getNotificationPrefs();

  // Skip if notifications are disabled
  if (!prefs.enabled) {
    console.log('SW: Notifikace zakázány v nastavení');
    return;
  }

  const next = getNextCollection();
  if (!next) return;

  const daysUntil = getDaysUntil(next.date);
  const lastNotified = await getLastNotifiedDate();
  const today = new Date().toISOString().split('T')[0];
  const notificationKey = `${next.date}-${today}`;

  // Check if we should notify based on user's daysBefore preference
  if (daysUntil <= prefs.daysBefore && daysUntil >= 0 && lastNotified !== notificationKey) {
    const typeLabels = next.types.map(t => TYPE_LABELS[t] || t).join(', ');
    const daysText = daysUntil === 0 ? 'DNES' : daysUntil === 1 ? 'ZÍTRA' : 'POZÍTŘÍ';

    await self.registration.showNotification('🚛 Svoz odpadu ' + daysText, {
      body: `${formatDate(next.date)}\n${typeLabels}`,
      icon: 'https://cdn-icons-png.flaticon.com/512/3299/3299935.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/3299/3299935.png',
      tag: 'waste-collection',
      requireInteraction: true,
      vibrate: prefs.soundEnabled ? [200, 100, 200] : [],
      silent: !prefs.soundEnabled,
      data: { url: '/' }
    });

    await setLastNotifiedDate(notificationKey);
    console.log('SW: Notifikace odeslána pro', next.date);
  }
}

// Scheduled check - triggers notification at user's preferred time
async function scheduledCheck() {
  const prefs = await getNotificationPrefs();

  if (!prefs.enabled) return;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Check if current time matches user's preferred notification time (within 1 minute window)
  if (currentTime === prefs.time) {
    console.log('SW: Naplánovaný čas notifikace -', prefs.time);
    await checkAndNotify();
  }
}

// Start interval for scheduled checks (every minute)
let checkInterval = null;
function startScheduledChecks() {
  if (checkInterval) {
    clearInterval(checkInterval); // Clear any previous interval
  }

  checkInterval = setInterval(() => {
    scheduledCheck();
  }, 60000); // Check every minute

  console.log('SW: Spuštěny naplánované kontroly notifikací');
}

function stopScheduledChecks() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    console.log('SW: Zastaveny naplánované kontroly');
  }
}

// Preference storage functions
async function getNotificationPrefs() {
  try {
    const cache = await caches.open('notification-state');
    const response = await cache.match('notification-prefs');
    if (response) {
      const prefs = await response.json();
      return { ...DEFAULT_PREFS, ...prefs };
    }
  } catch (e) {
    console.log('SW: Chyba načítání preferencí', e);
  }
  return DEFAULT_PREFS;
}

async function saveNotificationPrefs(prefs) {
  try {
    const cache = await caches.open('notification-state');
    await cache.put('notification-prefs', new Response(JSON.stringify(prefs)));
    console.log('SW: Preference uloženy', prefs);

    // Start scheduled checks when preferences are saved with notifications enabled
    if (prefs.enabled) {
      startScheduledChecks();
    }
  } catch (e) {
    console.log('SW: Chyba ukládání preferencí', e);
  }
}

// Last notified date helpers
async function getLastNotifiedDate() {
  try {
    const cache = await caches.open('notification-state');
    const response = await cache.match('last-notified');
    if (response) {
      return await response.text();
    }
  } catch (e) { }
  return null;
}

async function setLastNotifiedDate(date) {
  try {
    const cache = await caches.open('notification-state');
    await cache.put('last-notified', new Response(date));
  } catch (e) { }
}

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Instalace - kešování souborů');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('SW: Aktivace nové verze');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== 'notification-state') {
            console.log('SW: Mazání staré keše', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Take control immediately
      return self.clients.claim();
    }).then(() => {
      // Restart scheduled checks with new version
      stopScheduledChecks();

      return getNotificationPrefs().then(prefs => {
        if (prefs.enabled) {
          startScheduledChecks();
          checkAndNotify();
        }
      });
    })
  );
});

// Fetch event - Network First for HTML, Cache First for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network First for HTML documents (navigation requests)
  if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request).then((networkResponse) => {
        // Cache the fresh HTML
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback to cache if offline
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || caches.match('/');
        });
      })
    );
    return;
  }

  // Cache First for all other assets (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        // Check if this is an external asset we want to cache
        const shouldCache = EXTERNAL_ASSETS_TO_CACHE_ON_FETCH.some(
          domain => request.url.includes(domain)
        ) || request.url.includes('esm.sh');

        if (shouldCache && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});

// Message event - for manual notification check, preference updates, and SKIP_WAITING
self.addEventListener('message', (event) => {
  if (event.data) {
    switch (event.data.type) {
      case 'CHECK_NOTIFICATIONS':
        checkAndNotify();
        break;
      case 'UPDATE_NOTIFICATION_PREFS':
        saveNotificationPrefs(event.data.prefs);
        break;
      case 'SKIP_WAITING':
        console.log('SW: SKIP_WAITING received, activating new version');
        self.skipWaiting();
        break;
    }
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window or open new one
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-waste-collection') {
    event.waitUntil(checkAndNotify());
  }
});

// Regular sync as fallback
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-waste-collection') {
    event.waitUntil(checkAndNotify());
  }
});
