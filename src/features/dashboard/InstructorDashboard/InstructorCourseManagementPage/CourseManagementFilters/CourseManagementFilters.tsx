import { Search } from "lucide-react";
import type { CourseStatus } from "../../../../../services/course.service";
import "./CourseManagementFilters.css";

const statusOptions: Array<{ label: string; value: CourseStatus | "all" }> = [
  { label: "Tất cả", value: "all" },
  { label: "Bản nháp", value: "draft" },
  { label: "Đã xuất bản", value: "published" },
  { label: "Đã lưu trữ", value: "archived" },
];

interface CourseManagementFiltersProps {
  onSearchChange: (value: string) => void;
  onStatusChange: (value: CourseStatus | "all") => void;
  search: string;
  status: CourseStatus | "all";
}

export function CourseManagementFilters({
  onSearchChange,
  onStatusChange,
  search,
  status,
}: CourseManagementFiltersProps) {
  return (
    <section className="course-management-filters" aria-label="Bộ lọc khóa học">
      <label className="course-management-filters__search">
        <Search aria-hidden="true" />
        <span className="sr-only">Tìm kiếm khóa học</span>
        <input
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm kiếm khóa học..."
          type="search"
          value={search}
        />
      </label>

      <div className="course-management-filters__statuses" aria-label="Lọc theo trạng thái">
        {statusOptions.map((option) => (
          <button
            aria-pressed={status === option.value}
            className={status === option.value ? "is-active" : undefined}
            key={option.value}
            onClick={() => onStatusChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
