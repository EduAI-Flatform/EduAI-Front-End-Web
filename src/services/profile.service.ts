import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export interface UserProfile {
  id: string;
  userId: string;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  bio: string | null;
  headline: string | null;
  location: string | null;
  websiteUrl: string | null;
  publicSlug: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSkill {
  id: string;
  userId: string;
  name: string;
  level: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioItem {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  projectUrl: string | null;
  imageUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AvatarUploadResponse {
  avatarUrl: string;
}

export type LearningLevel = "beginner" | "intermediate" | "advanced";

export interface LearningSkillGap {
  id: string;
  name: string;
  currentLevel: LearningLevel | null;
  targetLevel: LearningLevel;
  createdAt: string;
  updatedAt: string;
}

export interface LearningProfile {
  id: string;
  userId: string;
  learningGoal: string | null;
  currentLevel: LearningLevel | null;
  weeklyAvailabilityHours: number | null;
  createdAt: string;
  updatedAt: string;
  skillGaps: LearningSkillGap[];
}

export interface UpdateLearningProfileInput {
  learningGoal?: string | null;
  currentLevel?: LearningLevel | null;
  weeklyAvailabilityHours?: number | null;
  skillGaps?: Array<Pick<LearningSkillGap, "name" | "currentLevel" | "targetLevel">>;
}

export interface UpdateProfileInput {
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  bio?: string | null;
  headline?: string | null;
  location?: string | null;
  websiteUrl?: string | null;
  publicSlug?: string | null;
  isPublic?: boolean;
}

export type CareerWorkMode = "remote" | "hybrid" | "onsite";
export type CareerAvailabilityStatus = "not_looking" | "open_to_opportunities" | "actively_looking";

export interface CareerProfile {
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  headline: string | null;
  location: string | null;
  websiteUrl: string | null;
  email: string;
  publicSlug: string | null;
  isPublic: boolean;
  careerGoal: string | null;
  preferredRoles: string[];
  preferredWorkModes: CareerWorkMode[];
  availabilityStatus: CareerAvailabilityStatus | null;
  availableFrom: string | null;
  skills: Array<Pick<UserSkill, "name" | "level" | "category">>;
  portfolio: Array<Pick<PortfolioItem, "title" | "description" | "projectUrl" | "imageUrl" | "startDate" | "endDate">>;
  completedCourses: Array<{ title: string; slug: string; thumbnailUrl: string | null; completedAt: string }>;
  certificates: Array<{ title: string; courseTitle: string; courseSlug: string; issuedAt: string; verificationUrl: string | null }>;
}

export type PublicCareerProfile = Omit<CareerProfile, "email" | "isPublic"> & { publicSlug: string };

export interface UpdateCareerProfileInput {
  careerGoal?: string | null;
  preferredRoles?: string[];
  preferredWorkModes?: CareerWorkMode[];
  availabilityStatus?: CareerAvailabilityStatus | null;
  availableFrom?: string | null;
  publicSlug?: string | null;
  isPublic?: boolean;
}

export interface CreateSkillInput {
  name: string;
  level?: string | null;
  category?: string | null;
}

export interface CreatePortfolioInput {
  title: string;
  description?: string | null;
  projectUrl?: string | null;
  imageUrl?: string | null;
  image?: File | null;
  startDate?: string | null;
  endDate?: string | null;
}

export type UpdatePortfolioInput = Partial<CreatePortfolioInput>;

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});
const publicApiClient = new ApiClient();

export const profileService = {
  getCurrentProfile(): Promise<UserProfile | null> {
    return authenticatedApiClient.get<UserProfile | null>("/profile/me");
  },

  updateCurrentProfile(input: UpdateProfileInput): Promise<UserProfile> {
    return authenticatedApiClient.put<UserProfile>("/profile/me", { ...input });
  },

  getCareerProfile(): Promise<CareerProfile | null> {
    return authenticatedApiClient.get<CareerProfile | null>("/profile/career");
  },

  updateCareerProfile(input: UpdateCareerProfileInput): Promise<CareerProfile | null> {
    return authenticatedApiClient.put<CareerProfile | null>("/profile/career", { ...input });
  },

  getPublicCareerProfile(publicSlug: string): Promise<PublicCareerProfile> {
    return publicApiClient.get<PublicCareerProfile>(`/profiles/${encodeURIComponent(publicSlug)}/career`);
  },

  getLearningProfile(): Promise<LearningProfile | null> {
    return authenticatedApiClient.get<LearningProfile | null>("/profile/learning-profile");
  },

  updateLearningProfile(input: UpdateLearningProfileInput): Promise<LearningProfile | null> {
    return authenticatedApiClient.put<LearningProfile | null>("/profile/learning-profile", { ...input });
  },

  uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    return authenticatedApiClient.post<AvatarUploadResponse>(
      "/profile/avatar",
      formData,
    );
  },

  listSkills(): Promise<UserSkill[]> {
    return authenticatedApiClient.get<UserSkill[]>("/profile/skills");
  },

  addSkill(input: CreateSkillInput): Promise<UserSkill> {
    return authenticatedApiClient.post<UserSkill>("/profile/skills", { ...input });
  },

  deleteSkill(skillId: string): Promise<{ deleted: true }> {
    return authenticatedApiClient.delete<{ deleted: true }>(
      `/profile/skills/${skillId}`,
    );
  },

  listPortfolio(): Promise<PortfolioItem[]> {
    return authenticatedApiClient.get<PortfolioItem[]>("/profile/portfolio");
  },

  createPortfolio(input: CreatePortfolioInput): Promise<PortfolioItem> {
    return authenticatedApiClient.post<PortfolioItem>(
      "/profile/portfolio",
      toPortfolioFormData(input),
    );
  },

  updatePortfolio(
    portfolioId: string,
    input: UpdatePortfolioInput,
  ): Promise<PortfolioItem> {
    return authenticatedApiClient.put<PortfolioItem>(
      `/profile/portfolio/${portfolioId}`,
      toPortfolioFormData(input),
    );
  },

  deletePortfolio(portfolioId: string): Promise<{ deleted: true }> {
    return authenticatedApiClient.delete<{ deleted: true }>(
      `/profile/portfolio/${portfolioId}`,
    );
  },
};

export function toPortfolioFormData(input: UpdatePortfolioInput): FormData {
  const formData = new FormData();
  if (input.title !== undefined) formData.set("title", input.title);
  if (input.description !== undefined) formData.set("description", input.description ?? "");
  if (input.projectUrl !== undefined) formData.set("projectUrl", input.projectUrl ?? "");
  if (input.imageUrl !== undefined) formData.set("imageUrl", input.imageUrl ?? "");
  if (input.startDate !== undefined) formData.set("startDate", input.startDate ?? "");
  if (input.endDate !== undefined) formData.set("endDate", input.endDate ?? "");
  if (input.image instanceof File) formData.set("image", input.image);
  return formData;
}

export function getProfileErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Yêu cầu thất bại. Vui lòng thử lại.";
}
