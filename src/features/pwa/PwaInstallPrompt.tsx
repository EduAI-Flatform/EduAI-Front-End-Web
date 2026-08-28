import { useEffect, useState } from "react";
import { PwaInstallButton } from "./PwaInstallButton";
import { usePwa } from "./pwa-context";

const ENGAGEMENT_DELAY_MS = 1500;

export function PwaInstallPrompt() {
  const { dismissInstallPrompt, installPromptDismissed, showInstallEntry } = usePwa();
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    if (!showInstallEntry || installPromptDismissed) {
      setEngaged(false);
      return undefined;
    }

    const timer = window.setTimeout(() => setEngaged(true), ENGAGEMENT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [installPromptDismissed, showInstallEntry]);

  if (!engaged || !showInstallEntry || installPromptDismissed) return null;

  return (
    <aside aria-label="Cài đặt EduAI" className="pwa-install-prompt" role="region">
      <div>
        <h2>Cài đặt EduAI</h2>
        <p>Truy cập EduAI nhanh hơn ngay từ màn hình thiết bị.</p>
      </div>
      <div className="pwa-install-prompt__actions">
        <PwaInstallButton className="pwa-install-prompt__install" />
        <button className="pwa-install-prompt__dismiss" onClick={dismissInstallPrompt} type="button">
          Để sau
        </button>
      </div>
    </aside>
  );
}
