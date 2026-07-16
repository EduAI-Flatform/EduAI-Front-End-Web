import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export interface CommunityAuthor {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  visibility: "public" | "private";
  status: string;
  createdAt: string;
  updatedAt: string;
  author: CommunityAuthor;
}

export interface CreateCommunityPostInput {
  title: string;
  content: string;
  visibility?: "public" | "private";
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const communityService = {
  listPosts(): Promise<CommunityPost[]> {
    return authenticatedApiClient.get<CommunityPost[]>("/community/posts");
  },

  createPost(input: CreateCommunityPostInput): Promise<CommunityPost> {
    return authenticatedApiClient.post<CommunityPost>("/community/posts", {
      title: input.title.trim(),
      content: input.content.trim(),
      visibility: input.visibility ?? "public",
    });
  },
};

export function getCommunityErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Không thể tải cộng đồng. Vui lòng thử lại.";
}
