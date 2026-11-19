import { useSystemMessages, SystemText } from '@/features/platform/SystemText';
import { useEffect, useMemo, useState } from "react";
import { usePlatform } from '../../../platform/PlatformProvider';
import { ProfilePosts } from './ProfilePosts';
import { AlertCircle, Pencil, Plus } from "lucide-react";
import { Modal } from "../../../../components/ui/modal";
import { useAuthSession } from "../../../auth/auth-store";
import {
  getProfileErrorMessage,
  PortfolioItem,
  type CreatePortfolioInput,
  profileService,
  UserProfile,
  UserSkill,
  type LearningProfile,
  type UpdateLearningProfileInput,
  type CareerProfile,
  type UpdateCareerProfileInput,
} from "../../../../services/profile.service";
import { ProfileHero } from "./ProfileHero/ProfileHero";
import { ProfileProjectsSection } from "./ProfileProjectsSection/ProfileProjectsSection";
import { LearningProfileSection } from "./LearningProfileSection";
import { CareerProfileSection } from "./CareerProfileSection";
import {
  ProfileConnectionsPanel,
  ProfileSkillsPanel,
} from "./ProfileSidebarPanels/ProfileSidebarPanels";
import "./StudentProfilePage.css";

export function StudentProfilePage() {
  const session = useAuthSession();
  return <StudentProfileContent key={session?.user.id ?? 'anonymous'} session={session} />;
}

function StudentProfileContent({ session }: { session: ReturnType<typeof useAuthSession> }) {
  const messageForUi = useSystemMessages();
  const { t } = usePlatform();
  const [tab, setTab] = useState<'bio' | 'posts'>('bio');
  const [bioEditOpen, setBioEditOpen] = useState(false);
  const [careerEditOpen, setCareerEditOpen] = useState(false);
  const [learningEditOpen, setLearningEditOpen] = useState(false);
  const [bio, setBio] = useState('');
  const [bioSaving, setBioSaving] = useState(false);
  const [bioNotice, setBioNotice] = useState('');
  const [coverError, setCoverError] = useState('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);
  const [careerProfile, setCareerProfile] = useState<CareerProfile | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [avatarUrl, setAvatarUrl] = useState(session?.user.avatarUrl ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [avatarError, setAvatarError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setError("");

      try {
        const [profileResult, skillsResult, learningResult, careerResult, portfolioResult] =
          await Promise.allSettled([
            profileService.getCurrentProfile(),
            profileService.listSkills(),
            profileService.getLearningProfile(),
            profileService.getCareerProfile(),
            profileService.listPortfolio(),
          ]);

        if (!isMounted) {
          return;
        }

        if (profileResult.status === 'fulfilled') {
          setProfile(profileResult.value);
          setBio(profileResult.value?.bio ?? '');
        }
        if (skillsResult.status === 'fulfilled') setSkills(skillsResult.value);
        if (learningResult.status === 'fulfilled') setLearningProfile(learningResult.value);
        if (careerResult.status === 'fulfilled') {
          setCareerProfile(careerResult.value);
          setAvatarUrl(careerResult.value ? (careerResult.value.avatarUrl ?? '') : (session?.user.avatarUrl ?? ''));
        }
        if (portfolioResult.status === 'fulfilled') setPortfolioItems(portfolioResult.value);
        const failed = [profileResult, skillsResult, learningResult, careerResult, portfolioResult]
          .find(result => result.status === 'rejected');
        if (failed?.status === 'rejected') setError(getProfileErrorMessage(failed.reason));
      } catch (loadError) {
        if (isMounted) {
          setError(getProfileErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [session?.user.id]);

  const initials = useMemo(() => {
    const fullName = session?.user.fullName?.trim();

    if (!fullName) {
      return "GDS";
    }

    return fullName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [session?.user.fullName]);

  async function handleAvatarChange(file: File) {
    setAvatarError("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError("Ảnh đại diện chỉ hỗ trợ PNG, JPG hoặc WebP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Ảnh đại diện không được vượt quá 2MB.");
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const response = await profileService.uploadAvatar(file);
      setAvatarUrl(response.avatarUrl);
    } catch (uploadError) {
      setAvatarError(getProfileErrorMessage(uploadError));
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleCoverChange(file: File) {
    setCoverError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setCoverError(t('Ảnh bìa cần là JPG, PNG hoặc WebP, tối đa 5 MB.', 'Cover must be JPG, PNG or WebP, up to 5 MB.')); return;
    }
    setIsUploadingCover(true);
    try {
      const result = await profileService.uploadCover(file);
      setProfile(current => current ? { ...current, coverUrl: result.coverUrl } : current);
      if (!profile) setProfile(await profileService.getCurrentProfile());
    } catch (reason) { setCoverError(getProfileErrorMessage(reason)); }
    finally { setIsUploadingCover(false); }
  }

  async function saveBio(event: React.FormEvent) {
    event.preventDefault(); setBioSaving(true); setBioNotice(''); setError('');
    try { setProfile(await profileService.updateCurrentProfile({ bio })); setBioNotice(t('Đã lưu giới thiệu.', 'Bio saved.')); setBioEditOpen(false); }
    catch (reason) { setError(getProfileErrorMessage(reason)); }
    finally { setBioSaving(false); }
  }

  async function createProject(input: CreatePortfolioInput) {
    const created = await profileService.createPortfolio(input);
    setPortfolioItems((items) => [created, ...items]);
  }

  async function updateProject(id: string, input: CreatePortfolioInput) {
    const updated = await profileService.updatePortfolio(id, input);
    setPortfolioItems((items) => items.map((item) => (item.id === id ? updated : item)));
  }

  async function deleteProject(id: string) {
    await profileService.deletePortfolio(id);
    setPortfolioItems((items) => items.filter((item) => item.id !== id));
  }

  async function updateLearningProfile(input: UpdateLearningProfileInput) {
    setLearningProfile(await profileService.updateLearningProfile(input));
    setLearningEditOpen(false);
  }

  async function updateCareerProfile(input: UpdateCareerProfileInput) {
    setCareerProfile(await profileService.updateCareerProfile(input));
    setCareerEditOpen(false);
  }

  return (
    <div className="student-dashboard__shell student-profile-page container">
      {error ? (
        <div className="student-profile-alert" role="alert">
          <AlertCircle aria-hidden="true" />
          <p><SystemText message={error} /></p>
        </div>
      ) : null}

      <ProfileHero
        avatarError={avatarError}
        avatarUrl={avatarUrl}
        coverUrl={profile?.coverUrl}
        userId={session?.user.id}
        coverError={coverError}
        isUploadingCover={isUploadingCover}
        onCoverChange={file => void handleCoverChange(file)}
        onEdit={() => { setTab('bio'); setBioEditOpen(true); }}
        shareUrl={profile?.isPublic && profile.publicSlug ? `/career/${encodeURIComponent(profile.publicSlug)}` : undefined}
        email={session?.user.email}
        fullName={session?.user.fullName}
        headline={profile?.headline}
        initials={initials}
        isLoading={isLoading}
        isPublic={profile?.isPublic}
        isUploadingAvatar={isUploadingAvatar}
        location={profile?.location}
        onAvatarChange={(file) => void handleAvatarChange(file)}
      />

      <nav className="student-profile-tabs" aria-label={t('Nội dung hồ sơ', 'Profile content')}>
        <button type="button" aria-pressed={tab === 'bio'} onClick={() => setTab('bio')}><SystemText message={"Tiểu sử"} /></button>
        <button type="button" aria-pressed={tab === 'posts'} onClick={() => setTab('posts')}>{t('Bài viết', 'Posts')}</button>
      </nav>
      {tab === 'posts' ? <ProfilePosts /> : <>
      <section className="student-profile-card student-profile-summary" aria-label={t('Giới thiệu bản thân', 'About me')}>
        <div className="student-profile-card__header">
          <h2>{t('Giới thiệu bản thân', 'About me')}</h2>
          <button type="button" onClick={() => setBioEditOpen(true)}><Pencil size={16} aria-hidden="true" /> {t('Chỉnh sửa', 'Edit')}</button>
        </div>
        <p>{bio.trim() || t('Chia sẻ đôi điều về bản thân để kết nối với cộng đồng học tập.', 'Introduce yourself to the learning community.')}</p>
        {bioNotice && <p role="status">{bioNotice}</p>}
      </section>
      <Modal open={bioEditOpen} onOpenChange={open => { setBioEditOpen(open); if (!open) setBio(profile?.bio ?? ''); }} title={t('Chỉnh sửa giới thiệu', 'Edit introduction')}>
        <form className="student-profile-bio" onSubmit={saveBio}>
          <label htmlFor="profile-bio">{t('Giới thiệu bản thân', 'About you')}</label>
          <textarea id="profile-bio" maxLength={2000} rows={4} value={bio} disabled={isLoading || bioSaving} onChange={event => setBio(event.target.value)} />
          <button type="submit" disabled={isLoading || bioSaving}>{bioSaving ? t('Đang lưu…', 'Saving…') : t('Lưu giới thiệu', 'Save introduction')}</button>
        </form>
      </Modal>
      <div className="student-profile-page__grid">
        <div className="student-profile-page__main">
          <section className="student-profile-card student-profile-summary" aria-label={t('Hồ sơ nghề nghiệp', 'Career profile')}>
            <div className="student-profile-card__header">
              <h2>{t('Hồ sơ nghề nghiệp', 'Career profile')}</h2>
              <button type="button" onClick={() => setCareerEditOpen(true)}><Pencil size={16} aria-hidden="true" /> {t('Chỉnh sửa', 'Edit')}</button>
            </div>
            <p>{careerProfile?.careerGoal || t('Mô tả mục tiêu nghề nghiệp để nhận đề xuất cơ hội phù hợp.', 'Add your career goal to discover relevant opportunities.')}</p>
            {careerProfile?.preferredRoles?.length ? <p>{careerProfile.preferredRoles.join(', ')}</p> : null}
          </section>
          <Modal open={careerEditOpen} onOpenChange={setCareerEditOpen} title={t('Cập nhật hồ sơ nghề nghiệp', 'Update career profile')} className="max-w-3xl">
            <CareerProfileSection isLoading={isLoading} profile={careerProfile} onSave={updateCareerProfile} />
          </Modal>
          <section className="student-profile-card student-profile-summary" aria-label={t('Mục tiêu học tập', 'Learning goals')}>
            <div className="student-profile-card__header">
              <h2>{t('Mục tiêu học tập', 'Learning goals')}</h2>
              <button type="button" onClick={() => setLearningEditOpen(true)}><Plus size={16} aria-hidden="true" /> {t('Cập nhật', 'Update')}</button>
            </div>
            <p>{learningProfile?.learningGoal || t('Đặt mục tiêu để GDS đề xuất lộ trình học tập phù hợp.', 'Set a goal to personalize your learning path.')}</p>
          </section>
          <Modal open={learningEditOpen} onOpenChange={setLearningEditOpen} title={t('Cập nhật định hướng học tập', 'Update learning goals')} className="max-w-3xl">
            <LearningProfileSection isLoading={isLoading} profile={learningProfile} onSave={updateLearningProfile} />
          </Modal>
          <ProfileProjectsSection
            isLoading={isLoading}
            onCreate={createProject}
            onDelete={deleteProject}
            onUpdate={updateProject}
            projects={portfolioItems}
          />
        </div>

        <aside className="student-profile-page__side" aria-label={messageForUi("Thông tin hồ sơ phụ")}>
          <ProfileSkillsPanel isLoading={isLoading} skills={skills} />
          <ProfileConnectionsPanel
            email={session?.user.email}
            websiteUrl={profile?.websiteUrl}
          />
        </aside>
      </div>
      </>}
    </div>
  );
}
