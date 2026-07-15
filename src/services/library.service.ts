import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export type LibraryResourceType = "pdf" | "docx" | "pptx" | "video" | "image";
export type LibraryVisibility = "public" | "private";

export interface LibraryCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface LibraryTag {
  id: string;
  name: string;
  slug: string;
}

export interface LibraryResource {
  id: string;
  title: string;
  description: string | null;
  type: LibraryResourceType;
  fileUrl: string | null;
  externalUrl: string | null;
  visibility: LibraryVisibility;
  createdAt: string;
  updatedAt: string;
  category: Pick<LibraryCategory, "id" | "name" | "slug">;
  tags: Array<{ tag: LibraryTag }>;
}

export interface LibraryResourcePage {
  items: LibraryResource[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LibraryResourceQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  tagId?: string;
  type?: LibraryResourceType;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const libraryService = {
  listCategories(): Promise<LibraryCategory[]> {
    return authenticatedApiClient.get<LibraryCategory[]>("/library/categories");
  },

  listTags(): Promise<LibraryTag[]> {
    return authenticatedApiClient.get<LibraryTag[]>("/library/tags");
  },

  listResources(params: LibraryResourceQuery = {}): Promise<LibraryResourcePage> {
    const query = new URLSearchParams();
    query.set("page", String(params.page ?? 1));
    query.set("limit", String(params.limit ?? 12));
    if (params.search?.trim()) query.set("search", params.search.trim());
    if (params.categoryId) query.set("categoryId", params.categoryId);
    if (params.tagId) query.set("tagId", params.tagId);
    if (params.type) query.set("type", params.type);

    return authenticatedApiClient.get<LibraryResourcePage>(
      `/library/resources?${query.toString()}`,
    );
  },
};

export function getLibraryErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Không thể tải thư viện. Vui lòng thử lại.";
}
