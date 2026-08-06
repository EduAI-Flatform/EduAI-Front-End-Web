import { Bot, X } from "lucide-react";
import "./AssistantToggle.css";

interface AssistantToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function AssistantToggle({ isOpen, onToggle }: AssistantToggleProps) {
  return (
    <button
      aria-expanded={isOpen}
      aria-label={isOpen ? "Đóng trợ lý AI" : "Mở trợ lý AI"}
      className="assistant-toggle"
      onClick={onToggle}
      title={isOpen ? "Đóng trợ lý AI" : "Mở trợ lý AI"}
      type="button"
    >
      {isOpen ? <X aria-hidden="true" /> : <Bot aria-hidden="true" />}
    </button>
  );
}
