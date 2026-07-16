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

export interface CommunityComment {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  author: CommunityAuthor;
}

export interface UpdateCommunityPostInput {
  title?: string;
  content?: string;
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

  updatePost(postId: string, input: UpdateCommunityPostInput): Promise<CommunityPost> {
    return authenticatedApiClient.put<CommunityPost>(`/community/posts/${postId}`, {
      title: input.title?.trim(),
      content: input.content?.trim(),
    });
  },

  deletePost(postId: string): Promise<void> {
    return authenticatedApiClient.delete<void>(`/community/posts/${postId}`);
  },

  listComments(postId: string): Promise<CommunityComment[]> {
    return authenticatedApiClient.get<CommunityComment[]>(`/community/posts/${postId}/comments`);
  },

  createComment(postId: string, content: string, parentId?: string): Promise<CommunityComment> {
    return authenticatedApiClient.post<CommunityComment>(`/community/posts/${postId}/comments`, {
      content: content.trim(),
      ...(parentId ? { parentId } : {}),
    });
  },

  deleteComment(commentId: string): Promise<void> {
    return authenticatedApiClient.delete<void>(`/community/comments/${commentId}`);
  },

  likePost(postId: string): Promise<void> {
    return authenticatedApiClient.post<void>(`/community/posts/${postId}/reactions`);
  },

  unlikePost(postId: string): Promise<void> {
    return authenticatedApiClient.delete<void>(`/community/posts/${postId}/reactions`);
  },
};

export function getCommunityErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Không thể tải cộng đồng. Vui lòng thử lại.";
}
