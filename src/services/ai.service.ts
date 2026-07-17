import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export interface AiSource {
  embeddingId: string;
  sourceType: "lesson" | "library_resource";
  sourceId: string;
  title: string;
  chunkText: string;
  similarity: number;
  metadata: Record<string, unknown>;
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
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const aiService = {
  sendChat(input: { message: string; conversationId?: string }): Promise<AiChatResponse> {
    return authenticatedApiClient.post<AiChatResponse>("/ai/chat", input);
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
