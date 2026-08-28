import { RefreshCw } from "lucide-react";
import { usePwa } from "./pwa-context";

export function PwaUpdatePrompt() {
  const { applyUpdate, isUpdating, updateAvailable } = usePwa();
  if (!updateAvailable) return null;

  return (
    <aside aria-live="polite" aria-label="Cập nhật EduAI" className="pwa-update-prompt" role="status">
      <div>
        <strong>Đã có phiên bản EduAI mới.</strong>
        <p>Cập nhật để dùng các thay đổi mới nhất.</p>
      </div>
      <button disabled={isUpdating} onClick={() => void applyUpdate()} type="button">
        <RefreshCw aria-hidden="true" />
        <span>{isUpdating ? "Đang cập nhật…" : "Cập nhật"}</span>
      </button>
    </aside>
  );
}
