import { createContext, useContext } from "react";
import type { PwaPlatform } from "./pwa-utils";

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

export interface PwaContextValue {
  platform: PwaPlatform;
  isStandalone: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  showInstallEntry: boolean;
  isOnline: boolean;
  installPromptDismissed: boolean;
  updateAvailable: boolean;
  isUpdating: boolean;
  install: () => Promise<InstallOutcome>;
  dismissInstallPrompt: () => void;
  applyUpdate: () => Promise<void>;
}

export const defaultPwaContext: PwaContextValue = {
  platform: "unsupported",
  isStandalone: false,
  isInstalled: false,
  canInstall: false,
  showInstallEntry: false,
  isOnline: true,
  installPromptDismissed: false,
  updateAvailable: false,
  isUpdating: false,
  install: async () => "unavailable",
  dismissInstallPrompt: () => undefined,
  applyUpdate: async () => undefined,
};

export const PwaContext = createContext<PwaContextValue>(defaultPwaContext);

export function usePwa(): PwaContextValue {
  return useContext(PwaContext);
}
