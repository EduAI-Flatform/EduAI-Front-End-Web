import { BookOpen } from "lucide-react";
import "./CourseListState.css";

interface CourseListStateProps {
  message: string;
  title: string;
  tone: "empty" | "error";
}

export function CourseListState({ message, title, tone }: CourseListStateProps) {
  return (
    <div className="courses-state" role={tone === "error" ? "alert" : "status"}>
      <BookOpen aria-hidden="true" className="courses-state__icon" />
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}
