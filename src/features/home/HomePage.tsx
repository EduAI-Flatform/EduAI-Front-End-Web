import { BrainCircuit, GraduationCap, Library } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Loading } from "../../components/ui/loading";
import { Modal } from "../../components/ui/modal";

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
    <section className="container grid gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
      <div className="flex flex-col justify-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          EduAI Platform
        </p>
        <h1 className="mt-3 max-w-3xl font-heading text-4xl font-bold leading-tight text-foreground sm:text-5xl">
          AI-powered learning workspace for the single-tenant MVP.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          A responsive frontend shell ready for identity, courses, library,
          community, classroom, certificate, and AI modules.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button>Browse courses</Button>
          <Modal
            description="Base modal component for confirmations, forms, and focused actions."
            title="Design system ready"
            trigger={<Button variant="outline">Open modal</Button>}
          >
            <div className="grid gap-4">
              <Input placeholder="Email address" type="email" />
              <Loading label="Checking availability" />
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
