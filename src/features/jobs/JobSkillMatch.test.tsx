import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { JobSkillMatch } from "./JobSkillMatch";

describe("JobSkillMatch", () => {
  it("explains deterministic fit, missing skills, and course recommendations", () => {
    render(<MemoryRouter><JobSkillMatch match={{
      job: { id: "job-id", title: "Backend Engineer", companyName: "EduAI" },
      fitScore: 50,
      matchedSkills: [{ name: "TypeScript", requiredLevel: "advanced", learnerLevel: "intermediate" }],
      missingSkills: [{ name: "NestJS", requiredLevel: null, learnerLevel: null, reason: "missing" }],
      explanation: "1 of 2 required skills match your stored skill profile.",
      courseRecommendations: [{ id: "course-id", title: "NestJS Foundations", slug: "nestjs-foundations", thumbnailUrl: null, level: "beginner", matchedMissingSkills: ["NestJS"] }],
    }} /></MemoryRouter>);
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("NestJS")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Học NestJS Foundations" })).toHaveAttribute("href", "/courses/course-id");
  });
});
