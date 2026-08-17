import { FormEvent, useEffect, useState } from "react";
import {
  type LearningLevel,
  type LearningProfile,
  type UpdateLearningProfileInput,
} from "../../../../services/profile.service";
import "./LearningProfileSection.css";

const MAX_SKILL_GAPS = 12;

const levels: Array<{ value: LearningLevel; label: string }> = [
  { value: "beginner", label: "Cơ bản" },
  { value: "intermediate", label: "Trung cấp" },
  { value: "advanced", label: "Nâng cao" },
];

interface DraftSkillGap {
  name: string;
  currentLevel: LearningLevel | "";
  targetLevel: LearningLevel;
}

const createDraftSkillGap = (): DraftSkillGap => ({
  name: "",
  currentLevel: "",
  targetLevel: "intermediate",
});

interface LearningProfileSectionProps {
  profile: LearningProfile | null;
  isLoading: boolean;
  onSave: (input: UpdateLearningProfileInput) => Promise<void>;
}

export function LearningProfileSection({
  profile,
  isLoading,
  onSave,
}: LearningProfileSectionProps) {
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<LearningLevel | "">("");
  const [hours, setHours] = useState("");
  const [skillGaps, setSkillGaps] = useState<DraftSkillGap[]>([
    createDraftSkillGap(),
  ]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setGoal(profile?.learningGoal ?? "");
    setLevel(profile?.currentLevel ?? "");
    setHours(profile?.weeklyAvailabilityHours?.toString() ?? "");
    setSkillGaps(
      profile?.skillGaps.length
        ? profile.skillGaps.map((skillGap) => ({
            name: skillGap.name,
            currentLevel: skillGap.currentLevel ?? "",
            targetLevel: skillGap.targetLevel,
          }))
        : [createDraftSkillGap()],
    );
  }, [profile]);

  function updateSkillGap(index: number, changes: Partial<DraftSkillGap>) {
    setSkillGaps((currentSkillGaps) =>
      currentSkillGaps.map((skillGap, skillGapIndex) =>
        skillGapIndex === index ? { ...skillGap, ...changes } : skillGap,
      ),
    );
  }

  function removeSkillGap(index: number) {
    setSkillGaps((currentSkillGaps) =>
      currentSkillGaps.length === 1
        ? [createDraftSkillGap()]
        : currentSkillGaps.filter((_, skillGapIndex) => skillGapIndex !== index),
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    const weeklyAvailabilityHours = hours.trim() ? Number(hours) : null;
    if (
      weeklyAvailabilityHours !== null &&
      (!Number.isInteger(weeklyAvailabilityHours) ||
        weeklyAvailabilityHours < 1 ||
        weeklyAvailabilityHours > 168)
    ) {
      setError("Số giờ mỗi tuần phải từ 1 đến 168.");
      setMessage("");
      return;
    }

    const normalizedSkillGaps = skillGaps
      .filter((skillGap) => skillGap.name.trim())
      .map((skillGap) => ({
        name: skillGap.name.trim(),
        currentLevel: skillGap.currentLevel || null,
        targetLevel: skillGap.targetLevel,
      }));

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await onSave({
        learningGoal: goal.trim() || null,
        currentLevel: level || null,
        weeklyAvailabilityHours,
        skillGaps: normalizedSkillGaps,
      });
      setMessage("Đã lưu định hướng học tập.");
    } catch {
      setError("Không thể lưu định hướng học tập.");
    } finally {
      setSaving(false);
    }
  }

  const isDisabled = isLoading || saving;

  return (
    <section className="learning-profile" aria-labelledby="learning-profile-title">
      <h2 id="learning-profile-title">Định hướng học tập</h2>
      <form onSubmit={(event) => void submit(event)}>
        <label>
          Mục tiêu học tập
          <textarea
            value={goal}
            maxLength={1000}
            onChange={(event) => setGoal(event.target.value)}
            disabled={isDisabled}
          />
        </label>
        <label>
          Trình độ hiện tại
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value as LearningLevel | "")}
            disabled={isDisabled}
          >
            <option value="">Chưa chọn</option>
            {levels.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Số giờ mỗi tuần
          <input
            inputMode="numeric"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            disabled={isDisabled}
          />
        </label>

        <fieldset className="learning-profile__skills" disabled={isDisabled}>
          <legend>Kỹ năng mục tiêu</legend>
          {skillGaps.map((skillGap, index) => (
            <div className="learning-profile__skill-gap" key={index}>
              <label>
                Kỹ năng muốn phát triển {index + 1}
                <input
                  value={skillGap.name}
                  maxLength={120}
                  onChange={(event) =>
                    updateSkillGap(index, { name: event.target.value })
                  }
                />
              </label>
              <label>
                Trình độ hiện tại {index + 1}
                <select
                  value={skillGap.currentLevel}
                  onChange={(event) =>
                    updateSkillGap(index, {
                      currentLevel: event.target.value as LearningLevel | "",
                    })
                  }
                >
                  <option value="">Chưa chọn</option>
                  {levels.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Mục tiêu kỹ năng {index + 1}
                <select
                  value={skillGap.targetLevel}
                  onChange={(event) =>
                    updateSkillGap(index, {
                      targetLevel: event.target.value as LearningLevel,
                    })
                  }
                >
                  {levels.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="learning-profile__secondary-action"
                type="button"
                onClick={() => removeSkillGap(index)}
              >
                Xóa kỹ năng {index + 1}
              </button>
            </div>
          ))}
          {skillGaps.length < MAX_SKILL_GAPS ? (
            <button
              className="learning-profile__secondary-action"
              type="button"
              onClick={() => setSkillGaps((currentSkillGaps) => [
                ...currentSkillGaps,
                createDraftSkillGap(),
              ])}
            >
              Thêm kỹ năng
            </button>
          ) : null}
        </fieldset>

        <button type="submit" disabled={isDisabled}>
          {saving ? "Đang lưu…" : "Lưu định hướng"}
        </button>
        {error ? <p role="alert">{error}</p> : null}
        {message ? <p role="status">{message}</p> : null}
      </form>
    </section>
  );
}
