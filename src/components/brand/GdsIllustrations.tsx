import { Bot } from "lucide-react";
import { usePlatform } from "../../features/platform/PlatformProvider";
import "./GdsIllustrations.css";

export function GdsAssistantIcon() {
  const { settings } = usePlatform();
  return settings.branding.mascotUrl
    ? <img className="gds-assistant-icon" src={settings.branding.mascotUrl} alt="" loading="lazy" />
    : <Bot aria-hidden="true" />;
}
