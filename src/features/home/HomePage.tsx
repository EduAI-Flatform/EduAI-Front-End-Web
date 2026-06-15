import { BrainCircuit, GraduationCap, Library } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Loading } from "../../components/ui/loading";
import { Modal } from "../../components/ui/modal";

const highlights = [
  {
    title: "Học tập số",
    description: "Khóa học, bài học, ghi danh và theo dõi tiến độ cho MVP.",
    icon: GraduationCap,
  },
  {
    title: "Trợ lý AI",
    description: "Điểm vào rõ ràng cho gia sư, tóm tắt, bài kiểm tra và flashcard.",
    icon: BrainCircuit,
  },
  {
    title: "Thư viện số",
    description: "Nền tảng cho tài nguyên học tập có thể tìm kiếm và lưu trữ.",
    icon: Library,
  },
];

export function HomePage() {
  return (
    <section className="container grid gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
      <div className="flex flex-col justify-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Nền tảng EduAI
        </p>
        <h1 className="mt-3 max-w-3xl font-heading text-4xl font-bold leading-tight text-foreground sm:text-5xl">
          Không gian học tập ứng dụng AI cho MVP một tenant.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          Giao diện responsive sẵn sàng cho định danh, khóa học, thư viện,
          cộng đồng, lớp học, chứng chỉ và các mô-đun AI.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button>Khám phá khóa học</Button>
          <Modal
            description="Thành phần modal nền tảng cho xác nhận, biểu mẫu và thao tác tập trung."
            title="Design system đã sẵn sàng"
            trigger={<Button variant="outline">Mở modal</Button>}
          >
            <div className="grid gap-4">
              <Input placeholder="Địa chỉ email" type="email" />
              <Loading label="Đang kiểm tra khả dụng" />
            </div>
          </Modal>
        </div>
      </div>

      <div className="grid gap-4">
        {highlights.map((item) => {
          const Icon = item.icon;

          return (
            <article
              className="rounded-2xl border bg-card p-5 text-card-foreground shadow-sm"
              key={item.title}
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-muted p-3 text-primary">
                  <Icon aria-hidden="true" className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
