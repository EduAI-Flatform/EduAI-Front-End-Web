import { Bot, FileText, HelpCircle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import "./AiHubSection.css";

const aiActions = [
  { label: "Gia sư AI", icon: Bot, tone: "gradient", path: "/dashboard/ai" },
  { label: "Tóm tắt AI", icon: FileText, tone: "secondary", path: "/dashboard/ai/tools" },
  { label: "AI Quiz", icon: HelpCircle, tone: "success", path: "/dashboard/ai/tools" },
  { label: "Flashcards", icon: Sparkles, tone: "danger", path: "/dashboard/ai/tools" },
];

export function AiHubSection() {
  return (
    <section className="student-dashboard__section">
      <h2 className="student-dashboard__standalone-title">Trung tâm AI</h2>
      <div className="student-dashboard__ai-grid">
        {aiActions.map((action) => {
          const Icon = action.icon;

          return (
            <Link className="student-dashboard__ai-action" key={action.label} to={action.path}>
              <span className={`student-dashboard__ai-icon student-dashboard__ai-icon--${action.tone}`}>
                <Icon aria-hidden="true" />
              </span>
              <span>{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
