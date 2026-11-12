import { useSystemMessages } from '@/features/platform/SystemText';
import { Bot, X } from "lucide-react";
import "./AssistantToggle.css";

interface AssistantToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function AssistantToggle({ isOpen, onToggle }: AssistantToggleProps) {
  const messageForUi = useSystemMessages();
  return (
    <button
      aria-expanded={isOpen}
      aria-label={isOpen ? messageForUi("Đóng trợ lý AI") : messageForUi("Mở trợ lý AI")}
      className="assistant-toggle"
      onClick={onToggle}
      title={isOpen ? messageForUi("Đóng trợ lý AI") : messageForUi("Mở trợ lý AI")}
      type="button"
    >
      {isOpen ? <X aria-hidden="true" /> : <Bot aria-hidden="true" />}
    </button>
  );
}
