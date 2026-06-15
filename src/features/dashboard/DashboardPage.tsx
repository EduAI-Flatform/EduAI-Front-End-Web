import {
  Award,
  BookOpenCheck,
  BrainCircuit,
  CalendarClock,
  PlayCircle,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuthSession } from "../auth/auth-store";

const stats = [
  {
    label: "Khóa học đang học",
    value: "03",
    icon: BookOpenCheck,
  },
  {
    label: "Tiến độ trung bình",
    value: "68%",
    icon: PlayCircle,
  },
  {
    label: "Lớp sắp tới",
    value: "02",
    icon: CalendarClock,
  },
  {
    label: "Chứng chỉ",
    value: "01",
    icon: Award,
  },
];

export function DashboardPage() {
  const session = useAuthSession();
  const firstName = session?.user.fullName?.split(" ")[0] ?? "bạn";

  return (
    <section className="container grid gap-6 py-6 sm:py-8 lg:py-10">
      <div className="grid gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div>
          <p className="text-sm font-semibold text-primary">Dashboard học tập</p>
          <h1 className="mt-2 font-heading text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            Chào {firstName}, tiếp tục lộ trình EduAI của bạn.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Theo dõi khóa học, lớp trực tuyến, chứng chỉ và các gợi ý AI trong
            một không gian học tập gọn gàng.
          </p>
        </div>
        <div className="rounded-2xl bg-muted p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <BrainCircuit aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Trợ lý AI</p>
              <p className="text-xs leading-5 text-muted-foreground">
                Sẵn sàng hỗ trợ tóm tắt bài học và luyện tập.
              </p>
            </div>
          </div>
          <Button className="mt-4 w-full" type="button">
            Mở trợ lý AI
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <article
              className="rounded-2xl border bg-card p-4 shadow-sm"
              key={item.label}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {item.value}
                  </p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-primary">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Khóa học hiện tại
          </h2>
          <div className="mt-4 grid gap-4">
            <div className="rounded-xl border bg-background p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">
                    Nền tảng AI ứng dụng
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Bài tiếp theo: Prompting cho học tập cá nhân hóa
                  </p>
                </div>
                <Button type="button">Tiếp tục học</Button>
              </div>
              <div className="mt-4 h-2 rounded-full bg-muted">
                <div className="h-2 w-2/3 rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Hoạt động gần đây
          </h2>
          <ul className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <li className="rounded-xl bg-muted p-3">
              Hoàn thành bài học nhập môn AI.
            </li>
            <li className="rounded-xl bg-muted p-3">
              Đã lưu tài nguyên “Neural Networks cơ bản”.
            </li>
            <li className="rounded-xl bg-muted p-3">
              Lớp trực tuyến tiếp theo bắt đầu lúc 19:30.
            </li>
          </ul>
        </article>
      </div>
    </section>
  );
}
