import { RefreshCw, WifiOff } from "lucide-react";
import { usePwa } from "./pwa-context";

export function PwaOfflineNotice() {
  const { isOnline } = usePwa();
  if (isOnline) return null;

  return (
    <aside aria-live="assertive" aria-label="Trạng thái kết nối" className="pwa-offline-notice" role="status">
      <WifiOff aria-hidden="true" className="pwa-offline-notice__icon" />
      <div>
        <strong>Bạn đang ngoại tuyến</strong>
        <p>Không thể kết nối tới EduAI. Vui lòng kiểm tra kết nối Internet và thử lại.</p>
      </div>
      <button aria-label="Thử lại" className="pwa-offline-notice__retry" onClick={() => window.location.reload()} type="button">
        <RefreshCw aria-hidden="true" />
        <span>Thử lại</span>
      </button>
    </aside>
  );
}
