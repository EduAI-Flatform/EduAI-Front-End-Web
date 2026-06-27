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
  startDate?: string | null;
  endDate?: string | null;
}

export type UpdatePortfolioInput = Partial<CreatePortfolioInput>;

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const profileService = {
  getCurrentProfile(): Promise<UserProfile | null> {
    return authenticatedApiClient.get<UserProfile | null>("/profile/me");
  },

  updateCurrentProfile(input: UpdateProfileInput): Promise<UserProfile> {
    return authenticatedApiClient.put<UserProfile>("/profile/me", { ...input });
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
    return authenticatedApiClient.post<PortfolioItem>("/profile/portfolio", {
      ...input,
    });
  },

  updatePortfolio(
    portfolioId: string,
    input: UpdatePortfolioInput,
  ): Promise<PortfolioItem> {
    return authenticatedApiClient.put<PortfolioItem>(
      `/profile/portfolio/${portfolioId}`,
      { ...input },
    );
  },

  deletePortfolio(portfolioId: string): Promise<{ deleted: true }> {
    return authenticatedApiClient.delete<{ deleted: true }>(
      `/profile/portfolio/${portfolioId}`,
    );
  },
};

export function getProfileErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Yêu cầu thất bại. Vui lòng thử lại.";
}
