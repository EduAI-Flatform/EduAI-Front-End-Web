import { useEffect, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, MapPin } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useAuthSession } from "../auth/auth-store";
import { getJobError, jobService, type Job } from "../../services/job.service";
import "./jobs.css";
import "./JobDetailActions.css";

export function JobDetailPage() {
  const { jobId = "" } = useParams(); const session = useAuthSession();
  const canApply = session?.user.roles.includes("student") ?? false;
  const [job, setJob] = useState<Job | null>(null); const [error, setError] = useState("");
  const [coverLetter, setCoverLetter] = useState(""); const [message, setMessage] = useState(""); const [submitting, setSubmitting] = useState(false);
  useEffect(() => { let active = true; jobService.get(jobId).then((value) => { if (active) setJob(value); }).catch((reason) => { if (active) setError(getJobError(reason)); }); return () => { active = false; }; }, [jobId]);
  if (error && !job) return <main className="job-detail container"><h1>Không tìm thấy cơ hội</h1><p>Vị trí có thể đã đóng hoặc hết hạn.</p><Link to="/jobs">Quay lại danh sách</Link></main>;
  if (!job) return <main className="job-detail container" aria-busy="true">Đang tải…</main>;
  async function act(kind: "save" | "apply") { if (!canApply) return; setSubmitting(true); setError(""); try { if (kind === "save") { await jobService.save(jobId); setMessage("Đã lưu cơ hội."); } else { await jobService.apply(jobId, coverLetter.trim() || null); setMessage("Đã gửi hồ sơ ứng tuyển."); } } catch (reason) { setError(getJobError(reason)); } finally { setSubmitting(false); } }
  return <main className="job-detail container"><Link className="job-detail__back" to="/jobs"><ArrowLeft aria-hidden="true" />Tất cả cơ hội</Link><header><div className="job-detail__icon"><BriefcaseBusiness aria-hidden="true" /></div><div><p>{job.companyName}</p><h1>{job.title}</h1><span><MapPin aria-hidden="true" />{job.location || job.workMode}</span></div></header><div className="job-detail__grid"><article><h2>Mô tả công việc</h2><p className="job-detail__description">{job.description}</p></article><aside><h2>Kỹ năng cần thiết</h2><div className="job-card__skills">{job.requiredSkills.map((skill) => <span key={skill.name}>{skill.name}{skill.level ? ` · ${skill.level}` : ""}</span>)}</div>{job.closesAt ? <p>Hạn ứng tuyển: {new Date(job.closesAt).toLocaleDateString("vi-VN")}</p> : null}{canApply ? <><label>Thư giới thiệu<textarea maxLength={5000} value={coverLetter} onChange={(event) => setCoverLetter(event.target.value)} /></label><div className="job-detail__actions"><button disabled={submitting} onClick={() => void act("save")} type="button">Lưu việc</button><button disabled={submitting} onClick={() => void act("apply")} type="button">Ứng tuyển</button></div></> : session ? <p>Chỉ tài khoản học viên có thể ứng tuyển.</p> : <Link to="/login">Đăng nhập để ứng tuyển</Link>}{message ? <p role="status">{message}</p> : null}{error ? <p role="alert">{error}</p> : null}</aside></div></main>;
}
