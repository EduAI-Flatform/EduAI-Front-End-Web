import { SystemText, useSystemMessages } from '@/features/platform/SystemText';
import { RefreshCw } from "lucide-react";
import { usePwa } from "./pwa-context";

export function PwaUpdatePrompt() {
  const messageForUi = useSystemMessages();
  const { applyUpdate, isUpdating, updateAvailable } = usePwa();
  if (!updateAvailable) return null;

  return (
    <aside aria-live="polite" aria-label={messageForUi("Cập nhật GDS")} className="pwa-update-prompt" role="status">
      <div>
        <strong><SystemText message={"Đã có phiên bản GDS mới."} /></strong>
        <p><SystemText message={"Cập nhật để dùng các thay đổi mới nhất."} /></p>
      </div>
      <button disabled={isUpdating} onClick={() => void applyUpdate()} type="button">
        <RefreshCw aria-hidden="true" />
        <span>{isUpdating ? <SystemText message={"Đang cập nhật…"} /> : <SystemText message={"Cập nhật"} />}</span>
      </button>
    </aside>
  );
}
