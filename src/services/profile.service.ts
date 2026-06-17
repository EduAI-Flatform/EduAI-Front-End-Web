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
