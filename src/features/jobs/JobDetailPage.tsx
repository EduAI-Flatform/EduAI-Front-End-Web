import { useEffect, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, MapPin } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getJobError, jobService, type Job } from "../../services/job.service";
import "./jobs.css";

export function JobDetailPage() {
  const { jobId = "" } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; jobService.get(jobId).then((value) => { if (active) setJob(value); }).catch((reason) => { if (active) setError(getJobError(reason)); }); return () => { active = false; }; }, [jobId]);
  if (error) return <main className="job-detail container"><h1>Không tìm thấy cơ hội</h1><p>Vị trí có thể đã đóng hoặc hết hạn.</p><Link to="/jobs">Quay lại danh sách</Link></main>;
  if (!job) return <main className="job-detail container" aria-busy="true">Đang tải…</main>;
  return <main className="job-detail container"><Link className="job-detail__back" to="/jobs"><ArrowLeft aria-hidden="true" />Tất cả cơ hội</Link><header><div className="job-detail__icon"><BriefcaseBusiness aria-hidden="true" /></div><div><p>{job.companyName}</p><h1>{job.title}</h1><span><MapPin aria-hidden="true" />{job.location || job.workMode}</span></div></header><div className="job-detail__grid"><article><h2>Mô tả công việc</h2><p className="job-detail__description">{job.description}</p></article><aside><h2>Kỹ năng cần thiết</h2><div className="job-card__skills">{job.requiredSkills.map((skill) => <span key={skill.name}>{skill.name}{skill.level ? ` · ${skill.level}` : ""}</span>)}</div>{job.closesAt ? <p>Hạn ứng tuyển: {new Date(job.closesAt).toLocaleDateString("vi-VN")}</p> : null}<button disabled title="Tính năng ứng tuyển sẽ được mở ở bước tiếp theo">Ứng tuyển sắp mở</button></aside></div></main>;
}
