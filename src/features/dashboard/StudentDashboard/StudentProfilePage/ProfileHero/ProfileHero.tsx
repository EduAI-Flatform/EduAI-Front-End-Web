import { Camera, MapPin, Share2, Sparkles } from "lucide-react";
import "./ProfileHero.css";

interface ProfileHeroProps {
  avatarError: string;
  avatarUrl: string;
  email?: string;
  fullName?: string;
  headline?: string | null;
  initials: string;
  isLoading: boolean;
  isPublic?: boolean;
  isUploadingAvatar: boolean;
  location?: string | null;
  onAvatarChange: (file: File) => void;
}

export function ProfileHero({
  avatarError,
  avatarUrl,
  email,
  fullName,
  headline,
  initials,
  isLoading,
  isPublic,
  isUploadingAvatar,
  location,
  onAvatarChange,
}: ProfileHeroProps) {
  return (
    <section className="student-profile-hero">
      <div className="student-profile-hero__banner" aria-hidden="true">
        <div className="student-profile-hero__pattern" />
      </div>

      <div className="student-profile-hero__body">
        <div className="student-profile-hero__avatar-wrap">
          <div className="student-profile-hero__avatar" aria-hidden="true">
            {avatarUrl ? <img alt="" src={avatarUrl} /> : <span>{initials}</span>}
          </div>
          <label className="student-profile-hero__camera">
            <input
              accept="image/png,image/jpeg,image/webp"
              disabled={isUploadingAvatar}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";

                if (file) {
                  onAvatarChange(file);
                }
              }}
              type="file"
            />
            <Camera aria-hidden="true" />
            <span className="sr-only">Cập nhật ảnh đại diện</span>
          </label>
        </div>

        <div className="student-profile-hero__identity">
          <p className="student-profile-hero__eyebrow">Hồ sơ cá nhân</p>
          <h1>{fullName ?? "Người học EduAI"}</h1>
          <p>
            <span>{headline || "AI Engineering Student"}</span>
            <span aria-hidden="true" />
            <span>{isPublic ? "Hồ sơ công khai" : "Hồ sơ riêng tư"}</span>
          </p>
          <div className="student-profile-hero__meta">
            <span>{email ?? "Chưa có email"}</span>
            {location ? (
              <span>
                <MapPin aria-hidden="true" />
                {location}
              </span>
            ) : null}
          </div>
          {avatarError ? (
            <p className="student-profile-hero__error" role="alert">
              {avatarError}
            </p>
          ) : null}
          {isLoading ? <div className="student-profile-hero__loading" /> : null}
        </div>

        <div className="student-profile-hero__actions">
          <button className="student-profile-hero__primary" type="button">
            <Sparkles aria-hidden="true" />
            Chỉnh sửa hồ sơ
          </button>
          <button className="student-profile-hero__secondary" type="button">
            <Share2 aria-hidden="true" />
            Chia sẻ
          </button>
        </div>
      </div>
    </section>
  );
}
