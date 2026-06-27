import { Bot, FileQuestion, MessageSquareText, WandSparkles } from "lucide-react";
import { Link } from "react-router-dom";
import "./InstructorAiToolsSection.css";

const aiTools = [
  {
    icon: FileQuestion,
    label: "Tạo câu hỏi kiểm tra",
    description: "Sinh bộ câu hỏi từ nội dung bài học.",
  },
  {
    icon: WandSparkles,
    label: "Cải thiện học liệu",
    description: "Gợi ý cách trình bày nội dung rõ ràng hơn.",
  },
  {
    icon: MessageSquareText,
    label: "Soạn thông báo",
    description: "Chuẩn bị thông báo ngắn cho học viên.",
  },
];

export function InstructorAiToolsSection() {
  return (
    <section className="instructor-dashboard-home__panel instructor-home-ai">
      <div className="instructor-dashboard-home__panel-header">
        <div>
          <h2>Trợ lý AI</h2>
          <p>Công cụ hỗ trợ công việc giảng dạy</p>
        </div>
        <Bot aria-hidden="true" />
      </div>

      <div className="instructor-home-ai__tools">
        {aiTools.map(({ description, icon: Icon, label }) => (
          <Link key={label} to="/instructor/dashboard/ai">
            <span><Icon aria-hidden="true" /></span>
            <div>
              <h3>{label}</h3>
              <p>{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
