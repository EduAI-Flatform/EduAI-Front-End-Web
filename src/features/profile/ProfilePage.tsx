import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Globe2,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Loading } from "../../components/ui/loading";
import {
  getProfileErrorMessage,
  PortfolioItem,
  profileService,
  UpdateProfileInput,
  UserProfile,
  UserSkill,
} from "../../services/profile.service";
import { useAuthSession } from "../auth/auth-store";
import "./ProfilePage.css";

interface ProfileFormState {
  phoneNumber: string;
  dateOfBirth: string;
  bio: string;
  headline: string;
  location: string;
  websiteUrl: string;
  publicSlug: string;
  isPublic: boolean;
}

interface ProfileFormErrors {
  websiteUrl?: string;
  publicSlug?: string;
}

interface SkillFormState {
  name: string;
  level: string;
  category: string;
}

interface SkillFormErrors {
  name?: string;
  level?: string;
  category?: string;
}

interface PortfolioFormState {
  title: string;
  description: string;
  projectUrl: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
}

interface PortfolioFormErrors {
  title?: string;
  projectUrl?: string;
  imageUrl?: string;
  endDate?: string;
}

const emptyFormState: ProfileFormState = {
  phoneNumber: "",
  dateOfBirth: "",
  bio: "",
  headline: "",
  location: "",
  websiteUrl: "",
  publicSlug: "",
  isPublic: false,
};

const emptySkillFormState: SkillFormState = {
  name: "",
  level: "",
  category: "",
};

const emptyPortfolioFormState: PortfolioFormState = {
  title: "",
  description: "",
  projectUrl: "",
  imageUrl: "",
  startDate: "",
  endDate: "",
};

export function ProfilePage() {
  const session = useAuthSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [formState, setFormState] = useState<ProfileFormState>(emptyFormState);
  const [skillFormState, setSkillFormState] =
    useState<SkillFormState>(emptySkillFormState);
  const [portfolioFormState, setPortfolioFormState] =
    useState<PortfolioFormState>(emptyPortfolioFormState);
  const [formErrors, setFormErrors] = useState<ProfileFormErrors>({});
  const [skillFormErrors, setSkillFormErrors] = useState<SkillFormErrors>({});
  const [portfolioFormErrors, setPortfolioFormErrors] =
    useState<PortfolioFormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [isSavingPortfolio, setIsSavingPortfolio] = useState(false);
  const [deletingSkillId, setDeletingSkillId] = useState<string | null>(null);
  const [deletingPortfolioId, setDeletingPortfolioId] = useState<string | null>(
    null,
  );
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(
    null,
  );
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [skillError, setSkillError] = useState("");
  const [portfolioError, setPortfolioError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [skillSuccessMessage, setSkillSuccessMessage] = useState("");
  const [portfolioSuccessMessage, setPortfolioSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setLoadError("");

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
        setFormState(toFormState(nextProfile));
      } catch (error) {
        if (isMounted) {
          setLoadError(getProfileErrorMessage(error));
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateProfileForm(formState);

    setFormErrors(nextErrors);
    setFormError("");
    setSuccessMessage("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const updatedProfile = await profileService.updateCurrentProfile(
        toUpdateProfileInput(formState),
      );
      setProfile(updatedProfile);
      setFormState(toFormState(updatedProfile));
      setSuccessMessage("Hồ sơ đã được cập nhật.");
    } catch (error) {
      setFormError(getProfileErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  function updateField<Key extends keyof ProfileFormState>(
    key: Key,
    value: ProfileFormState[Key],
  ) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateSkillField<Key extends keyof SkillFormState>(
    key: Key,
    value: SkillFormState[Key],
  ) {
    setSkillFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updatePortfolioField<Key extends keyof PortfolioFormState>(
    key: Key,
    value: PortfolioFormState[Key],
  ) {
    setPortfolioFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleAddSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateSkillForm(skillFormState);

    setSkillFormErrors(nextErrors);
    setSkillError("");
    setSkillSuccessMessage("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsAddingSkill(true);

    try {
      const createdSkill = await profileService.addSkill({
        name: skillFormState.name.trim(),
        level: normalizeOptionalString(skillFormState.level),
        category: normalizeOptionalString(skillFormState.category),
      });

      setSkills((current) => [createdSkill, ...current]);
      setSkillFormState(emptySkillFormState);
      setSkillSuccessMessage("Kỹ năng đã được thêm.");
    } catch (error) {
      setSkillError(getProfileErrorMessage(error));
    } finally {
      setIsAddingSkill(false);
    }
  }

  async function handleDeleteSkill(skillId: string) {
    const currentSkills = skills;
    setDeletingSkillId(skillId);
    setSkillError("");
    setSkillSuccessMessage("");
    setSkills((current) => current.filter((skill) => skill.id !== skillId));

    try {
      await profileService.deleteSkill(skillId);
      setSkillSuccessMessage("Kỹ năng đã được xóa.");
    } catch (error) {
      setSkills(currentSkills);
      setSkillError(getProfileErrorMessage(error));
    } finally {
      setDeletingSkillId(null);
    }
  }

  async function handleSavePortfolio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validatePortfolioForm(portfolioFormState);

    setPortfolioFormErrors(nextErrors);
    setPortfolioError("");
    setPortfolioSuccessMessage("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSavingPortfolio(true);

    try {
      const payload = toPortfolioInput(portfolioFormState);

      if (editingPortfolioId) {
        const updatedItem = await profileService.updatePortfolio(
          editingPortfolioId,
          payload,
        );

        setPortfolioItems((current) =>
          current.map((item) =>
            item.id === updatedItem.id ? updatedItem : item,
          ),
        );
        setPortfolioSuccessMessage("Dự án đã được cập nhật.");
      } else {
        const createdItem = await profileService.createPortfolio(payload);
        setPortfolioItems((current) => [createdItem, ...current]);
        setPortfolioSuccessMessage("Dự án đã được thêm.");
      }

      setPortfolioFormState(emptyPortfolioFormState);
      setEditingPortfolioId(null);
    } catch (error) {
      setPortfolioError(getProfileErrorMessage(error));
    } finally {
      setIsSavingPortfolio(false);
    }
  }

  function handleEditPortfolio(item: PortfolioItem) {
    setEditingPortfolioId(item.id);
    setPortfolioFormState(toPortfolioFormState(item));
    setPortfolioFormErrors({});
    setPortfolioError("");
    setPortfolioSuccessMessage("");
  }

  function handleCancelPortfolioEdit() {
    setEditingPortfolioId(null);
    setPortfolioFormState(emptyPortfolioFormState);
    setPortfolioFormErrors({});
    setPortfolioError("");
  }

  async function handleDeletePortfolio(portfolioId: string) {
    const currentItems = portfolioItems;
    setDeletingPortfolioId(portfolioId);
    setPortfolioError("");
    setPortfolioSuccessMessage("");
    setPortfolioItems((current) =>
      current.filter((item) => item.id !== portfolioId),
    );

    try {
      await profileService.deletePortfolio(portfolioId);

      if (editingPortfolioId === portfolioId) {
        handleCancelPortfolioEdit();
      }

      setPortfolioSuccessMessage("Dự án đã được xóa.");
    } catch (error) {
      setPortfolioItems(currentItems);
      setPortfolioError(getProfileErrorMessage(error));
    } finally {
      setDeletingPortfolioId(null);
    }
  }

  return (
    <section className="profile-page container">
      <div className="profile-page__header">
        <div className="profile-page__identity">
          <span className="profile-page__avatar" aria-hidden="true">
            {initials}
          </span>
          <div>
            <p className="profile-page__eyebrow">Hồ sơ cá nhân</p>
            <h1 className="profile-page__title">
              {session?.user.fullName ?? "Người học EduAI"}
            </h1>
            <p className="profile-page__summary">
              Cập nhật thông tin giới thiệu, liên hệ và trạng thái công khai để
              hồ sơ học tập luôn rõ ràng.
            </p>
          </div>
        </div>

        <div className="profile-page__meta" aria-label="Tóm tắt hồ sơ">
          <div className="profile-page__meta-item">
            <p className="profile-page__meta-label">Email</p>
            <p className="profile-page__meta-value">
              {session?.user.email ?? "Chưa có"}
            </p>
          </div>
          <div className="profile-page__meta-item">
            <p className="profile-page__meta-label">Vai trò</p>
            <p className="profile-page__meta-value">
              {formatRoles(session?.user.roles)}
            </p>
          </div>
          <div className="profile-page__meta-item">
            <p className="profile-page__meta-label">Trạng thái</p>
            <p className="profile-page__meta-value">
              {profile?.isPublic ? "Công khai" : "Riêng tư"}
            </p>
          </div>
        </div>
      </div>

      <div className="profile-page__content">
        <article className="profile-page__panel">
          <h2 className="profile-page__panel-title">Chỉnh sửa hồ sơ</h2>
          <p className="profile-page__panel-copy">
            Thông tin này được lưu vào hồ sơ học tập của tài khoản hiện tại.
          </p>

          {isLoading ? (
            <div className="profile-empty">
              <Loading label="Đang tải hồ sơ" />
            </div>
          ) : loadError ? (
            <div className="profile-alert profile-alert--error" role="alert">
              <AlertCircle aria-hidden="true" className="h-5 w-5" />
              <p>{loadError}</p>
            </div>
          ) : (
            <form className="profile-form" noValidate onSubmit={handleSubmit}>
              {formError ? (
                <div className="profile-alert profile-alert--error" role="alert">
                  <AlertCircle aria-hidden="true" className="h-5 w-5" />
                  <p>{formError}</p>
                </div>
              ) : null}

              {successMessage ? (
                <div className="profile-alert profile-alert--success" role="status">
                  <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                  <p>{successMessage}</p>
                </div>
              ) : null}

              <div className="profile-form__grid">
                <label className="profile-form__field" htmlFor="profile-headline">
                  Tiêu đề hồ sơ
                  <Input
                    disabled={isSaving}
                    id="profile-headline"
                    maxLength={160}
                    onChange={(event) =>
                      updateField("headline", event.target.value)
                    }
                    placeholder="Ví dụ: Học viên AI ứng dụng"
                    value={formState.headline}
                  />
                </label>

                <label className="profile-form__field" htmlFor="profile-location">
                  Khu vực
                  <Input
                    disabled={isSaving}
                    id="profile-location"
                    maxLength={120}
                    onChange={(event) =>
                      updateField("location", event.target.value)
                    }
                    placeholder="TP. Hồ Chí Minh"
                    value={formState.location}
                  />
                </label>

                <label className="profile-form__field" htmlFor="profile-phone">
                  Số điện thoại
                  <Input
                    disabled={isSaving}
                    id="profile-phone"
                    maxLength={32}
                    onChange={(event) =>
                      updateField("phoneNumber", event.target.value)
                    }
                    placeholder="+84901234567"
                    value={formState.phoneNumber}
                  />
                </label>

                <label className="profile-form__field" htmlFor="profile-birthdate">
                  Ngày sinh
                  <Input
                    disabled={isSaving}
                    id="profile-birthdate"
                    onChange={(event) =>
                      updateField("dateOfBirth", event.target.value)
                    }
                    type="date"
                    value={formState.dateOfBirth}
                  />
                </label>

                <label className="profile-form__field" htmlFor="profile-website">
                  Website
                  <Input
                    aria-invalid={Boolean(formErrors.websiteUrl)}
                    disabled={isSaving}
                    id="profile-website"
                    maxLength={2048}
                    onChange={(event) =>
                      updateField("websiteUrl", event.target.value)
                    }
                    placeholder="https://example.com"
                    value={formState.websiteUrl}
                  />
                  {formErrors.websiteUrl ? (
                    <span className="profile-form__error">
                      {formErrors.websiteUrl}
                    </span>
                  ) : null}
                </label>

                <label className="profile-form__field" htmlFor="profile-slug">
                  Đường dẫn công khai
                  <Input
                    aria-invalid={Boolean(formErrors.publicSlug)}
                    disabled={isSaving}
                    id="profile-slug"
                    maxLength={80}
                    onChange={(event) =>
                      updateField("publicSlug", event.target.value)
                    }
                    placeholder="nguyen-van-a"
                    value={formState.publicSlug}
                  />
                  {formErrors.publicSlug ? (
                    <span className="profile-form__error">
                      {formErrors.publicSlug}
                    </span>
                  ) : (
                    <span className="profile-form__hint">
                      Chỉ dùng chữ thường, số và dấu gạch ngang.
                    </span>
                  )}
                </label>
              </div>

              <label className="profile-form__field" htmlFor="profile-bio">
                Giới thiệu
                <textarea
                  className="profile-form__textarea"
                  disabled={isSaving}
                  id="profile-bio"
                  maxLength={2000}
                  onChange={(event) => updateField("bio", event.target.value)}
                  placeholder="Chia sẻ mục tiêu học tập, kỹ năng quan tâm hoặc kinh nghiệm nổi bật."
                  value={formState.bio}
                />
              </label>

              <label className="profile-form__toggle">
                <input
                  checked={formState.isPublic}
                  disabled={isSaving}
                  onChange={(event) =>
                    updateField("isPublic", event.target.checked)
                  }
                  type="checkbox"
                />
                <span>
                  Cho phép hiển thị hồ sơ công khai
                  <span className="profile-form__toggle-copy">
                    Khi bật, hồ sơ có thể dùng làm trang giới thiệu học tập trong
                    các tính năng EduAI.
                  </span>
                </span>
              </label>

              <div className="profile-form__actions">
                <Button disabled={isSaving} type="submit">
                  {isSaving ? (
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save aria-hidden="true" className="h-4 w-4" />
                  )}
                  {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </form>
          )}
        </article>

        <aside className="profile-page__panel">
          <h2 className="profile-page__panel-title">Thông tin hiển thị</h2>
          <p className="profile-page__panel-copy">
            Bản xem nhanh giúp kiểm tra nội dung trước khi lưu hoặc bật công
            khai.
          </p>

          {!profile && !hasFormContent(formState) ? (
            <div className="profile-empty">
              Chưa có thông tin hồ sơ. Điền biểu mẫu để bắt đầu xây dựng hồ sơ
              học tập.
            </div>
          ) : (
            <div className="profile-fact-list">
              <ProfileFact
                icon={UserRound}
                label="Tiêu đề"
                value={formState.headline || "Chưa cập nhật"}
              />
              <ProfileFact
                icon={MapPin}
                label="Khu vực"
                value={formState.location || "Chưa cập nhật"}
              />
              <ProfileFact
                icon={Phone}
                label="Liên hệ"
                value={formState.phoneNumber || "Chưa cập nhật"}
              />
              <ProfileFact
                icon={Globe2}
                label="Website"
                value={formState.websiteUrl || "Chưa cập nhật"}
              />
            </div>
          )}
        </aside>
      </div>

      <article className="profile-page__panel profile-skills">
        <div className="profile-skills__header">
          <div>
            <h2 className="profile-page__panel-title">Kỹ năng</h2>
            <p className="profile-page__panel-copy">
              Quản lý các kỹ năng nổi bật để hoàn thiện hồ sơ học tập.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="profile-empty">
            <Loading label="Đang tải kỹ năng" />
          </div>
        ) : loadError ? (
          <div className="profile-alert profile-alert--error" role="alert">
            <AlertCircle aria-hidden="true" className="h-5 w-5" />
            <p>{loadError}</p>
          </div>
        ) : (
          <div className="profile-skills__content">
            <form className="profile-skills__form" noValidate onSubmit={handleAddSkill}>
              {skillError ? (
                <div className="profile-alert profile-alert--error" role="alert">
                  <AlertCircle aria-hidden="true" className="h-5 w-5" />
                  <p>{skillError}</p>
                </div>
              ) : null}

              {skillSuccessMessage ? (
                <div className="profile-alert profile-alert--success" role="status">
                  <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                  <p>{skillSuccessMessage}</p>
                </div>
              ) : null}

              <div className="profile-skills__form-grid">
                <label className="profile-form__field" htmlFor="skill-name">
                  Tên kỹ năng
                  <Input
                    aria-invalid={Boolean(skillFormErrors.name)}
                    disabled={isAddingSkill}
                    id="skill-name"
                    maxLength={120}
                    onChange={(event) =>
                      updateSkillField("name", event.target.value)
                    }
                    placeholder="Phân tích dữ liệu"
                    value={skillFormState.name}
                  />
                  {skillFormErrors.name ? (
                    <span className="profile-form__error">
                      {skillFormErrors.name}
                    </span>
                  ) : null}
                </label>

                <label className="profile-form__field" htmlFor="skill-level">
                  Cấp độ
                  <Input
                    aria-invalid={Boolean(skillFormErrors.level)}
                    disabled={isAddingSkill}
                    id="skill-level"
                    maxLength={80}
                    onChange={(event) =>
                      updateSkillField("level", event.target.value)
                    }
                    placeholder="Trung cấp"
                    value={skillFormState.level}
                  />
                  {skillFormErrors.level ? (
                    <span className="profile-form__error">
                      {skillFormErrors.level}
                    </span>
                  ) : null}
                </label>

                <label className="profile-form__field" htmlFor="skill-category">
                  Nhóm kỹ năng
                  <Input
                    aria-invalid={Boolean(skillFormErrors.category)}
                    disabled={isAddingSkill}
                    id="skill-category"
                    maxLength={80}
                    onChange={(event) =>
                      updateSkillField("category", event.target.value)
                    }
                    placeholder="Trí tuệ nhân tạo"
                    value={skillFormState.category}
                  />
                  {skillFormErrors.category ? (
                    <span className="profile-form__error">
                      {skillFormErrors.category}
                    </span>
                  ) : null}
                </label>
              </div>

              <div className="profile-form__actions">
                <Button disabled={isAddingSkill} type="submit">
                  {isAddingSkill ? (
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus aria-hidden="true" className="h-4 w-4" />
                  )}
                  {isAddingSkill ? "Đang thêm..." : "Thêm kỹ năng"}
                </Button>
              </div>
            </form>

            {skills.length === 0 ? (
              <div className="profile-empty">
                Chưa có kỹ năng nào. Thêm kỹ năng đầu tiên để hồ sơ rõ năng lực hơn.
              </div>
            ) : (
              <ul className="profile-skills__list" aria-label="Danh sách kỹ năng">
                {skills.map((skill) => (
                  <li className="profile-skill" key={skill.id}>
                    <div className="profile-skill__body">
                      <p className="profile-skill__name">{skill.name}</p>
                      <p className="profile-skill__meta">
                        {[skill.category, skill.level].filter(Boolean).join(" · ") ||
                          "Chưa phân loại"}
                      </p>
                    </div>
                    <Button
                      aria-label={`Xóa kỹ năng ${skill.name}`}
                      disabled={deletingSkillId === skill.id}
                      onClick={() => void handleDeleteSkill(skill.id)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      {deletingSkillId === skill.id ? (
                        <Loader2
                          aria-hidden="true"
                          className="h-4 w-4 animate-spin"
                        />
                      ) : (
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </article>

      <article className="profile-page__panel profile-portfolio">
        <div className="profile-skills__header">
          <div>
            <h2 className="profile-page__panel-title">Dự án cá nhân</h2>
            <p className="profile-page__panel-copy">
              Quản lý các dự án, sản phẩm học tập hoặc bài thực hành nổi bật.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="profile-empty">
            <Loading label="Đang tải dự án" />
          </div>
        ) : loadError ? (
          <div className="profile-alert profile-alert--error" role="alert">
            <AlertCircle aria-hidden="true" className="h-5 w-5" />
            <p>{loadError}</p>
          </div>
        ) : (
          <div className="profile-portfolio__content">
            <form
              className="profile-portfolio__form"
              noValidate
              onSubmit={handleSavePortfolio}
            >
              {portfolioError ? (
                <div className="profile-alert profile-alert--error" role="alert">
                  <AlertCircle aria-hidden="true" className="h-5 w-5" />
                  <p>{portfolioError}</p>
                </div>
              ) : null}

              {portfolioSuccessMessage ? (
                <div className="profile-alert profile-alert--success" role="status">
                  <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                  <p>{portfolioSuccessMessage}</p>
                </div>
              ) : null}

              <div className="profile-portfolio__form-grid">
                <label className="profile-form__field" htmlFor="portfolio-title">
                  Tên dự án
                  <Input
                    aria-invalid={Boolean(portfolioFormErrors.title)}
                    disabled={isSavingPortfolio}
                    id="portfolio-title"
                    maxLength={160}
                    onChange={(event) =>
                      updatePortfolioField("title", event.target.value)
                    }
                    placeholder="Trợ lý học tập bằng AI"
                    value={portfolioFormState.title}
                  />
                  {portfolioFormErrors.title ? (
                    <span className="profile-form__error">
                      {portfolioFormErrors.title}
                    </span>
                  ) : null}
                </label>

                <label className="profile-form__field" htmlFor="portfolio-url">
                  Liên kết dự án
                  <Input
                    aria-invalid={Boolean(portfolioFormErrors.projectUrl)}
                    disabled={isSavingPortfolio}
                    id="portfolio-url"
                    maxLength={2048}
                    onChange={(event) =>
                      updatePortfolioField("projectUrl", event.target.value)
                    }
                    placeholder="https://example.com"
                    value={portfolioFormState.projectUrl}
                  />
                  {portfolioFormErrors.projectUrl ? (
                    <span className="profile-form__error">
                      {portfolioFormErrors.projectUrl}
                    </span>
                  ) : null}
                </label>

                <label className="profile-form__field" htmlFor="portfolio-image">
                  Ảnh minh họa
                  <Input
                    aria-invalid={Boolean(portfolioFormErrors.imageUrl)}
                    disabled={isSavingPortfolio}
                    id="portfolio-image"
                    maxLength={2048}
                    onChange={(event) =>
                      updatePortfolioField("imageUrl", event.target.value)
                    }
                    placeholder="https://example.com/du-an.png"
                    value={portfolioFormState.imageUrl}
                  />
                  {portfolioFormErrors.imageUrl ? (
                    <span className="profile-form__error">
                      {portfolioFormErrors.imageUrl}
                    </span>
                  ) : null}
                </label>

                <label className="profile-form__field" htmlFor="portfolio-start">
                  Ngày bắt đầu
                  <Input
                    disabled={isSavingPortfolio}
                    id="portfolio-start"
                    onChange={(event) =>
                      updatePortfolioField("startDate", event.target.value)
                    }
                    type="date"
                    value={portfolioFormState.startDate}
                  />
                </label>

                <label className="profile-form__field" htmlFor="portfolio-end">
                  Ngày kết thúc
                  <Input
                    aria-invalid={Boolean(portfolioFormErrors.endDate)}
                    disabled={isSavingPortfolio}
                    id="portfolio-end"
                    onChange={(event) =>
                      updatePortfolioField("endDate", event.target.value)
                    }
                    type="date"
                    value={portfolioFormState.endDate}
                  />
                  {portfolioFormErrors.endDate ? (
                    <span className="profile-form__error">
                      {portfolioFormErrors.endDate}
                    </span>
                  ) : null}
                </label>
              </div>

              <label className="profile-form__field" htmlFor="portfolio-description">
                Mô tả
                <textarea
                  className="profile-form__textarea"
                  disabled={isSavingPortfolio}
                  id="portfolio-description"
                  maxLength={2000}
                  onChange={(event) =>
                    updatePortfolioField("description", event.target.value)
                  }
                  placeholder="Tóm tắt mục tiêu, vai trò của bạn và kết quả đạt được."
                  value={portfolioFormState.description}
                />
              </label>

              <div className="profile-form__actions">
                <Button disabled={isSavingPortfolio} type="submit">
                  {isSavingPortfolio ? (
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  ) : editingPortfolioId ? (
                    <Save aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Plus aria-hidden="true" className="h-4 w-4" />
                  )}
                  {isSavingPortfolio
                    ? "Đang lưu..."
                    : editingPortfolioId
                      ? "Cập nhật dự án"
                      : "Thêm dự án"}
                </Button>

                {editingPortfolioId ? (
                  <Button
                    disabled={isSavingPortfolio}
                    onClick={handleCancelPortfolioEdit}
                    type="button"
                    variant="outline"
                  >
                    Hủy chỉnh sửa
                  </Button>
                ) : null}
              </div>
            </form>

            {portfolioItems.length === 0 ? (
              <div className="profile-empty">
                Chưa có dự án nào. Thêm dự án đầu tiên để thể hiện kết quả học tập.
              </div>
            ) : (
              <ul className="profile-portfolio__list" aria-label="Danh sách dự án">
                {portfolioItems.map((item) => (
                  <li className="profile-portfolio-card" key={item.id}>
                    <div className="profile-portfolio-card__body">
                      <div>
                        <h3 className="profile-portfolio-card__title">
                          {item.title}
                        </h3>
                        <p className="profile-portfolio-card__dates">
                          {formatDateRange(item.startDate, item.endDate)}
                        </p>
                      </div>

                      {item.description ? (
                        <p className="profile-portfolio-card__description">
                          {item.description}
                        </p>
                      ) : null}

                      {item.projectUrl ? (
                        <a
                          className="profile-portfolio-card__link"
                          href={item.projectUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLink aria-hidden="true" className="h-4 w-4" />
                          Mở dự án
                        </a>
                      ) : null}
                    </div>

                    <div className="profile-portfolio-card__actions">
                      <Button
                        aria-label={`Chỉnh sửa dự án ${item.title}`}
                        disabled={isSavingPortfolio}
                        onClick={() => handleEditPortfolio(item)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Edit3 aria-hidden="true" className="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label={`Xóa dự án ${item.title}`}
                        disabled={deletingPortfolioId === item.id}
                        onClick={() => void handleDeletePortfolio(item.id)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        {deletingPortfolioId === item.id ? (
                          <Loader2
                            aria-hidden="true"
                            className="h-4 w-4 animate-spin"
                          />
                        ) : (
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </article>
    </section>
  );
}

function ProfileFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="profile-fact">
      <Icon aria-hidden="true" className="profile-fact__icon h-5 w-5" />
      <div>
        <p className="profile-fact__label">{label}</p>
        <p className="profile-fact__value">{value}</p>
      </div>
    </div>
  );
}

function toFormState(profile: UserProfile | null): ProfileFormState {
  if (!profile) {
    return emptyFormState;
  }

  return {
    phoneNumber: profile.phoneNumber ?? "",
    dateOfBirth: formatDateInput(profile.dateOfBirth),
    bio: profile.bio ?? "",
    headline: profile.headline ?? "",
    location: profile.location ?? "",
    websiteUrl: profile.websiteUrl ?? "",
    publicSlug: profile.publicSlug ?? "",
    isPublic: profile.isPublic,
  };
}

function toUpdateProfileInput(state: ProfileFormState): UpdateProfileInput {
  return {
    phoneNumber: normalizeOptionalString(state.phoneNumber),
    dateOfBirth: normalizeOptionalString(state.dateOfBirth),
    bio: normalizeOptionalString(state.bio),
    headline: normalizeOptionalString(state.headline),
    location: normalizeOptionalString(state.location),
    websiteUrl: normalizeOptionalString(state.websiteUrl),
    publicSlug: normalizeOptionalString(state.publicSlug),
    isPublic: state.isPublic,
  };
}

function validateProfileForm(state: ProfileFormState): ProfileFormErrors {
  const errors: ProfileFormErrors = {};
  const websiteUrl = state.websiteUrl.trim();
  const publicSlug = state.publicSlug.trim();

  if (websiteUrl) {
    try {
      const url = new URL(websiteUrl);

      if (!["http:", "https:"].includes(url.protocol)) {
        errors.websiteUrl = "Website phải bắt đầu bằng http:// hoặc https://.";
      }
    } catch {
      errors.websiteUrl = "Website không hợp lệ.";
    }
  }

  if (publicSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(publicSlug)) {
    errors.publicSlug =
      "Đường dẫn chỉ dùng chữ thường, số và dấu gạch ngang ở giữa.";
  }

  return errors;
}

function validateSkillForm(state: SkillFormState): SkillFormErrors {
  const errors: SkillFormErrors = {};
  const name = state.name.trim();
  const level = state.level.trim();
  const category = state.category.trim();

  if (!name) {
    errors.name = "Vui lòng nhập tên kỹ năng.";
  } else if (name.length > 120) {
    errors.name = "Tên kỹ năng không được vượt quá 120 ký tự.";
  }

  if (level.length > 80) {
    errors.level = "Cấp độ không được vượt quá 80 ký tự.";
  }

  if (category.length > 80) {
    errors.category = "Nhóm kỹ năng không được vượt quá 80 ký tự.";
  }

  return errors;
}

function validatePortfolioForm(state: PortfolioFormState): PortfolioFormErrors {
  const errors: PortfolioFormErrors = {};
  const title = state.title.trim();
  const projectUrl = state.projectUrl.trim();
  const imageUrl = state.imageUrl.trim();

  if (!title) {
    errors.title = "Vui lòng nhập tên dự án.";
  } else if (title.length > 160) {
    errors.title = "Tên dự án không được vượt quá 160 ký tự.";
  }

  if (projectUrl && !isValidHttpUrl(projectUrl)) {
    errors.projectUrl = "Liên kết dự án phải bắt đầu bằng http:// hoặc https://.";
  }

  if (imageUrl && !isValidHttpUrl(imageUrl)) {
    errors.imageUrl = "Ảnh minh họa phải bắt đầu bằng http:// hoặc https://.";
  }

  if (
    state.startDate &&
    state.endDate &&
    new Date(state.endDate).getTime() < new Date(state.startDate).getTime()
  ) {
    errors.endDate = "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.";
  }

  return errors;
}

function toPortfolioInput(state: PortfolioFormState) {
  return {
    title: state.title.trim(),
    description: normalizeOptionalString(state.description),
    projectUrl: normalizeOptionalString(state.projectUrl),
    imageUrl: normalizeOptionalString(state.imageUrl),
    startDate: normalizeOptionalString(state.startDate),
    endDate: normalizeOptionalString(state.endDate),
  };
}

function toPortfolioFormState(item: PortfolioItem): PortfolioFormState {
  return {
    title: item.title,
    description: item.description ?? "",
    projectUrl: item.projectUrl ?? "",
    imageUrl: item.imageUrl ?? "",
    startDate: formatDateInput(item.startDate),
    endDate: formatDateInput(item.endDate),
  };
}

function normalizeOptionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function formatDateInput(value: string | null): string {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function formatRoles(roles: string[] | undefined): string {
  if (!roles?.length) {
    return "Người học";
  }

  const roleLabels: Record<string, string> = {
    student: "Học viên",
    instructor: "Giảng viên",
    platform_admin: "Quản trị",
  };

  return roles.map((role) => roleLabels[role] ?? role).join(", ");
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
  const start = formatDisplayDate(startDate);
  const end = formatDisplayDate(endDate);

  if (start && end) {
    return `${start} - ${end}`;
  }

  if (start) {
    return `${start} - nay`;
  }

  if (end) {
    return `Hoàn thành ${end}`;
  }

  return "Chưa cập nhật thời gian";
}

function formatDisplayDate(value: string | null): string {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function hasFormContent(state: ProfileFormState): boolean {
  return Boolean(
    state.phoneNumber ||
      state.dateOfBirth ||
      state.bio ||
      state.headline ||
      state.location ||
      state.websiteUrl ||
      state.publicSlug ||
      state.isPublic,
  );
}
