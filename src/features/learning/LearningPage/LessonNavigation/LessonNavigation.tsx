import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  LockKeyhole,
  PlayCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  LearningStep,
  LearningStepType,
} from "../../../../services/learning.service";
import "./LessonNavigation.css";

interface LessonNavigationProps {
  completedSteps: number;
  steps: LearningStep[];
  selectedStepId: string | null;
  progressPercent: number;
  totalSteps: number;
  onSelectStep: (step: LearningStep) => void;
}

const SECTION_SIZE = 4;

interface LessonSection {
  index: number;
  steps: Array<{ step: LearningStep; index: number }>;
}

function groupSteps(steps: LearningStep[]): LessonSection[] {
  return steps.reduce<LessonSection[]>((sections, step, index) => {
    const sectionIndex = Math.floor(index / SECTION_SIZE);
    const section = sections[sectionIndex] ?? { index: sectionIndex, steps: [] };
    section.steps.push({ step, index });
    sections[sectionIndex] = section;
    return sections;
  }, []);
}
const stepIcons: Record<LearningStepType, typeof PlayCircle> = {
  LESSON: PlayCircle,
  ASSIGNMENT: ClipboardList,
  QUIZ: FileText,
};

const stepLabels: Record<LearningStepType, string> = {
  LESSON: "Bài học",
  ASSIGNMENT: "Bài tập",
  QUIZ: "Bài kiểm tra",
};

export function LessonNavigation({
  completedSteps,
  steps,
  selectedStepId,
  progressPercent,
  totalSteps,
  onSelectStep,
}: LessonNavigationProps) {
  const [isOpen, setIsOpen] = useState(true);
  const sections = useMemo(() => groupSteps(steps), [steps]);
  const selectedSectionIndex = sections.findIndex((section) =>
    section.steps.some(({ step }) => step.id === selectedStepId),
  );
  const [openSections, setOpenSections] = useState<Set<number>>(
    () => new Set(selectedSectionIndex >= 0 ? [selectedSectionIndex] : [0]),
  );

  useEffect(() => {
    if (selectedSectionIndex < 0) return;
    setOpenSections((current) => {
      if (current.has(selectedSectionIndex)) return current;
      return new Set(current).add(selectedSectionIndex);
    });
  }, [selectedSectionIndex]);

  function toggleSection(sectionIndex: number) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(sectionIndex)) next.delete(sectionIndex);
      else next.add(sectionIndex);
      return next;
    });
  }

  return (
    <section className="lesson-navigation" aria-labelledby="lesson-navigation-title">
      <button
        aria-expanded={isOpen}
        className="lesson-navigation__header"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span>Cấu trúc khóa học</span>
        <h2 id="lesson-navigation-title">Nội dung học tập</h2>
        <p>Đã hoàn thành {completedSteps}/{totalSteps} bài học</p>
        <div
          aria-label={`Tiến độ khóa học ${progressPercent}%`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progressPercent}
          className="lesson-navigation__progress"
          role="progressbar"
        >
          <span style={{ width: `${progressPercent}%` }} />
        </div>
      </button>

      {isOpen && sections.length > 0 ? (
        <div className="lesson-navigation__sections">
          {sections.map((section) => {
            const isSectionOpen = openSections.has(section.index);
            const completedInSection = section.steps.filter(({ step }) => step.status === "COMPLETED").length;
            const sectionId = `lesson-navigation-section-${section.index}`;

            return (
              <section className="lesson-navigation__section" key={section.index}>
                <button
                  aria-controls={sectionId}
                  aria-expanded={isSectionOpen}
                  className="lesson-navigation__section-header"
                  onClick={() => toggleSection(section.index)}
                  type="button"
                >
                  <span className="lesson-navigation__section-number">{section.index + 1}</span>
                  <span className="lesson-navigation__section-copy">
                    <strong>Chương {section.index + 1}</strong>
                    <small>{completedInSection}/{section.steps.length} bài học</small>
                  </span>
                  <ChevronDown aria-hidden="true" className={isSectionOpen ? "is-open" : undefined} />
                </button>

                {isSectionOpen ? (
                  <ol className="lesson-navigation__list" id={sectionId}>
                    {section.steps.map(({ step, index }) => {
            const StepIcon = stepIcons[step.type];
            const isSelected = step.id === selectedStepId;
            const isLocked = step.status === "LOCKED";
            const isComplete = step.status === "COMPLETED";

                      return (
                        <li key={step.id}>
                          <button
                            aria-current={isSelected ? "step" : undefined}
                            aria-describedby={isLocked ? `${step.id}-locked-reason` : undefined}
                            aria-disabled={isLocked}
                            className={isSelected ? "lesson-navigation__item--active" : undefined}
                            disabled={isLocked}
                            onClick={() => onSelectStep(step)}
                            title={isLocked ? step.lockedReason ?? "Bước này đang bị khóa." : undefined}
                            type="button"
                          >
                            <span className="lesson-navigation__icon">
                              {isLocked ? (
                                <LockKeyhole aria-hidden="true" />
                              ) : isComplete ? (
                                <CheckCircle2 aria-hidden="true" />
                              ) : (
                                <StepIcon aria-hidden="true" />
                              )}
                            </span>
                            <span className="lesson-navigation__copy">
                              <strong>{step.title}</strong>
                              <small>
                                Bài {index + 1} · {stepLabels[step.type]}
                                {step.progressPercent ? ` · ${step.progressPercent}%` : ""}
                              </small>
                              {isLocked ? (
                                <small id={`${step.id}-locked-reason`} className="lesson-navigation__locked-reason">
                                  {step.lockedReason ?? "Cần hoàn thành bước trước."}
                                </small>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : isOpen ? (
        <p className="lesson-navigation__empty">Chưa có nội dung học tập.</p>
      ) : null}
    </section>
  );
}
