import { PortfolioItem, UserSkill } from "../../../../services/profile.service";

export const analyticsImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA8NB_BTIWFtQLpBrXYf8LP0TGVdxEhul3_6A6OskFpgI6IVxRFgu-i5IWuzWSN_lo1pUMlZ4gOcAQqyaEsjfl3ngnrm5j5R__QhWON5mKfkZasTt3310w1fDNwwea6EVA9qWYAWs-u0eCI-eP8XivzUilu-5go5iXvJsBoM94_Y4auLM63Dzx2FFwXnzB8Y6iR28ozFmswVq2a0i0COZL7471lMbJ_IZoVKYpB8SgRaJ4VJj6CZdmU3dJEg01c1cmu2wK_rmoKENxX";

export const certificateImage =
  "https://lh3.googleusercontent.com/aida/AP1WRLs4PSy6czQGrnqOf4RVyL-kJ26mibKkFtlG5Q8R6R2ygr3vdtJ0-AuMxmUOYM5ZhxqQ71AjKJk1up6VjVZEelt5mY9EMxZD57RGCoiH5PY_acDPTxOORAX7AJalOfn1o-lErXVKFnXE1DjhQpqN9V33WARs9YxcYdwYJ76vZARpvYbUfn4yPTqoxUB0seKkWuscBvDzLrC2U4XrTbiPVxrlk78skLWZnbpiCVRCX1hVDGpb94Sp9CJb1GS7";

export const fallbackSkills: UserSkill[] = [
  makeSkill("React", "Frontend", "Nâng cao"),
  makeSkill("NodeJS", "Backend", "Trung cấp"),
  makeSkill("SQL", "Database", "Trung cấp"),
  makeSkill("Python", "AI", "Nâng cao"),
  makeSkill("PyTorch", "AI", "Cơ bản"),
  makeSkill("TensorFlow", "AI", "Cơ bản"),
  makeSkill("Git", "Tooling", "Trung cấp"),
  makeSkill("Docker", "DevOps", "Cơ bản"),
];

export const fallbackProjects: PortfolioItem[] = [
  makeProject(
    "Simple Neural Network",
    "Triển khai mạng nơ-ron cơ bản bằng NumPy để phân loại chữ số viết tay MNIST.",
    "Python",
  ),
  makeProject(
    "AI Sentiment Analyzer",
    "Công cụ phân tích cảm xúc văn bản thời gian thực sử dụng BERT và Transformers.",
    "TypeScript",
  ),
];

export const certificates = [
  {
    title: "Machine Learning Advanced",
    issuer: "AILearn Platform",
    issuedAt: "Cấp tháng 10, 2023",
    image: certificateImage,
  },
  {
    title: "Deep Learning Specialization",
    issuer: "DeepLearning.AI",
    issuedAt: "Cấp tháng 12, 2023",
  },
];

export const learningHistory = [
  {
    time: "Hiện tại",
    title: "Bắt đầu khóa Machine Learning",
    description: "Lộ trình học AI chuyên sâu tại EduAI.",
    tone: "primary",
  },
  {
    time: "Tháng 12, 2023",
    title: "Hoàn thành Project 1",
    description: "Xây dựng ứng dụng dự đoán giá nhà.",
    tone: "secondary",
  },
  {
    time: "Tháng 11, 2023",
    title: "Đạt chứng chỉ AI Ethics",
    description: "Vượt qua bài kiểm tra đạo đức trí tuệ nhân tạo.",
    tone: "success",
  },
];

function makeSkill(name: string, category: string, level: string): UserSkill {
  return {
    id: name,
    userId: "demo",
    name,
    category,
    level,
    createdAt: "",
    updatedAt: "",
  };
}

function makeProject(
  title: string,
  description: string,
  category: string,
): PortfolioItem & { category?: string } {
  return {
    id: title,
    userId: "demo",
    title,
    description,
    projectUrl: "#",
    imageUrl: null,
    startDate: null,
    endDate: null,
    createdAt: "",
    updatedAt: "",
    deletedAt: null,
    category,
  };
}
