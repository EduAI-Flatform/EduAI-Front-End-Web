import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminScholarshipService } from "../../../services/scholarship.service";
import { AdminScholarshipManagementPage } from "./AdminScholarshipManagementPage";

vi.mock("../../../services/scholarship.service", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../../services/scholarship.service")>();
  return { ...original, adminScholarshipService: { ...original.adminScholarshipService, list: vi.fn() } };
});

const listMock = vi.mocked(adminScholarshipService.list);

describe("AdminScholarshipManagementPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
  });

  it("loads the protected campaign management surface", async () => {
    render(<AdminScholarshipManagementPage />);
    expect(await screen.findByRole("heading", { name: "Quản lý học bổng" })).toBeInTheDocument();
    expect(screen.getByText("Chưa có chiến dịch.")).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledWith();
  });
});
