import { useSystemMessages } from "../platform/SystemText";
import { SystemText } from "../platform/SystemText";
import { RefreshCw, WifiOff } from "lucide-react";
import { usePwa } from "./pwa-context";

export function PwaOfflineNotice() {
  const messageForUi = useSystemMessages();
  const translateUI = useSystemMessages();

  const { isOnline } = usePwa();
  if (isOnline) return null;

  return (
    <aside aria-live="assertive" aria-label={messageForUi("Trạng thái kết nối")} className="pwa-offline-notice" role="status">
      <WifiOff aria-hidden="true" className="pwa-offline-notice__icon" />
      <div>
        <strong><SystemText message={"Bạn đang ngoại tuyến"} /></strong>
        <p><SystemText message={"Không thể kết nối tới GDS. Vui lòng kiểm tra kết nối Internet và thử lại."} /></p>
      </div>
      <button aria-label={translateUI("Thử lại")} className="pwa-offline-notice__retry" onClick={() => window.location.reload()} type="button">
        <RefreshCw aria-hidden="true" />
        <span><SystemText message="Thử lại" /></span>
      </button>
    </aside>
  );
}
