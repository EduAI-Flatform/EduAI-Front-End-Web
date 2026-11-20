import { usePlatform } from '../platform/PlatformProvider';
import { applicationStatusLabel } from '../platform/system-enum-labels';
import { SystemText } from "../platform/SystemText";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BriefcaseBusiness, FileSearch, Bookmark } from "lucide-react";
import { getJobError, jobService, type JobApplication, type SavedJobPage } from "../../services/job.service";
import "./job-applications.css";

export function JobApplicationsPage() {
  const { t } = usePlatform();
  const [applications, setApplications] = useState<JobApplication[]>([]); const [saved, setSaved] = useState<SavedJobPage["items"]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); try { const [nextApplications, nextSaved] = await Promise.all([jobService.listApplications(), jobService.listSaved()]); setApplications(nextApplications.items); setSaved(nextSaved.items); setError(""); } catch (reason) { setError(getJobError(reason)); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  async function withdraw(id: string) { try { await jobService.withdraw(id); await load(); } catch (reason) { setError(getJobError(reason)); } }
  return <div className="job-applications"><header className="job-applications__hero"><span className="job-applications__hero-icon"><BriefcaseBusiness aria-hidden="true" /></span><div><p><SystemText message={"Trung tâm nghề nghiệp"} /></p><h1><SystemText message="Hồ sơ ứng tuyển" /></h1><span>{t("Ứng tuyển và việc làm đã lưu.", "Applications and saved jobs.")}</span></div></header>{error ? <p role="alert"><SystemText message={error} /></p> : null}{loading ? <p role="status"><SystemText message="Đang tải…" /></p> : null}<section><h2><SystemText message={"Đã ứng tuyển"} /></h2>{!loading && !applications.length ? <div className="job-applications__empty"><FileSearch aria-hidden="true" /><strong><SystemText message={"Chưa có hồ sơ ứng tuyển."} /></strong><Link to="/jobs">{t("Khám phá việc làm", "Explore jobs")}</Link></div> : <div className="job-applications__list">{applications.map((application) => <article key={application.id}><div><span>{application.job.companyName}</span><h3>{application.job.title}</h3><p><SystemText message={"Trạng thái:"} /> <strong>{applicationStatusLabel(application.status, t)}</strong></p><small>{application.history.length} <SystemText message={"cập nhật trạng thái"} /></small></div>{["submitted", "reviewing", "shortlisted"].includes(application.status) ? <button onClick={() => void withdraw(application.id)} type="button"><SystemText message={"Rút hồ sơ"} /></button> : null}</article>)}</div>}</section><section><h2><SystemText message={"Việc đã lưu"} /></h2>{!loading && saved.length === 0 ? <div className="job-applications__empty"><Bookmark aria-hidden="true" /><strong>{t("Chưa lưu công việc nào.", "No saved jobs yet.")}</strong><Link to="/jobs">{t("Tìm việc làm", "Browse jobs")}</Link></div> : null}<div className="job-applications__list">{saved.map((item) => <article key={item.job.id}><div><span>{item.job.companyName}</span><h3>{item.job.title}</h3></div><Link to={`/jobs/${item.job.id}`}><SystemText message="Xem chi tiết" /></Link></article>)}</div></section></div>;
}
