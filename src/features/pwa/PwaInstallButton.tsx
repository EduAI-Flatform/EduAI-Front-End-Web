import { SystemText } from '@/features/platform/SystemText';
import { Download } from "lucide-react";
import { Modal } from "../../components/ui/modal";
import { usePwa } from "./pwa-context";
import { PwaInstallGuide } from "./PwaInstallGuide";
import { usePlatform } from "../platform/PlatformProvider";

interface PwaInstallButtonProps {
  className?: string;
}

export function PwaInstallButton({ className = "" }: PwaInstallButtonProps) {
  const { t } = usePlatform();
  const { canInstall, install, platform, showInstallEntry } = usePwa();
  if (!showInstallEntry) return null;

  const button = (
    <button
      aria-haspopup={canInstall ? undefined : "dialog"}
      aria-label={t("Cài đặt GDS", "Install GDS")}
      className={`pwa-install-button ${className}`.trim()}
      onClick={canInstall ? () => void install() : undefined}
      type="button"
    >
      <Download aria-hidden="true" className="pwa-install-button__icon" />
      <span><SystemText message={"Tải ứng dụng web"} /></span>
    </button>
  );

  if (canInstall) return button;

  return (
    <Modal
      description={t("Truy cập GDS nhanh hơn ngay từ thiết bị của bạn.", "Access GDS directly from your device.")}
      title={platform === "ios" ? t("Cài GDS trên iPhone/iPad", "Install GDS on iPhone/iPad") : t("Cài đặt GDS", "Install GDS")}
      trigger={button}
    >
      <PwaInstallGuide platform={platform} />
    </Modal>
  );
}
