import { SystemText } from "../../../../platform/SystemText";
import { Plus } from "lucide-react";
import "./CourseManagementHeader.css";

interface CourseManagementHeaderProps {
  onCreate: () => void;
}

export function CourseManagementHeader({ onCreate }: CourseManagementHeaderProps) {
  return (
    <header className="course-management-header">
      <div>
        <span><SystemText message={"Không gian giảng dạy"} /></span>
        <h1><SystemText message="Khóa học của tôi" /></h1>
        <p><SystemText message={"Quản lý nội dung và theo dõi trạng thái xuất bản của từng khóa học."} /></p>
      </div>
      <button className="course-management-header__create" onClick={onCreate} type="button">
        <Plus aria-hidden="true" /><SystemText message="Tạo khóa học" /></button>
    </header>
  );
}
