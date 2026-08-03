import { ApiClient } from "./api-client";
import { getAuthSession } from "./auth.service";

export type AiSourceType = "lesson" | "library_resource";

export interface AiToolInput {
  sourceType: AiSourceType;
  sourceId: string;
  count?: number;
}

export interface AiSource {
  sourceType: AiSourceType;
  sourceId: string;
  title: string;
  description: string | null;
  courseId?: string;
}

export interface AiSummaryResponse {
  sourceType: AiSourceType;
  sourceId: string;
  title: string;
  summary: string;
}

export interface AiQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface AiQuizResponse {
  quizId: string;
  sourceType: AiSourceType;
  sourceId: string;
  questions: AiQuizQuestion[];
}

export interface AiFlashcard {
  id: string;
  front: string;
  back: string;
}

export interface AiFlashcardsResponse {
  sourceType: AiSourceType;
  sourceId: string;
  flashcards: AiFlashcard[];
}

const apiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const aiToolsService = {
  listSources(sourceType: AiSourceType, search?: string): Promise<AiSource[]> {
    const query = new URLSearchParams({ sourceType });

    if (search?.trim()) {
      query.set("search", search.trim());
    }

    return apiClient.get<AiSource[]>(`/ai/sources?${query.toString()}`);
  },

  summarize(input: AiToolInput) {
    return apiClient.post<AiSummaryResponse>("/ai/summary", { ...input });
  },
  generateQuiz(input: AiToolInput) {
    return apiClient.post<AiQuizResponse>("/ai/quiz-generator", { ...input });
  },
  generateFlashcards(input: AiToolInput) {
    return apiClient.post<AiFlashcardsResponse>("/ai/flashcards", { ...input });
  },
};
