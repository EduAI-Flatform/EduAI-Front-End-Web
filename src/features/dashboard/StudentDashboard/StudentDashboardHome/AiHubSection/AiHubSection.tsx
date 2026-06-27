import { Bot, FileText, HelpCircle, Sparkles } from "lucide-react";
import "./AiHubSection.css";

const aiActions = [
  { label: "Gia sư AI", icon: Bot, tone: "gradient" },
  { label: "Tóm tắt AI", icon: FileText, tone: "secondary" },
  { label: "AI Quiz", icon: HelpCircle, tone: "success" },
  { label: "Flashcards", icon: Sparkles, tone: "danger" },
];

export function AiHubSection() {
  return (
    <section className="student-dashboard__section">
      <h2 className="student-dashboard__standalone-title">Trung tâm AI</h2>
      <div className="student-dashboard__ai-grid">
        {aiActions.map((action) => {
          const Icon = action.icon;

          return (
            <button className="student-dashboard__ai-action" key={action.label} type="button">
              <span className={`student-dashboard__ai-icon student-dashboard__ai-icon--${action.tone}`}>
                <Icon aria-hidden="true" />
              </span>
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
