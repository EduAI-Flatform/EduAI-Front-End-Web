import { useSystemMessages } from '@/features/platform/SystemText';
import { usePlatform } from "../../features/platform/PlatformProvider";
import "./GdsBrand.css";

/** One official brand asset shared by public, authentication and dashboard shells. */
export function GdsBrand({ className = "" }: { className?: string }) {
  const messageForUi = useSystemMessages();
  const { settings } = usePlatform();
  return (
    <img
      alt={settings.branding.name || messageForUi("GDS — Giáo dục số")}
      className={`gds-brand ${className}`.trim()}
      height={64}
      src={settings.branding.logoUrl || "/gds-logo.png"}
      width={64}
    />
  );
}
