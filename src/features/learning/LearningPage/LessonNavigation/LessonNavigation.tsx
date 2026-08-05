import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  LockKeyhole,
  PlayCircle,
} from "lucide-react";
import { useState } from "react";
import type {
  LearningStep,
  LearningStepType,
} from "../../../../services/learning.service";
import "./LessonNavigation.css";

interface LessonNavigationProps {
  steps: LearningStep[];
  selectedStepId: string | null;
  onSelectStep: (step: LearningStep) => void;
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
  steps,
  selectedStepId,
  onSelectStep,
}: LessonNavigationProps) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <section className="lesson-navigation" aria-labelledby="lesson-navigation-title">
      <button
        aria-expanded={isOpen}
        className="lesson-navigation__header"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span>Lộ trình học tập</span>
        <h2 id="lesson-navigation-title">Các bước trong khóa học</h2>
      </button>

      {isOpen && steps.length > 0 ? (
        <ol className="lesson-navigation__list">
          {steps.map((step, index) => {
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
                      Bước {index + 1} · {stepLabels[step.type]}
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
      ) : isOpen ? (
        <p className="lesson-navigation__empty">Chưa có nội dung học tập.</p>
      ) : null}
    </section>
  );
}
