import { SystemText, useSystemMessages } from '@/features/platform/SystemText';
import { useEffect, useState } from "react";
import { adminJobService, getJobError, type JobApplication, type JobApplicationStatus } from "../../services/job.service";
import "./job-applications.css";
const nextStatuses: JobApplicationStatus[] = ["reviewing", "shortlisted", "accepted", "rejected"];
export function AdminJobApplicationsPage() {
  const messageForUi = useSystemMessages();
  const [items, setItems] = useState<JobApplication[]>([]); const [error, setError] = useState("");
  async function load() { try { setItems((await adminJobService.listApplications()).items); setError(""); } catch (reason) { setError(getJobError(reason)); } }
  useEffect(() => { void load(); }, []);
  async function update(id: string, status: JobApplicationStatus) { try { await adminJobService.updateApplicationStatus(id, status); await load(); } catch (reason) { setError(getJobError(reason)); } }
  return <div className="job-applications"><header><p><SystemText message={"Quy trình riêng tư"} /></p><h1><SystemText message={"Quản lý hồ sơ ứng tuyển"} /></h1><span><SystemText message={"Chỉ quản trị viên có quyền xem và chuyển trạng thái."} /></span></header>{error ? <p role="alert"><SystemText message={error} /></p> : null}<section><h2>{items.length} <SystemText message={"hồ sơ"} /></h2><div className="job-applications__list">{items.map((item) => <article key={item.id}><div><span>{item.user?.fullName} · {item.user?.email}</span><h3>{item.job.title}</h3><p>{item.status} · {item.history.length} <SystemText message={"mốc"} /></p></div><label><SystemText message={"Cập nhật trạng thái"} /><select aria-label={`${messageForUi("Trạng thái ")}${item.job.title}`} value="" onChange={(event) => void update(item.id, event.target.value as JobApplicationStatus)}><option value=""><SystemText message={"Chọn…"} /></option>{nextStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label></article>)}</div></section></div>;
}
