import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobDetailPage } from "./JobDetailPage";

const state = vi.hoisted(() => ({ roles: ["student"] as string[], get: vi.fn(), match: vi.fn() }));
vi.mock("../auth/auth-store", () => ({ useAuthSession: () => ({ user: { roles: state.roles } }) }));
vi.mock("../../services/job.service", () => ({
  getJobError: (error: unknown) => error instanceof Error ? error.message : "error",
  jobService: { get: state.get, match: state.match, save: vi.fn(), apply: vi.fn() },
}));

describe("JobDetailPage matching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.roles = ["student"];
    state.get.mockResolvedValue({ id: "job-id", title: "Backend Engineer", companyName: "EduAI", summary: "Summary", description: "Description", location: null, workMode: "remote", employmentType: "internship", salaryMin: null, salaryMax: null, salaryCurrency: null, publishedAt: null, closesAt: null, requiredSkills: [{ name: "TypeScript", level: null }] });
    state.match.mockResolvedValue({ job: { id: "job-id", title: "Backend Engineer", companyName: "EduAI" }, fitScore: 100, explanation: "1 of 1 required skills match your stored skill profile.", matchedSkills: [{ name: "TypeScript", requiredLevel: null, learnerLevel: "advanced" }], missingSkills: [], courseRecommendations: [] });
  });

  function renderPage() {
    return render(<MemoryRouter initialEntries={["/jobs/job-id"]}><Routes><Route path="/jobs/:jobId" element={<JobDetailPage />} /></Routes></MemoryRouter>);
  }

  it("loads and renders the authenticated learner match", async () => {
    renderPage();
    expect(await screen.findByText("100%")).toBeInTheDocument();
    expect(state.match).toHaveBeenCalledWith("job-id");
  });

  it("does not request private matching for a non-student session", async () => {
    state.roles = ["platform_admin"];
    renderPage();
    expect(await screen.findByRole("heading", { name: "Backend Engineer" })).toBeInTheDocument();
    await waitFor(() => expect(state.match).not.toHaveBeenCalled());
    expect(screen.getByText("Chỉ tài khoản học viên có thể ứng tuyển.")).toBeInTheDocument();
  });
});
