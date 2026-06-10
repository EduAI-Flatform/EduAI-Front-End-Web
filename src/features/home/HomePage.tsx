import { BrainCircuit, GraduationCap, Library } from "lucide-react";

const highlights = [
  {
    title: "Digital learning",
    description: "Courses, lessons, enrollment, and progress tracking for the MVP.",
    icon: GraduationCap,
  },
  {
    title: "AI assistant",
    description: "A clean entry point for tutor, summary, quiz, and flashcard workflows.",
    icon: BrainCircuit,
  },
  {
    title: "Digital library",
    description: "A foundation for searchable learning resources and saved materials.",
    icon: Library,
  },
];

export function HomePage() {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-16">
      <div className="flex flex-col justify-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          EduAI Platform
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
          AI-powered learning workspace for the single-tenant MVP.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          A responsive frontend shell ready for identity, courses, library,
          community, classroom, certificate, and AI modules.
        </p>
      </div>

      <div className="grid gap-4">
        {highlights.map((item) => {
          const Icon = item.icon;

          return (
            <article
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              key={item.title}
            >
              <div className="flex items-start gap-4">
                <div className="rounded-md bg-blue-50 p-3 text-brand">
                  <Icon aria-hidden="true" className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
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
