import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJobError, jobService, type JobApplication, type SavedJobPage } from "../../services/job.service";
import "./job-applications.css";

export function JobApplicationsPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]); const [saved, setSaved] = useState<SavedJobPage["items"]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); try { const [nextApplications, nextSaved] = await Promise.all([jobService.listApplications(), jobService.listSaved()]); setApplications(nextApplications.items); setSaved(nextSaved.items); setError(""); } catch (reason) { setError(getJobError(reason)); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  async function withdraw(id: string) { try { await jobService.withdraw(id); await load(); } catch (reason) { setError(getJobError(reason)); } }
  return <div className="job-applications"><header><p>Career hub</p><h1>Hồ sơ ứng tuyển</h1><span>Theo dõi lịch sử trạng thái riêng tư của bạn.</span></header>{error ? <p role="alert">{error}</p> : null}{loading ? <p role="status">Đang tải…</p> : null}<section><h2>Đã ứng tuyển</h2>{!loading && !applications.length ? <p>Chưa có hồ sơ ứng tuyển.</p> : <div className="job-applications__list">{applications.map((application) => <article key={application.id}><div><span>{application.job.companyName}</span><h3>{application.job.title}</h3><p>Trạng thái: <strong>{application.status}</strong></p><small>{application.history.length} cập nhật trạng thái</small></div>{["submitted", "reviewing", "shortlisted"].includes(application.status) ? <button onClick={() => void withdraw(application.id)} type="button">Rút hồ sơ</button> : null}</article>)}</div>}</section><section><h2>Việc đã lưu</h2><div className="job-applications__list">{saved.map((item) => <article key={item.job.id}><div><span>{item.job.companyName}</span><h3>{item.job.title}</h3></div><Link to={`/jobs/${item.job.id}`}>Xem chi tiết</Link></article>)}</div></section></div>;
}
