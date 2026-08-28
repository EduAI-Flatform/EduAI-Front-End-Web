import { Download } from "lucide-react";
import { Modal } from "../../components/ui/modal";
import { usePwa } from "./pwa-context";
import { PwaInstallGuide } from "./PwaInstallGuide";

interface PwaInstallButtonProps {
  className?: string;
}

export function PwaInstallButton({ className = "" }: PwaInstallButtonProps) {
  const { canInstall, install, platform, showInstallEntry } = usePwa();
  if (!showInstallEntry) return null;

  const button = (
    <button
      aria-haspopup={canInstall ? undefined : "dialog"}
      aria-label="Cài đặt EduAI"
      className={`pwa-install-button ${className}`.trim()}
      onClick={canInstall ? () => void install() : undefined}
      type="button"
    >
      <Download aria-hidden="true" className="pwa-install-button__icon" />
      <span>Cài EduAI</span>
    </button>
  );

  if (canInstall) return button;

  return (
    <Modal
      description="Truy cập EduAI nhanh hơn ngay từ thiết bị của bạn."
      title={platform === "ios" ? "Cài EduAI trên iPhone/iPad" : "Cài đặt EduAI"}
      trigger={button}
    >
      <PwaInstallGuide platform={platform} />
    </Modal>
  );
}
