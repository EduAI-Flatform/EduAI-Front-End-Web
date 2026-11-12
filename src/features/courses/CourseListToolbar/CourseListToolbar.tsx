import { SystemText, useSystemMessages } from "../../platform/SystemText";
import { SlidersHorizontal } from "lucide-react";
import type { CourseLevel } from "../../../services/course.service";
import "./CourseListToolbar.css";

interface CourseListToolbarProps {
  level: "all" | CourseLevel;
  onLevelChange: (level: "all" | CourseLevel) => void;
}

const filters: Array<{ label: string; value: "all" | CourseLevel }> = [
  { label: "Tất cả", value: "all" },
  { label: "Cơ bản", value: "beginner" },
  { label: "Trung cấp", value: "intermediate" },
  { label: "Nâng cao", value: "advanced" },
];

export function CourseListToolbar({
  level,
  onLevelChange,
}: CourseListToolbarProps) {
  const messageForUi = useSystemMessages();
  return (
    <section className="courses-toolbar" aria-label={messageForUi("Bộ lọc khóa học")}>
      <div className="courses-filter-chips">
        {filters.map((filter) => (
          <button
            className={
              level === filter.value
                ? "courses-filter-chip courses-filter-chip--active"
                : "courses-filter-chip"
            }
            key={filter.value}
            onClick={() => onLevelChange(filter.value)}
            type="button"
          >
            <SystemText message={filter.label} />
          </button>
        ))}
      </div>

      <button
        aria-label={messageForUi("Mở bộ lọc nâng cao")}
        className="courses-advanced-filter"
        type="button"
      >
        <SlidersHorizontal
          aria-hidden="true"
          className="courses-advanced-filter__icon"
        /><SystemText message="Bộ lọc nâng cao" /></button>
    </section>
  );
}
