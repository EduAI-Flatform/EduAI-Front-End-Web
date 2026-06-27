import type { CourseLevel } from "../../services/course.service";
import type { CourseListItem } from "./course-list.types";

const now = new Date(0).toISOString();

export const stitchCourseSamples: CourseListItem[] = [
  {
    id: "stitch-machine-learning-python",
    title: "Làm chủ Machine Learning với Python",
    slug: "machine-learning-python",
    description:
      "Xây dựng nền tảng vững chắc về thuật toán học máy và ứng dụng thực tế trong doanh nghiệp.",
    thumbnailUrl:
      "https://lh3.googleusercontent.com/aida/AP1WRLscfg7VjtLM24fty7qbJe88am4DjuDGwP62laAhk8oCK4VtALfVc1m8XZdvt0cR3E-4LLBoSC332L4H7SvIHM_baP-jn2-ZJ23b_Rba-VyyzahhW-lDEs8SsDS_QatNWmfIzNMEHFW1FyxStkBHPN4mrolHNGWFtpHXcEsAfMh9Mv91Mf-nXVYrRCKT-8_iOcTUcxnTO65TdpSEluCZB3W6spq7izKrAbzB2vncHhNif_XZ8NbTnVxJVZxu",
    level: "advanced",
    status: "published",
    visibility: "public",
    createdAt: now,
    updatedAt: now,
    badge: "Bán chạy nhất",
    durationLabel: "12h Video",
    instructorName: "Kevin Hart",
    priceLabel: "1,299,000đ",
    ratingLabel: "4.9 (2,400 học viên)",
  },
  {
    id: "stitch-data-science-2024",
    title: "Data Science Toàn Diện 2024",
    slug: "data-science-2024",
    description:
      "Học cách xử lý dữ liệu lớn, phân tích thống kê và trực quan hóa dữ liệu với các công cụ hàng đầu.",
    thumbnailUrl:
      "https://lh3.googleusercontent.com/aida/AP1WRLsl2VI4T3oE-uOBHWhUWI7Gc1RaGv24VKoMtEm09VKRUJIBtD-y8ap9X7oCVXxAmQCYaUOrslftB_cPE2njrfy4bzGtDN0Y-X1PKZZ2yiw2MZERd0nxJwk9v-09N40sH4NqG-bMtfYfV_BGM9hPOwjgPy-H3MzBK2xpAYYyapqOm3qVD1GQ-64niiPUDJPeIJpzoPixQY7YpHoBAsnEZkm50t4jTOYWiEUKqztmhofZcZA9LuZlP9w6FCM",
    level: "intermediate",
    status: "published",
    visibility: "public",
    createdAt: now,
    updatedAt: now,
    durationLabel: "15h Video",
    instructorName: "Dr. Alex Rivers",
    priceLabel: "899,000đ",
    ratingLabel: "4.8 (1,800 học viên)",
  },
  {
    id: "stitch-ai-marketing",
    title: "AI Marketing & Tối ưu hóa chuyển đổi",
    slug: "ai-marketing",
    description:
      "Ứng dụng Generative AI để tối ưu hóa chiến dịch marketing, tự động hóa nội dung và tăng tỷ lệ chuyển đổi.",
    thumbnailUrl:
      "https://lh3.googleusercontent.com/aida/AP1WRLubQJ_k0aftIdp1mL3pUrUyCo9UoOl0maw1MebCfibAQ63mo_sMjE49cu06_QafTExjIRmsG2uyWGCOJ4OvcrsoTmpCjr_uJVoGx7BLxRfBzwt4iJLAxPRSnf0Um8ZTrmAfkWLp5ItUSxpbbJ5CzspXnjiA3LC6m8u5GXRLlKaQ0j-Loc5xu1fbsTGrpTL7G1JkrHLzeUPr4gPl1xJvuRbpd7D0ZBchZV6J8WP3PJf-aOeMUYNkAFb2XrY",
    level: "beginner",
    status: "published",
    visibility: "public",
    createdAt: now,
    updatedAt: now,
    durationLabel: "8h Video",
    instructorName: "Sarah Nguyen",
    priceLabel: "750,000đ",
    ratingLabel: "4.7 (950 học viên)",
  },
  {
    id: "stitch-ai-manager",
    title: "Cơ bản về AI cho Người quản lý",
    slug: "ai-for-managers",
    description:
      "Hiểu rõ các khái niệm AI để đưa ra quyết định kinh doanh chiến lược và dẫn dắt đội ngũ.",
    thumbnailUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDrm1skTMuI8VM1ISf2k8grk8FqP0BSjaHYQgqta5-arkLpLJ_W6DEdbDfivkWYyS05NAZwG9F4hBkh4Vfxnoc7q9yo4_xEbx-AD-pI5wOng3XaTytIA-06-CUhQSPaW10XNxKmlzDfTMon31zezlpxVkxq79kIkF_5HYvjUqUcT8RHCMk7y9b5ehR52ggu5CezczSAB-b706WjeJNKlMx2ybdT8pJlauU1OTq0lbg-zkscUGaTBXFnqMLkCA4yXwyGk8qct2_5r8Hz",
    level: "beginner",
    status: "published",
    visibility: "public",
    createdAt: now,
    updatedAt: now,
    durationLabel: "4h Video",
    instructorName: "Minh Tran",
    priceLabel: "850,000đ",
    ratingLabel: "4.5 (310 học viên)",
  },
  {
    id: "stitch-neural-networks",
    title: "Xây dựng Mạng Nơ-ron từ con số 0",
    slug: "neural-networks-from-zero",
    description:
      "Khám phá kiến trúc Deep Learning và tự tay triển khai các mô hình nơ-ron cơ bản bằng Python.",
    thumbnailUrl:
      "https://lh3.googleusercontent.com/aida/AP1WRLscfg7VjtLM24fty7qbJe88am4DjuDGwP62laAhk8oCK4VtALfVc1m8XZdvt0cR3E-4LLBoSC332L4H7SvIHM_baP-jn2-ZJ23b_Rba-VyyzahhW-lDEs8SsDS_QatNWmfIzNMEHFW1FyxStkBHPN4mrolHNGWFtpHXcEsAfMh9Mv91Mf-nXVYrRCKT-8_iOcTUcxnTO65TdpSEluCZB3W6spq7izKrAbzB2vncHhNif_XZ8NbTnVxJVZxu",
    level: "advanced",
    status: "published",
    visibility: "public",
    createdAt: now,
    updatedAt: now,
    durationLabel: "12h Video",
    instructorName: "Kevin Hart",
    priceLabel: "1,150,000đ",
    ratingLabel: "4.9 (1.2k)",
  },
  {
    id: "stitch-sql-python",
    title: "Phân tích dữ liệu với SQL & Python",
    slug: "sql-python-data-analysis",
    description:
      "Bộ kỹ năng thiết yếu để trở thành Data Analyst thực thụ trong môi trường doanh nghiệp hiện đại.",
    thumbnailUrl:
      "https://lh3.googleusercontent.com/aida/AP1WRLsl2VI4T3oE-uOBHWhUWI7Gc1RaGv24VKoMtEm09VKRUJIBtD-y8ap9X7oCVXxAmQCYaUOrslftB_cPE2njrfy4bzGtDN0Y-X1PKZZ2yiw2MZERd0nxJwk9v-09N40sH4NqG-bMtfYfV_BGM9hPOwjgPy-H3MzBK2xpAYYyapqOm3qVD1GQ-64niiPUDJPeIJpzoPixQY7YpHoBAsnEZkm50t4jTOYWiEUKqztmhofZcZA9LuZlP9w6FCM",
    level: "intermediate",
    status: "published",
    visibility: "public",
    createdAt: now,
    updatedAt: now,
    durationLabel: "10h Video",
    instructorName: "Sarah Nguyen",
    priceLabel: "950,000đ",
    ratingLabel: "4.6 (540)",
  },
  {
    id: "stitch-prompt-engineering",
    title: "Prompt Engineering cho Sáng tạo Nội dung",
    slug: "prompt-engineering-content",
    description:
      "Làm chủ nghệ thuật đặt câu lệnh để khai thác tối đa sức mạnh của ChatGPT, Midjourney và Claude.",
    thumbnailUrl:
      "https://lh3.googleusercontent.com/aida/AP1WRLubQJ_k0aftIdp1mL3pUrUyCo9UoOl0maw1MebCfibAQ63mo_sMjE49cu06_QafTExjIRmsG2uyWGCOJ4OvcrsoTmpCjr_uJVoGx7BLxRfBzwt4iJLAxPRSnf0Um8ZTrmAfkWLp5ItUSxpbbJ5CzspXnjiA3LC6m8u5GXRLlKaQ0j-Loc5xu1fbsTGrpTL7G1JkrHLzeUPr4gPl1xJvuRbpd7D0ZBchZV6J8WP3PJf-aOeMUYNkAFb2XrY",
    level: "beginner",
    status: "published",
    visibility: "public",
    createdAt: now,
    updatedAt: now,
    durationLabel: "6h Video",
    instructorName: "Alex Rivers",
    priceLabel: "690,000đ",
    ratingLabel: "4.8 (820)",
  },
];

export function isSampleCourse(courseId: string): boolean {
  return stitchCourseSamples.some((course) => course.id === courseId);
}
