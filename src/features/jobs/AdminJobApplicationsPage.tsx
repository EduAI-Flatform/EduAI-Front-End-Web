import { useEffect, useState } from "react";
import { adminJobService, getJobError, type JobApplication, type JobApplicationStatus } from "../../services/job.service";
import "./job-applications.css";
const nextStatuses: JobApplicationStatus[] = ["reviewing", "shortlisted", "accepted", "rejected"];
export function AdminJobApplicationsPage() {
  const [items, setItems] = useState<JobApplication[]>([]); const [error, setError] = useState("");
  async function load() { try { setItems((await adminJobService.listApplications()).items); setError(""); } catch (reason) { setError(getJobError(reason)); } }
  useEffect(() => { void load(); }, []);
  async function update(id: string, status: JobApplicationStatus) { try { await adminJobService.updateApplicationStatus(id, status); await load(); } catch (reason) { setError(getJobError(reason)); } }
  return <div className="job-applications"><header><p>Private workflow</p><h1>Quản lý hồ sơ ứng tuyển</h1><span>Chỉ quản trị viên có quyền xem và chuyển trạng thái.</span></header>{error ? <p role="alert">{error}</p> : null}<section><h2>{items.length} hồ sơ</h2><div className="job-applications__list">{items.map((item) => <article key={item.id}><div><span>{item.user?.fullName} · {item.user?.email}</span><h3>{item.job.title}</h3><p>{item.status} · {item.history.length} mốc</p></div><label>Cập nhật trạng thái<select aria-label={`Trạng thái ${item.job.title}`} value="" onChange={(event) => void update(item.id, event.target.value as JobApplicationStatus)}><option value="">Chọn…</option>{nextStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label></article>)}</div></section></div>;
}
