import { SystemText } from "../platform/SystemText";
import { useEffect, useState } from "react";
import { adminMentorService, type MentorProfile } from "../../services/mentor.service";
import "./mentors.css";

export function AdminMentorApprovalPage() {
  const [items, setItems] = useState<MentorProfile[]>([]); const [error, setError] = useState("");
  async function load() { try { setItems((await adminMentorService.list()).items); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể tải hồ sơ."); } }
  useEffect(() => { void load(); }, []);
  async function decide(id: string, status: "approved" | "rejected") { try { await adminMentorService.setApproval(id, status); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể xét duyệt."); } }
  return <div className="mentor-page"><header><p><SystemText message={"Hàng đợi xét duyệt"} /></p><h1><SystemText message={"Xét duyệt cố vấn"} /></h1><span><SystemText message={"Mentor mode chỉ mở sau quyết định của Platform Administrator."} /></span></header>{error ? <p role="alert"><SystemText message={error} /></p> : null}<section className="mentor-grid">{items.map((mentor) => <article key={mentor.id}><span>{mentor.status}</span><h2>{mentor.user?.fullName}</h2><h3>{mentor.headline}</h3><p>{mentor.timezone} · {mentor.availability.length} <SystemText message={"khung giờ"} /></p><div>{mentor.expertise.map((item) => <em key={item.name}>{item.name}</em>)}</div><footer><button onClick={() => void decide(mentor.id, "approved")} type="button"><SystemText message="Duyệt" /></button><button onClick={() => void decide(mentor.id, "rejected")} type="button"><SystemText message="Từ chối" /></button></footer></article>)}</section></div>;
}
