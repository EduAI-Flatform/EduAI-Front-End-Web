import { SystemText } from '@/features/platform/SystemText';
import { Camera, MapPin, Share2, Sparkles } from "lucide-react";
import { usePlatform } from '../../../../platform/PlatformProvider';
import "./ProfileHero.css";

interface ProfileHeroProps {
  avatarError: string;
  avatarUrl: string;
  coverUrl?: string | null;
  userId?: string;
  coverError?: string;
  isUploadingCover?: boolean;
  onCoverChange?: (file: File) => void;
  onEdit?: () => void;
  shareUrl?: string;
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
  coverUrl, userId, coverError, isUploadingCover, onCoverChange, onEdit, shareUrl,
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
  const { t } = usePlatform();
  return (
    <section className="student-profile-hero">
      <div className="student-profile-hero__banner">
        {coverUrl ? <img className="student-profile-hero__cover" src={coverUrl} alt={t('Ảnh bìa hồ sơ', 'Profile cover')} /> : <div className="student-profile-hero__pattern" aria-hidden="true" />}
        {onCoverChange && <label className="student-profile-hero__cover-button">
          <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={isUploadingCover} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) onCoverChange(file); }} />
          <Camera aria-hidden="true" />{isUploadingCover ? t('Đang tải ảnh…', 'Uploading…') : t('Đổi ảnh bìa', 'Change cover')}
        </label>}
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
            <span className="sr-only"><SystemText message={"Cập nhật ảnh đại diện"} /></span>
          </label>
        </div>

        <div className="student-profile-hero__identity">
          <p className="student-profile-hero__eyebrow">{t('Hồ sơ cá nhân', 'Personal profile')}</p>
          <h1>{fullName ?? t('Người học GDS', 'GDS learner')}</h1>
          <p>
            {headline && <><span>{headline}</span><span aria-hidden="true" /></>}
            <span>{isPublic ? t('Hồ sơ công khai', 'Public profile') : t('Hồ sơ riêng tư', 'Private profile')}</span>
          </p>
          <div className="student-profile-hero__meta">
            {userId && <span className="student-profile-hero__id">ID: {userId}</span>}
            <span>{email ?? t('Chưa có email', 'No email')}</span>
            {location ? (
              <span>
                <MapPin aria-hidden="true" />
                {location}
              </span>
            ) : null}
          </div>
          {coverError && <p role="alert" className="student-profile-hero__error">{coverError}</p>}
          {avatarError ? (
            <p className="student-profile-hero__error" role="alert">
              {avatarError}
            </p>
          ) : null}
          {isLoading ? <div className="student-profile-hero__loading" /> : null}
        </div>

        <div className="student-profile-hero__actions">
          <button className="student-profile-hero__primary" type="button" onClick={onEdit}>
            <Sparkles aria-hidden="true" />
            {t('Chỉnh sửa hồ sơ', 'Edit profile')}
          </button>
          {shareUrl && <a className="student-profile-hero__secondary" href={shareUrl}>
            <Share2 aria-hidden="true" />
            {t('Xem hồ sơ công khai', 'View public profile')}
          </a>}
        </div>
      </div>
    </section>
  );
}
