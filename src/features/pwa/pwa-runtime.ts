export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

interface PwaRuntimeCallbacks {
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
}

export interface PwaServiceWorkerRuntime {
  registration: Promise<ServiceWorkerRegistration>;
  update: () => Promise<void>;
  applyUpdate: () => Promise<boolean>;
  dispose: () => void;
}

export function registerPwaServiceWorker(
  callbacks: PwaRuntimeCallbacks = {},
): PwaServiceWorkerRuntime | null {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

  const serviceWorker = navigator.serviceWorker;
  let disposed = false;
  let reloadRequested = false;
  let hasReloaded = false;

  const onControllerChange = () => {
    if (disposed || !reloadRequested || hasReloaded) return;
    hasReloaded = true;
    reloadRequested = false;
    window.location.reload();
  };

  serviceWorker.addEventListener("controllerchange", onControllerChange);
  const registration = serviceWorker.register("/sw.js", { scope: "/" });

  const notifyIfUpdateIsWaiting = (current: ServiceWorkerRegistration) => {
    if (!disposed && current.waiting && serviceWorker.controller) {
      callbacks.onUpdateAvailable?.(current);
    }
  };

  void registration.then((current) => {
    notifyIfUpdateIsWaiting(current);
    current.addEventListener("updatefound", () => {
      const installing = current.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed") notifyIfUpdateIsWaiting(current);
      });
    });
  }).catch(() => undefined);

  return {
    registration,
    update: async () => {
      const current = await registration;
      await current.update();
    },
    applyUpdate: async () => {
      const current = await registration;
      if (!current.waiting) return false;
      reloadRequested = true;
      current.waiting.postMessage({ type: "SKIP_WAITING" });
      return true;
    },
    dispose: () => {
      disposed = true;
      serviceWorker.removeEventListener("controllerchange", onControllerChange);
    },
  };
}
