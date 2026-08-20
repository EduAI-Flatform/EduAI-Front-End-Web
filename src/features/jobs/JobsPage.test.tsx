import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jobService } from "../../services/job.service";
import { JobsPage } from "./JobsPage";

vi.mock("../../services/job.service", async () => {
  const actual = await vi.importActual<typeof import("../../services/job.service")>("../../services/job.service");
  return { ...actual, jobService: { list: vi.fn() } };
});

describe("JobsPage", () => {
  beforeEach(() => vi.mocked(jobService.list).mockResolvedValue({
    items: [{ id: "job-id", title: "AI Engineer", companyName: "EduAI", summary: "Build learning products", location: "Hồ Chí Minh", workMode: "hybrid", employmentType: "full_time", salaryMin: null, salaryMax: null, salaryCurrency: null, publishedAt: "2026-08-20", closesAt: null, requiredSkills: [{ name: "TypeScript", level: null }] }],
    page: 1, pageSize: 12, total: 1, totalPages: 1,
  }));

  it("renders only API-provided active job cards and detail links", async () => {
    render(<MemoryRouter><JobsPage /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "AI Engineer" })).toBeVisible();
    expect(screen.getByText("TypeScript")).toBeVisible();
    expect(screen.getByRole("link", { name: "Xem chi tiết" })).toHaveAttribute("href", "/jobs/job-id");
  });
});
