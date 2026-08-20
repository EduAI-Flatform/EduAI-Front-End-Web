import { FormEvent, useEffect, useState } from "react";
import { BriefcaseBusiness, MapPin, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { getJobError, jobService, type JobPage } from "../../services/job.service";
import "./jobs.css";

export function JobsPage() {
  const [jobs, setJobs] = useState<JobPage | null>(null);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    jobService.list({ page, pageSize: 12, search: submittedSearch || undefined })
      .then((result) => { if (active) { setJobs(result); setError(""); } })
      .catch((reason) => { if (active) setError(getJobError(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, submittedSearch]);

  function submit(event: FormEvent) { event.preventDefault(); setPage(1); setSubmittedSearch(search.trim()); }

  return <main className="jobs-page container">
    <header className="jobs-page__hero"><p>Career hub</p><h1>Cơ hội để kỹ năng của bạn tạo ra giá trị.</h1><span>Danh sách đã được EduAI xác minh và còn thời hạn ứng tuyển.</span></header>
    <form className="jobs-search" onSubmit={submit}><Search aria-hidden="true" /><label><span className="sr-only">Tìm việc làm</span><input placeholder="Vị trí, công ty hoặc kỹ năng" value={search} onChange={(event) => setSearch(event.target.value)} /></label><button type="submit">Tìm kiếm</button></form>
    {error ? <p role="alert">{error}</p> : null}
    {loading ? <p role="status">Đang tải cơ hội…</p> : null}
    {!loading && !jobs?.items.length ? <section className="jobs-empty"><h2>Chưa có cơ hội phù hợp</h2><p>Thử một từ khóa khác hoặc quay lại sau.</p></section> : null}
    <section className="jobs-grid" aria-label="Danh sách việc làm">{jobs?.items.map((job) => <article className="job-card" key={job.id}><div className="job-card__icon"><BriefcaseBusiness aria-hidden="true" /></div><div><p>{job.companyName}</p><h2>{job.title}</h2><span className="job-card__location"><MapPin aria-hidden="true" />{job.location || job.workMode}</span><p className="job-card__summary">{job.summary}</p><div className="job-card__skills">{job.requiredSkills.slice(0, 4).map((skill) => <span key={skill.name}>{skill.name}</span>)}</div><Link to={`/jobs/${job.id}`}>Xem chi tiết</Link></div></article>)}</section>
    {jobs && jobs.totalPages > 1 ? <nav className="jobs-pagination" aria-label="Phân trang việc làm"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Trang trước</button><span>{page} / {jobs.totalPages}</span><button disabled={page === jobs.totalPages} onClick={() => setPage((value) => value + 1)}>Trang sau</button></nav> : null}
  </main>;
}
