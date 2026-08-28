import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { PwaInstallPrompt } from "./PwaInstallPrompt";
import { PwaOfflineNotice } from "./PwaOfflineNotice";
import { PwaUpdatePrompt } from "./PwaUpdatePrompt";
import { PwaContext, type InstallOutcome } from "./pwa-context";
import { registerPwaServiceWorker, type BeforeInstallPromptEvent, type PwaServiceWorkerRuntime } from "./pwa-runtime";
import {
  canOfferInstall,
  detectPwaPlatform,
  isStandaloneDisplay,
  persistInstallPromptDismissed,
  readInstallPromptDismissed,
  type PwaPlatform,
} from "./pwa-utils";
import "./pwa.css";

interface PwaProviderProps extends PropsWithChildren {
  enableServiceWorker?: boolean;
}

export function PwaProvider({ children, enableServiceWorker = import.meta.env.PROD }: PwaProviderProps) {
  const [platform] = useState<PwaPlatform>(() => detectPwaPlatform());
  const [isStandalone, setIsStandalone] = useState(() => isStandaloneDisplay());
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneDisplay());
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installPromptDismissed, setInstallPromptDismissed] = useState(() =>
    readInstallPromptDismissed(),
  );
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const runtimeRef = useRef<PwaServiceWorkerRuntime | null>(null);
  const promptingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia?.("(display-mode: standalone)");
    const syncStandalone = () => {
      const next = isStandaloneDisplay(window);
      setIsStandalone(next);
      if (next) setIsInstalled(true);
    };
    syncStandalone();
    if (!mediaQuery) return undefined;
    mediaQuery.addEventListener?.("change", syncStandalone);
    return () => mediaQuery.removeEventListener?.("change", syncStandalone);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      setIsStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!enableServiceWorker) return undefined;
    const runtime = registerPwaServiceWorker({
      onUpdateAvailable: () => setUpdateAvailable(true),
    });
    runtimeRef.current = runtime;
    return () => {
      runtime?.dispose();
      runtimeRef.current = null;
    };
  }, [enableServiceWorker]);

  const install = useCallback(async (): Promise<InstallOutcome> => {
    const prompt = deferredPrompt;
    if (!prompt || promptingRef.current) return "unavailable";
    promptingRef.current = true;
    setDeferredPrompt(null);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      } else {
        persistInstallPromptDismissed();
        setInstallPromptDismissed(true);
      }
      return choice.outcome;
    } catch {
      return "unavailable";
    } finally {
      promptingRef.current = false;
    }
  }, [deferredPrompt]);

  const dismissInstallPrompt = useCallback(() => {
    persistInstallPromptDismissed();
    setInstallPromptDismissed(true);
  }, []);

  const applyUpdate = useCallback(async () => {
    setIsUpdating(true);
    try {
      const applied = await runtimeRef.current?.applyUpdate();
      if (!applied) {
        setIsUpdating(false);
        setUpdateAvailable(false);
      }
    } catch {
      setIsUpdating(false);
    }
  }, []);

  const pwaEnabled = enableServiceWorker || deferredPrompt !== null;

  const value = useMemo(
    () => ({
      platform,
      isStandalone,
      isInstalled,
      canInstall: deferredPrompt !== null,
      showInstallEntry:
        pwaEnabled &&
        canOfferInstall(platform, isStandalone || isInstalled, deferredPrompt !== null),
      isOnline,
      installPromptDismissed,
      updateAvailable,
      isUpdating,
      install,
      dismissInstallPrompt,
      applyUpdate,
    }),
    [
      applyUpdate,
      deferredPrompt,
      dismissInstallPrompt,
      install,
      installPromptDismissed,
      isInstalled,
      isOnline,
      isStandalone,
      isUpdating,
      platform,
      pwaEnabled,
      updateAvailable,
    ],
  );

  return (
    <PwaContext.Provider value={value}>
      {children}
      <PwaInstallPrompt />
      <PwaOfflineNotice />
      <PwaUpdatePrompt />
    </PwaContext.Provider>
  );
}
