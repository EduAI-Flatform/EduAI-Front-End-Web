import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export interface AiSource {
  embeddingId: string;
  sourceType: "lesson" | "library_resource";
  sourceId: string;
  title: string;
  chunkText: string;
  similarity: number;
  courseId: string | null;
  citationPath: string;
  metadata: Record<string, unknown>;
}

export interface AiSelectableSource {
  sourceType: "lesson" | "library_resource";
  sourceId: string;
  title: string;
  description: string | null;
  courseId?: string;
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tokenCount: number | null;
  model: string | null;
  createdAt: string;
}

export interface AiChatResponse {
  conversationId: string;
  message: AiMessage;
  sources: AiSource[];
  grounding: "sourced" | "general";
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const aiService = {
  sendChat(input: {
    message: string;
    conversationId?: string;
    contextType?: "course";
    contextId?: string;
  }): Promise<AiChatResponse> {
    return authenticatedApiClient.post<AiChatResponse>("/ai/chat", input);
  },
  listSources(sourceType: "lesson" | "library_resource"): Promise<AiSelectableSource[]> {
    return authenticatedApiClient.get<AiSelectableSource[]>(`/ai/sources?sourceType=${sourceType}`);
  },
};

export function getAiErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 429) return "Bạn đã đạt giới hạn AI trong ngày. Hãy thử lại vào ngày mai.";
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    return error.message;
  }
  return "Không thể kết nối với AI. Vui lòng thử lại.";
}
