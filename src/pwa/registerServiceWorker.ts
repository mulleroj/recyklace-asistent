export type ServiceWorkerUpdateHandler = (worker: ServiceWorker) => void;

let registered = false;

export function registerServiceWorker(onUpdate?: ServiceWorkerUpdateHandler): () => void {
  if (registered || !('serviceWorker' in navigator)) return () => undefined;
  registered = true;

  let updateInterval: number | undefined;
  let reloadedForUpdate = false;
  const listeners: Array<() => void> = [];

  const watchRegistration = (registration: ServiceWorkerRegistration) => {
    const checkWaiting = () => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        window.dispatchEvent(new CustomEvent('sw-update-available', { detail: registration.waiting }));
        onUpdate?.(registration.waiting);
      }
    };

    const handleUpdateFound = () => {
      const worker = registration.installing;
      if (!worker) return;
      const handleStateChange = () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('sw-update-available', { detail: worker }));
          onUpdate?.(worker);
        }
      };
      worker.addEventListener('statechange', handleStateChange);
    };

    checkWaiting();
    registration.addEventListener('updatefound', handleUpdateFound);
    updateInterval = window.setInterval(() => registration.update().catch(() => undefined), 30 * 60 * 1000);
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') registration.update().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    listeners.push(() => registration.removeEventListener('updatefound', handleUpdateFound));
    listeners.push(() => document.removeEventListener('visibilitychange', visibilityHandler));
  };

  navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
    .then(watchRegistration)
    .catch(() => undefined);

  const controllerChangeHandler = () => {
    if (reloadedForUpdate) return;
    reloadedForUpdate = true;
    window.location.reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler);
  listeners.push(() => navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler));

  return () => {
    if (updateInterval) window.clearInterval(updateInterval);
    for (const cleanup of listeners) cleanup();
    registered = false;
  };
}
