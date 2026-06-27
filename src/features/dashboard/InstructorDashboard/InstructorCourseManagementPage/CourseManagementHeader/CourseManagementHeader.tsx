import { Plus } from "lucide-react";
import "./CourseManagementHeader.css";

export function CourseManagementHeader() {
  return (
    <header className="course-management-header">
      <div>
        <span>Không gian giảng dạy</span>
        <h1>Khóa học của tôi</h1>
        <p>Quản lý nội dung và theo dõi trạng thái xuất bản của từng khóa học.</p>
      </div>
      <button className="course-management-header__create" type="button">
        <Plus aria-hidden="true" />
        Tạo khóa học
      </button>
    </header>
  );
}
