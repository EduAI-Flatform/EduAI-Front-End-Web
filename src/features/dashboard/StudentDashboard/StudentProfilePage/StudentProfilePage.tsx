import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useAuthSession } from "../../../auth/auth-store";
import {
  getProfileErrorMessage,
  PortfolioItem,
  profileService,
  UserProfile,
  UserSkill,
} from "../../../../services/profile.service";
import { ProfileCertificatesSection } from "./ProfileCertificatesSection/ProfileCertificatesSection";
import { ProfileHero } from "./ProfileHero/ProfileHero";
import { ProfileProgressSection } from "./ProfileProgressSection/ProfileProgressSection";
import { ProfileProjectsSection } from "./ProfileProjectsSection/ProfileProjectsSection";
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
        const [nextProfile, nextSkills, nextPortfolioItems] = await Promise.all([
          profileService.getCurrentProfile(),
          profileService.listSkills(),
          profileService.listPortfolio(),
        ]);

        if (!isMounted) {
          return;
        }

        setProfile(nextProfile);
        setSkills(nextSkills);
        setPortfolioItems(nextPortfolioItems);
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
          <ProfileProjectsSection
            isLoading={isLoading}
            projects={portfolioItems}
          />
          <ProfileProgressSection />
          <ProfileCertificatesSection />
        </div>

        <aside className="student-profile-page__side" aria-label="Thông tin hồ sơ phụ">
          <ProfileSkillsPanel isLoading={isLoading} skills={skills} />
          <ProfileHistoryPanel />
          <ProfileConnectionsPanel
            email={session?.user.email}
            websiteUrl={profile?.websiteUrl}
          />
        </aside>
      </div>
    </div>
  );
}
