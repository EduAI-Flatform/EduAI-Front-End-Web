import { ExternalLink, Brain, BarChart3 } from "lucide-react";
import { PortfolioItem } from "../../../../../services/profile.service";
import { fallbackProjects } from "../profilePageData";
import "./ProfileProjectsSection.css";

interface ProfileProjectsSectionProps {
  isLoading: boolean;
  projects: PortfolioItem[];
}

export function ProfileProjectsSection({
  isLoading,
  projects,
}: ProfileProjectsSectionProps) {
  const visibleProjects = projects.length > 0 ? projects.slice(0, 2) : fallbackProjects;

  return (
    <section className="student-profile-card student-profile-projects">
      <div className="student-profile-card__header">
        <h2>Dự án cá nhân</h2>
        <button type="button">Xem tất cả</button>
      </div>

      {isLoading ? (
        <div className="student-profile-skeleton">Đang tải dự án...</div>
      ) : (
        <div className="student-profile-projects__grid">
          {visibleProjects.map((project, index) => {
            const Icon = index % 2 === 0 ? Brain : BarChart3;
            const category = getProjectCategory(project);

            return (
              <article className="student-profile-project" key={project.id}>
                <div className="student-profile-project__media">
                  {project.imageUrl ? (
                    <img alt="" src={project.imageUrl} />
                  ) : (
                    <Icon aria-hidden="true" />
                  )}
                </div>
                <div className="student-profile-project__body">
                  <h3>{project.title}</h3>
                  <p>{project.description ?? "Dự án học tập AI trên EduAI."}</p>
                  <div className="student-profile-project__footer">
                    <span>{category}</span>
                    {project.projectUrl ? (
                      <a href={project.projectUrl} rel="noreferrer" target="_blank">
                        <ExternalLink aria-hidden="true" />
                        GitHub
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function getProjectCategory(project: PortfolioItem): string {
  return "category" in project && typeof project.category === "string"
    ? project.category
    : "AI Project";
}
