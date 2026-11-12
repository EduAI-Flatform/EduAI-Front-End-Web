import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiClient } from "../../services/api-client";
import { DEFAULT_PLATFORM_SETTINGS } from "./platform.defaults";
import { applyBrandPalette } from "./brand-palette";
import { SYSTEM_MESSAGES } from "./system-messages";

export type Locale = "vi" | "en";
export type PlatformSettings = typeof DEFAULT_PLATFORM_SETTINGS;
const LOCALE_KEY = "gds.locale.v1";
function readLocale(): Locale {
  try {
    return localStorage.getItem(LOCALE_KEY) === "en" ? "en" : "vi";
  } catch {
    return "vi";
  }
}
interface PlatformContextValue {
  settings: PlatformSettings;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (vi: string, en?: string) => string;
}
const PlatformContext = createContext<PlatformContextValue>({
  settings: DEFAULT_PLATFORM_SETTINGS,
  locale: "vi",
  setLocale: () => {},
  t: (vi) => vi,
});
export function PlatformProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PlatformSettings>(
    DEFAULT_PLATFORM_SETTINGS,
  );
  const [locale, updateLocale] = useState<Locale>(readLocale);
  useEffect(() => {
    applyBrandPalette(
      settings.branding.colors ?? DEFAULT_PLATFORM_SETTINGS.branding.colors,
    );
  }, [settings.branding.colors]);
  const setLocale = useCallback((value: Locale) => {
    document.documentElement.lang = value;
    try {
      localStorage.setItem(LOCALE_KEY, value);
    } catch {
      /* preference remains in memory */
    }
    updateLocale(value);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCALE_KEY) updateLocale(readLocale());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [locale]);
  useEffect(() => {
    let active = true;
    const load = () => {
      apiClient
        .get<{ settings: Partial<PlatformSettings> }>("/platform/settings")
        .then((response) => {
          if (active)
            setSettings((previous) => ({ ...previous, ...response.settings }));
        })
        .catch(() => {
          /* Keep last-known presentation; financial flags are not inferred. */
        });
    };
    load();
    const timer = window.setInterval(load, 60000);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, []);
  const value = useMemo(
    () => ({
      settings,
      locale,
      setLocale,
      t: (vi: string, en?: string) => (locale === "en" ? (en ?? SYSTEM_MESSAGES[vi] ?? vi) : vi),
    }),
    [settings, locale, setLocale],
  );
  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}
export function usePlatform() {
  return useContext(PlatformContext);
}
export function formatPlatformMoney(
  amount: number,
  currency: string,
  locale: Locale,
) {
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
    style: "currency",
    currency,
  }).format(amount);
}
