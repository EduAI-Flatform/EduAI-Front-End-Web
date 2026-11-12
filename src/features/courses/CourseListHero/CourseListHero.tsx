import { SystemText, useSystemMessages } from '@/features/platform/SystemText';
import { Search, Sparkles } from "lucide-react";
import { Input } from "../../../components/ui/input";
import "./CourseListHero.css";

interface CourseListHeroProps {
  query: string;
  onQueryChange: (query: string) => void;
}

export function CourseListHero({ query, onQueryChange }: CourseListHeroProps) {
  const messageForUi = useSystemMessages();
  return (
    <section className="courses-hero">
      <div className="container courses-hero__content">
        <span className="courses-hero__eyebrow">
          <Sparkles aria-hidden="true" className="courses-hero__eyebrow-icon" />
          <SystemText message={"Khám phá tri thức đa lĩnh vực"} />
        </span>
        <h1><SystemText message={"Mở khóa tiềm năng của bạn trong mọi lĩnh vực"} /></h1>
        <p>
          <SystemText message={"Học tập không giới hạn với các khóa học công khai trên GDS. Tìm kiếm lộ trình phù hợp và chuẩn bị cho trải nghiệm học tập cá nhân hóa."} />
        </p>

        <label className="courses-hero-search">
          <span className="sr-only"><SystemText message={"Tìm kiếm khóa học"} /></span>
          <Search aria-hidden="true" className="courses-hero-search__icon" />
          <Input
            className="courses-hero-search__input"
            id="course-search"
            name="courseSearch"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={messageForUi("Tìm kiếm khóa học, kỹ năng hoặc chủ đề...")}
            type="search"
            value={query}
          />
          <span className="courses-hero-search__action" aria-hidden="true">
            <Sparkles className="courses-hero-search__action-icon" />
          </span>
        </label>
      </div>
    </section>
  );
}
