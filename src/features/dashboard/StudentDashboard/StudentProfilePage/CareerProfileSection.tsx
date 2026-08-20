import { FormEvent, useEffect, useState } from "react";
import {
  type CareerProfile,
  type CareerWorkMode,
  type UpdateCareerProfileInput,
} from "../../../../services/profile.service";
import "./CareerProfileSection.css";

interface CareerProfileSectionProps {
  profile: CareerProfile | null;
  isLoading: boolean;
  onSave: (input: UpdateCareerProfileInput) => Promise<void>;
}

const workModes: Array<{ value: CareerWorkMode; label: string }> = [
  { value: "remote", label: "Làm việc từ xa" },
  { value: "hybrid", label: "Làm việc kết hợp" },
  { value: "onsite", label: "Làm việc tại văn phòng" },
];

export function CareerProfileSection({ profile, isLoading, onSave }: CareerProfileSectionProps) {
  const [careerGoal, setCareerGoal] = useState("");
  const [roles, setRoles] = useState("");
  const [modes, setModes] = useState<CareerWorkMode[]>([]);
  const [availability, setAvailability] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [publicSlug, setPublicSlug] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setCareerGoal(profile?.careerGoal ?? "");
    setRoles(profile?.preferredRoles.join(", ") ?? "");
    setModes(profile?.preferredWorkModes ?? []);
    setAvailability(profile?.availabilityStatus ?? "");
    setAvailableFrom(profile?.availableFrom?.slice(0, 10) ?? "");
    setPublicSlug(profile?.publicSlug ?? "");
    setIsPublic(profile?.isPublic ?? false);
  }, [profile]);

  function toggleMode(mode: CareerWorkMode) {
    setModes((current) => current.includes(mode)
      ? current.filter((item) => item !== mode)
      : [...current, mode]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const preferredRoles = [...new Set(roles.split(",").map((role) => role.trim()).filter(Boolean))];
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await onSave({
        careerGoal: careerGoal.trim() || null,
        preferredRoles,
        preferredWorkModes: modes,
        availabilityStatus: availability
          ? availability as UpdateCareerProfileInput["availabilityStatus"]
          : null,
        availableFrom: availableFrom || null,
        publicSlug: publicSlug.trim() || null,
        isPublic,
      });
      setMessage("Đã lưu hồ sơ nghề nghiệp.");
    } catch {
      setError("Không thể lưu hồ sơ nghề nghiệp. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setSaving(false);
    }
  }

  const disabled = isLoading || saving;

  return (
    <section className="career-profile student-profile-card" aria-labelledby="career-profile-title">
      <div className="career-profile__heading">
        <div>
          <p className="career-profile__eyebrow">Career profile</p>
          <h2 id="career-profile-title">Hồ sơ nghề nghiệp</h2>
          <p>Định hướng cơ hội phù hợp và kiểm soát những gì nhà tuyển dụng có thể xem.</p>
        </div>
        <div className="career-profile__projections" aria-label="Thành tựu đã xác minh">
          <span>{profile?.completedCourses.length ?? 0} khóa học hoàn thành</span>
          <span>{profile?.certificates.length ?? 0} chứng chỉ</span>
        </div>
      </div>

      <form onSubmit={(event) => void submit(event)}>
        <label className="career-profile__wide">
          Mục tiêu nghề nghiệp
          <textarea maxLength={1000} value={careerGoal} disabled={disabled} onChange={(event) => setCareerGoal(event.target.value)} />
        </label>
        <label>
          Vai trò mong muốn
          <input aria-label="Vai trò mong muốn" maxLength={800} placeholder="Backend Engineer, AI Engineer" value={roles} disabled={disabled} onChange={(event) => setRoles(event.target.value)} />
          <small>Phân tách các vai trò bằng dấu phẩy.</small>
        </label>
        <label>
          Trạng thái sẵn sàng
          <select value={availability} disabled={disabled} onChange={(event) => setAvailability(event.target.value)}>
            <option value="">Chưa chọn</option>
            <option value="not_looking">Chưa tìm cơ hội</option>
            <option value="open_to_opportunities">Sẵn sàng trao đổi</option>
            <option value="actively_looking">Đang chủ động tìm việc</option>
          </select>
        </label>
        <fieldset className="career-profile__wide" disabled={disabled}>
          <legend>Hình thức làm việc</legend>
          <div className="career-profile__checks">
            {workModes.map((mode) => (
              <label key={mode.value}>
                <input type="checkbox" checked={modes.includes(mode.value)} onChange={() => toggleMode(mode.value)} />
                {mode.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          Có thể bắt đầu từ
          <input type="date" value={availableFrom} disabled={disabled} onChange={(event) => setAvailableFrom(event.target.value)} />
        </label>
        <label>
          Đường dẫn hồ sơ công khai
          <input aria-label="Đường dẫn hồ sơ công khai" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="nguyen-van-an" value={publicSlug} disabled={disabled} onChange={(event) => setPublicSlug(event.target.value)} />
        </label>
        <label className="career-profile__visibility career-profile__wide">
          <input aria-label="Công khai hồ sơ nghề nghiệp" type="checkbox" checked={isPublic} disabled={disabled || !publicSlug.trim()} onChange={(event) => setIsPublic(event.target.checked)} />
          <span>
            <strong>Công khai hồ sơ nghề nghiệp</strong>
            <small>Email, số điện thoại và ngày sinh luôn được giữ riêng tư.</small>
          </span>
        </label>
        <div className="career-profile__actions career-profile__wide">
          <button type="submit" disabled={disabled}>{saving ? "Đang lưu…" : "Lưu hồ sơ nghề nghiệp"}</button>
          {profile?.isPublic && profile.publicSlug ? <a href={`/career/${profile.publicSlug}`} target="_blank" rel="noreferrer">Xem hồ sơ công khai</a> : null}
        </div>
        {error ? <p className="career-profile__wide" role="alert">{error}</p> : null}
        {message ? <p className="career-profile__wide" role="status">{message}</p> : null}
      </form>
    </section>
  );
}
