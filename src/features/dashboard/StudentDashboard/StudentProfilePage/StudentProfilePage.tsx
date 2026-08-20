import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
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
import {
  dashboardService,
  type StudentDashboardData,
} from "../../../../services/dashboard.service";
import { ProfileCertificatesSection } from "./ProfileCertificatesSection/ProfileCertificatesSection";
import { ProfileHero } from "./ProfileHero/ProfileHero";
import { ProfileProgressSection } from "./ProfileProgressSection/ProfileProgressSection";
import { ProfileProjectsSection } from "./ProfileProjectsSection/ProfileProjectsSection";
import { LearningProfileSection } from "./LearningProfileSection";
import { CareerProfileSection } from "./CareerProfileSection";
import {
  ProfileConnectionsPanel,
  ProfileHistoryPanel,
  ProfileSkillsPanel,
} from "./ProfileSidebarPanels/ProfileSidebarPanels";
import "./StudentProfilePage.css";

export function StudentProfilePage() {
  const session = useAuthSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);
  const [careerProfile, setCareerProfile] = useState<CareerProfile | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null);
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
        const [nextProfile, nextSkills, nextLearningProfile, nextCareerProfile, nextPortfolioItems, nextDashboard] =
          await Promise.all([
            profileService.getCurrentProfile(),
            profileService.listSkills(),
            profileService.getLearningProfile(),
            profileService.getCareerProfile(),
            profileService.listPortfolio(),
            dashboardService.getStudentDashboard(),
          ]);

        if (!isMounted) {
          return;
        }

        setProfile(nextProfile);
        setSkills(nextSkills);
        setLearningProfile(nextLearningProfile);
        setCareerProfile(nextCareerProfile);
        setPortfolioItems(nextPortfolioItems);
        setDashboard(nextDashboard);
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
  }, []);

  const initials = useMemo(() => {
    const fullName = session?.user.fullName?.trim();

    if (!fullName) {
      return "EA";
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
  }

  async function updateCareerProfile(input: UpdateCareerProfileInput) {
    setCareerProfile(await profileService.updateCareerProfile(input));
  }

  return (
    <div className="student-dashboard__shell student-profile-page container">
      {error ? (
        <div className="student-profile-alert" role="alert">
          <AlertCircle aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      <ProfileHero
        avatarError={avatarError}
        avatarUrl={avatarUrl}
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

      <div className="student-profile-page__grid">
        <div className="student-profile-page__main">
          <CareerProfileSection isLoading={isLoading} profile={careerProfile} onSave={updateCareerProfile} />
          <LearningProfileSection isLoading={isLoading} profile={learningProfile} onSave={updateLearningProfile} />
          <ProfileProjectsSection
            isLoading={isLoading}
            onCreate={createProject}
            onDelete={deleteProject}
            onUpdate={updateProject}
            projects={portfolioItems}
          />
          <ProfileProgressSection statistics={dashboard?.statistics ?? null} />
          <ProfileCertificatesSection
            certificates={dashboard?.certificates ?? []}
            isLoading={isLoading}
          />
        </div>

        <aside className="student-profile-page__side" aria-label="Thông tin hồ sơ phụ">
          <ProfileSkillsPanel isLoading={isLoading} skills={skills} />
          <ProfileHistoryPanel
            activities={dashboard?.recentActivity ?? []}
            isLoading={isLoading}
          />
          <ProfileConnectionsPanel
            email={session?.user.email}
            websiteUrl={profile?.websiteUrl}
          />
        </aside>
      </div>
    </div>
  );
}
