import { SystemText, useSystemMessages } from '@/features/platform/SystemText';
import { useEffect, useState } from "react";
import { PwaInstallButton } from "./PwaInstallButton";
import { usePwa } from "./pwa-context";

const ENGAGEMENT_DELAY_MS = 1500;

export function PwaInstallPrompt() {
  const messageForUi = useSystemMessages();
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
    <aside aria-label={messageForUi("Cài đặt GDS")} className="pwa-install-prompt" role="region">
      <div>
        <h2><SystemText message={"Cài đặt GDS"} /></h2>
        <p><SystemText message={"Truy cập GDS nhanh hơn ngay từ màn hình thiết bị."} /></p>
      </div>
      <div className="pwa-install-prompt__actions">
        <PwaInstallButton className="pwa-install-prompt__install" />
        <button className="pwa-install-prompt__dismiss" onClick={dismissInstallPrompt} type="button">
          <SystemText message={"Để sau"} />
        </button>
      </div>
    </aside>
  );
}
