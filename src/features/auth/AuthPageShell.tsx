import { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface AuthPageShellProps {
  children: ReactNode;
  description: string;
  mode: "login" | "register";
  title: string;
}

export function AuthPageShell({
  children,
  description,
  mode,
  title,
}: AuthPageShellProps) {
  const isRegister = mode === "register";

  return (
    <section className="min-h-screen bg-[#faf8ff] text-[#131b2e]">
      <div className="mx-auto grid min-h-screen w-full max-w-5xl lg:grid-cols-2">
        <aside
          className={cn(
            "relative hidden min-h-screen overflow-hidden px-8 py-8 lg:flex lg:flex-col",
            isRegister
              ? "bg-gradient-to-br from-[#0058be] via-[#334ee8] to-[#6b38d4] text-white"
              : "bg-[#eff2ff] text-[#131b2e]",
          )}
        >
          {!isRegister ? (
            <div className="max-w-sm">
              <h2 className="font-heading text-4xl font-extrabold leading-tight text-[#0058be]">
                Học tập thông minh cùng AI
              </h2>
              <p className="mt-4 text-sm leading-6 text-[#424754]">
                Khám phá lộ trình học tập cá nhân hóa và sự hỗ trợ từ trợ lý AI
                thế hệ mới.
              </p>
            </div>
          ) : null}

          <div
            className={cn(
              "relative mt-8 flex flex-1 items-center justify-center rounded-2xl border p-5 shadow-2xl",
              isRegister
                ? "border-white/35 bg-white/95"
                : "border-white bg-white/75",
            )}
          >
            <LearningIllustration />
          </div>

          {isRegister ? (
            <div className="mt-7">
              <h2 className="font-heading text-2xl font-bold">
                Khám phá tương lai của giáo dục
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/85">
                Tham gia cùng học viên đang ứng dụng AI để tối ưu hóa lộ trình
                học tập và phát triển sự nghiệp mỗi ngày.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-semibold backdrop-blur">
                  <Sparkles aria-hidden="true" className="h-4 w-4" />
                  AI Tutor 24/7
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-semibold backdrop-blur">
                  <GraduationCap aria-hidden="true" className="h-4 w-4" />
                  Chứng chỉ quốc tế
                </span>
              </div>
            </div>
          ) : null}

          <p
            className={cn(
              "mt-7 text-xs",
              isRegister ? "text-white/70" : "text-[#424754]",
            )}
          >
            © 2024 AILearn. Built for the Future of Education.
          </p>
        </aside>

        <div className="flex min-h-screen flex-col bg-[#faf8ff] px-5 py-8 sm:px-8">
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
            <Link
              className="mb-7 flex items-center gap-2 font-heading text-lg font-bold text-[#0058be]"
              to="/"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0058be] text-white">
                <BrainCircuit aria-hidden="true" className="h-4 w-4" />
              </span>
              AILearn
            </Link>

            <h1 className="font-heading text-2xl font-bold text-[#131b2e]">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#424754]">
              {description}
            </p>

            <div className="mt-7">{children}</div>
          </div>

          <footer className="mx-auto mt-8 flex w-full max-w-sm items-center justify-between text-xs text-[#727785]">
            <span>© 2024 AILearn.</span>
            <div className="flex gap-4">
              <a className="hover:text-[#0058be]" href="/privacy">
                Privacy
              </a>
              <a className="hover:text-[#0058be]" href="/terms">
                Terms
              </a>
              <a className="hover:text-[#0058be]" href="/support">
                Support
              </a>
            </div>
          </footer>
        </div>
      </div>
    </section>
  );
}

function LearningIllustration() {
  return (
    <div className="relative aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-b from-white to-[#eef3ff]">
      <div className="absolute left-8 top-14 h-16 w-16 rounded-2xl bg-gradient-to-br from-[#7dd3fc] to-[#8455ef] opacity-80 blur-[1px]" />
      <div className="absolute right-12 top-20 h-24 w-24 rounded-full border border-[#7dd3fc]/70" />
      <div className="absolute bottom-10 right-10 h-16 w-16 rounded-2xl bg-gradient-to-br from-[#bfdbfe] to-[#8455ef] opacity-75" />
      <div className="absolute inset-x-10 top-40 rounded-2xl border border-[#d6ddff] bg-white/75 p-5 shadow-xl backdrop-blur">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#0058be]" />
          <span className="h-2 w-2 rounded-full bg-[#6b38d4]" />
          <span className="h-2 w-2 rounded-full bg-[#00855b]" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["AI", "RAG", "LMS"].map((item) => (
            <div
              className="rounded-xl bg-[#eaedff] p-3 text-center text-xs font-bold text-[#0058be]"
              key={item}
            >
              {item}
            </div>
          ))}
        </div>
        <div className="mt-4 h-2 rounded-full bg-[#dce5ff]">
          <div className="h-2 w-2/3 rounded-full bg-gradient-to-r from-[#0058be] to-[#6b38d4]" />
        </div>
      </div>

      <div className="absolute bottom-28 left-1/2 flex -translate-x-1/2 flex-col items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#0058be] to-[#6b38d4] text-white shadow-2xl">
          <Bot aria-hidden="true" className="h-10 w-10" />
        </div>
        <div className="mt-4 h-20 w-28 rounded-t-[2rem] bg-[#c9d8ff]" />
      </div>

      <div className="absolute bottom-12 left-14 h-24 w-28 rounded-t-[2rem] bg-[#dce5ff]" />
      <div className="absolute bottom-12 right-16 h-32 w-20 rounded-t-[2rem] bg-[#c9d8ff]" />
      <div className="absolute right-14 top-32 grid gap-2">
        {[0, 1, 2].map((item) => (
          <span className="h-3 w-3 rounded-full bg-[#7dd3fc]" key={item} />
        ))}
      </div>
      <div className="absolute bottom-6 left-8 flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-xs font-semibold text-[#0058be] shadow-sm">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-[#00855b]" />
        Personalized path
      </div>
    </div>
  );
}
