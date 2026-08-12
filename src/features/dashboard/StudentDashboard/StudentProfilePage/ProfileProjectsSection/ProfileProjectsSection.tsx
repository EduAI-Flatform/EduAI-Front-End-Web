import { BarChart3, Brain, ExternalLink, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  CreatePortfolioInput,
  PortfolioItem,
} from "../../../../../services/profile.service";
import "./ProfileProjectsSection.css";

interface ProfileProjectsSectionProps {
  isLoading: boolean;
  projects: PortfolioItem[];
  onCreate: (input: CreatePortfolioInput) => Promise<void>;
  onUpdate: (id: string, input: CreatePortfolioInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ProfileProjectsSection(props: ProfileProjectsSectionProps) {
  const { isLoading, projects } = props;
  const [editing, setEditing] = useState<PortfolioItem | null | undefined>(undefined);

  return (
    <section className="student-profile-card student-profile-projects">
      <div className="student-profile-card__header">
        <h2>Dự án cá nhân</h2>
        <button onClick={() => setEditing(null)} type="button"><Plus aria-hidden="true" /> Thêm dự án</button>
      </div>

      {editing !== undefined ? (
        <ProjectForm
          project={editing}
          onCancel={() => setEditing(undefined)}
          onSubmit={async (input) => {
            if (editing) await props.onUpdate(editing.id, input);
            else await props.onCreate(input);
            setEditing(undefined);
          }}
        />
      ) : null}

      {isLoading ? (
        <div className="student-profile-skeleton">Đang tải dự án...</div>
      ) : projects.length > 0 ? (
        <div className="student-profile-projects__grid">
          {projects.map((project, index) => {
            const Icon = index % 2 === 0 ? Brain : BarChart3;
            return (
              <article className="student-profile-project" key={project.id}>
                <div className="student-profile-project__media">
                  {project.imageUrl ? <img alt={`Ảnh dự án ${project.title}`} src={project.imageUrl} /> : <Icon aria-hidden="true" />}
                </div>
                <div className="student-profile-project__body">
                  <h3>{project.title}</h3>
                  <p>{project.description ?? "Chưa có mô tả dự án."}</p>
                  <div className="student-profile-project__footer">
                    <span>{getProjectCategory(project)}</span>
                    {project.projectUrl ? <a href={project.projectUrl} rel="noreferrer" target="_blank"><ExternalLink aria-hidden="true" /> Mở dự án</a> : null}
                  </div>
                  <div className="student-profile-project__actions">
                    <button onClick={() => setEditing(project)} type="button"><Pencil aria-hidden="true" /> Sửa</button>
                    <button onClick={() => void props.onDelete(project.id)} type="button"><Trash2 aria-hidden="true" /> Xóa</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : <p className="student-profile-empty" role="status">Chưa có dự án cá nhân.</p>}
    </section>
  );
}

function ProjectForm({
  project,
  onCancel,
  onSubmit,
}: {
  project: PortfolioItem | null;
  onCancel: () => void;
  onSubmit: (input: CreatePortfolioInput) => Promise<void>;
}) {
  const [title, setTitle] = useState(project?.title ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [projectUrl, setProjectUrl] = useState(project?.projectUrl ?? "");
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const preview = useMemo(
    () => image && typeof URL.createObjectURL === "function" ? URL.createObjectURL(image) : project?.imageUrl ?? null,
    [image, project?.imageUrl],
  );
  useEffect(() => () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <form
      className="student-profile-project-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!title.trim()) return setError("Vui lòng nhập tên dự án.");
        if (image && !["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
          return setError("Ảnh dự án phải là JPG, PNG hoặc WebP.");
        }
        if (image && image.size > 5 * 1024 * 1024) return setError("Ảnh dự án tối đa 5 MB.");
        setIsSaving(true);
        setError("");
        try {
          await onSubmit({
            title: title.trim(),
            description: description.trim() || null,
            projectUrl: projectUrl.trim() || null,
            image,
          });
        } catch (saveError) {
          setError(saveError instanceof Error ? saveError.message : "Không thể lưu dự án.");
        } finally {
          setIsSaving(false);
        }
      }}
    >
      <div className="student-profile-project-form__header"><strong>{project ? "Sửa dự án" : "Dự án mới"}</strong><button aria-label="Đóng" onClick={onCancel} type="button"><X aria-hidden="true" /></button></div>
      <label><span>Tên dự án</span><input aria-label="Tên dự án" onChange={(e) => setTitle(e.target.value)} value={title} /></label>
      <label><span>Mô tả</span><textarea onChange={(e) => setDescription(e.target.value)} value={description} /></label>
      <label><span>Liên kết dự án</span><input onChange={(e) => setProjectUrl(e.target.value)} type="url" value={projectUrl} /></label>
      <label className="student-profile-project-form__image"><ImagePlus aria-hidden="true" /><span>{image ? image.name : "Chọn ảnh dự án"}</span><input accept="image/jpeg,image/png,image/webp" aria-label="Chọn ảnh dự án" onChange={(e) => setImage(e.target.files?.[0] ?? null)} type="file" /></label>
      {preview ? <img alt="Xem trước ảnh dự án" className="student-profile-project-form__preview" src={preview} /> : null}
      {error ? <small role="alert">{error}</small> : null}
      <button disabled={isSaving} type="submit">{isSaving ? "Đang lưu..." : "Lưu dự án"}</button>
    </form>
  );
}

function getProjectCategory(project: PortfolioItem): string {
  return project.startDate
    ? new Intl.DateTimeFormat("vi-VN", { month: "short", year: "numeric" }).format(new Date(project.startDate))
    : "Dự án cá nhân";
}
