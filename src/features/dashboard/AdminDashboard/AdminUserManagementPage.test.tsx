import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AdminUser,
  AdminUserPage,
} from "../../../services/admin-users.service";
import { AdminUserManagementPage } from "./AdminUserManagementPage";

const usersApi = vi.hoisted(() => ({
  get: vi.fn(),
  list: vi.fn(),
  updateRoles: vi.fn(),
  updateStatus: vi.fn(),
}));

vi.mock("../../../services/admin-users.service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../../services/admin-users.service")
  >();
  return { ...actual, adminUsersService: usersApi };
});

const account: AdminUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "learner@example.com",
  fullName: "Learner Example",
  status: "active",
  authProvider: "local",
  emailVerified: true,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
  roles: ["student"],
};

const instructorAccount: AdminUser = {
  ...account,
  id: "22222222-2222-4222-8222-222222222222",
  email: "teacher@example.com",
  fullName: "Instructor Example",
  roles: ["instructor"],
};

const page: AdminUserPage = {
  items: [account],
  page: 1,
  pageSize: 25,
  total: 1,
  totalPages: 1,
};

describe("AdminUserManagementPage", () => {
  beforeEach(() => {
    Object.values(usersApi).forEach((mock) => mock.mockReset());
    usersApi.list.mockResolvedValue(page);
    usersApi.get.mockResolvedValue(account);
    usersApi.updateStatus.mockResolvedValue({
      ...account,
      status: "suspended",
    });
    usersApi.updateRoles.mockResolvedValue({
      ...account,
      roles: ["instructor", "student"],
    });
  });

  it("renders live users and applies search, role, and status filters", async () => {
    const user = userEvent.setup();
    render(<AdminUserManagementPage />);

    expect(
      await screen.findByRole("heading", { name: "Quản lý người dùng" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Learner Example")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Tìm người dùng"), "learner");
    await user.selectOptions(screen.getByLabelText("Vai trò"), "student");
    await user.selectOptions(screen.getByLabelText("Trạng thái"), "active");
    await user.click(screen.getByRole("button", { name: "Áp dụng bộ lọc" }));

    await waitFor(() => {
      expect(usersApi.list).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 25,
        search: "learner",
        role: "student",
        status: "active",
      });
    });
  });

  it("requires confirmation before suspending an account", async () => {
    const user = userEvent.setup();
    render(<AdminUserManagementPage />);

    await user.click(
      await screen.findByRole("button", {
        name: "Xem chi tiết Learner Example",
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "Learner Example" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Tạm ngưng tài khoản" }),
    );

    expect(usersApi.updateStatus).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Xác nhận tạm ngưng" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Xác nhận thay đổi" }));

    await waitFor(() => {
      expect(usersApi.updateStatus).toHaveBeenCalledWith(
        account.id,
        "suspended",
      );
    });
    expect((await screen.findAllByText("Tạm ngưng")).length).toBeGreaterThan(0);
  });

  it("requires confirmation before assigning another role", async () => {
    const user = userEvent.setup();
    render(<AdminUserManagementPage />);

    await user.click(
      await screen.findByRole("button", {
        name: "Xem chi tiết Learner Example",
      }),
    );
    await screen.findByRole("heading", { name: "Learner Example" });
    await user.click(screen.getByRole("checkbox", { name: "Giảng viên" }));
    await user.click(screen.getByRole("button", { name: "Lưu vai trò" }));

    expect(usersApi.updateRoles).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Xác nhận thay đổi" }));
    await waitFor(() => {
      expect(usersApi.updateRoles).toHaveBeenCalledWith(account.id, [
        "student",
        "instructor",
      ]);
    });
  });

  it("keeps a rejected account mutation visible for administrator review", async () => {
    usersApi.updateStatus.mockRejectedValue(
      new Error("Không thể tạm ngưng quản trị viên cuối cùng."),
    );
    const user = userEvent.setup();
    render(<AdminUserManagementPage />);

    await user.click(
      await screen.findByRole("button", {
        name: "Xem chi tiết Learner Example",
      }),
    );
    await screen.findByRole("heading", { name: "Learner Example" });
    await user.click(
      screen.getByRole("button", { name: "Tạm ngưng tài khoản" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Xác nhận thay đổi" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể tạm ngưng quản trị viên cuối cùng.",
    );
    expect(
      screen.getByRole("dialog", { name: "Xác nhận tạm ngưng" }),
    ).toBeInTheDocument();
  });

  it("keeps the newest account selected when detail responses arrive out of order", async () => {
    const firstRequest = deferred<AdminUser>();
    const secondRequest = deferred<AdminUser>();
    usersApi.list.mockResolvedValue({
      ...page,
      items: [account, instructorAccount],
      total: 2,
    });
    usersApi.get.mockImplementation((userId: string) =>
      userId === account.id ? firstRequest.promise : secondRequest.promise,
    );
    const user = userEvent.setup();
    render(<AdminUserManagementPage />);

    await user.click(
      await screen.findByRole("button", {
        name: "Xem chi tiết Learner Example",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Xem chi tiết Instructor Example",
      }),
    );
    secondRequest.resolve(instructorAccount);
    expect(
      await screen.findByRole("heading", { name: "Instructor Example" }),
    ).toBeInTheDocument();

    await act(async () => {
      firstRequest.resolve(account);
      await firstRequest.promise;
    });
    expect(
      screen.getByRole("heading", { name: "Instructor Example" }),
    ).toBeInTheDocument();
  });

  it("shows API errors and retries the same query", async () => {
    usersApi.list
      .mockRejectedValueOnce(new Error("Không thể kết nối API"))
      .mockResolvedValueOnce(page);
    const user = userEvent.setup();
    render(<AdminUserManagementPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể kết nối API",
    );
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Learner Example")).toBeInTheDocument();
    expect(usersApi.list).toHaveBeenCalledTimes(2);
  });

  it("shows an explicit empty state", async () => {
    usersApi.list.mockResolvedValue({ ...page, items: [], total: 0, totalPages: 0 });
    render(<AdminUserManagementPage />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Không có tài khoản phù hợp.",
    );
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });

  return { promise, resolve };
}
