import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LessonAssistant } from "./LessonAssistant";

const aiMocks = vi.hoisted(() => ({
  summarize: vi.fn(),
  generateFlashcards: vi.fn(),
}));

vi.mock("../../../../services/ai.service", () => ({
  aiService: { sendChat: vi.fn() },
  getAiErrorMessage: () => "AI error",
}));

vi.mock("../../../../services/ai-tools.service", () => ({
  aiToolsService: aiMocks,
}));

describe("LessonAssistant", () => {
  it("loads lesson-grounded summary and flashcards through existing AI APIs", async () => {
    aiMocks.summarize.mockResolvedValue({
      sourceType: "lesson",
      sourceId: "lesson-1",
      title: "Neural Networks",
      summary: "Một bản tóm tắt có nguồn từ bài học.",
    });
    aiMocks.generateFlashcards.mockResolvedValue({
      sourceType: "lesson",
      sourceId: "lesson-1",
      flashcards: [{ id: "card-1", front: "Neuron", back: "Đơn vị xử lý thông tin." }],
    });

    render(<LessonAssistant lessonId="lesson-1" lessonTitle="Neural Networks" />);

    fireEvent.click(screen.getByRole("button", { name: "Tạo tóm tắt" }));
    await waitFor(() => expect(screen.getByText("Một bản tóm tắt có nguồn từ bài học.")).toBeInTheDocument());
    expect(aiMocks.summarize).toHaveBeenCalledWith({ sourceType: "lesson", sourceId: "lesson-1" });

    fireEvent.click(screen.getByRole("button", { name: "Tạo flashcard" }));
    await waitFor(() => expect(screen.getByText("Đơn vị xử lý thông tin.")).toBeInTheDocument());
    expect(aiMocks.generateFlashcards).toHaveBeenCalledWith({ sourceType: "lesson", sourceId: "lesson-1" });
  });
});
