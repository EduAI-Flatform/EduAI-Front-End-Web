import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adminUsersService,
  type AdminUser,
  type AdminUserPage,
} from "./admin-users.service";

const user: AdminUser = {
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

afterEach(() => {
  vi.unstubAllGlobals();
});

function successfulResponse<T>(data: T) {
  return new Response(
    JSON.stringify({ success: true, data, message: "OK" }),
    { headers: { "Content-Type": "application/json" }, status: 200 },
  );
}

describe("adminUsersService", () => {
  it("loads a bounded filtered user page", async () => {
    const page: AdminUserPage = {
      items: [user],
      page: 2,
      pageSize: 25,
      total: 26,
      totalPages: 2,
    };
    const fetchMock = vi.fn().mockResolvedValue(successfulResponse(page));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      adminUsersService.list({
        page: 2,
        pageSize: 25,
        search: "learner example",
        role: "student",
        status: "active",
      }),
    ).resolves.toEqual(page);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/api\/v1\/admin\/users\?page=2&pageSize=25&search=learner\+example&role=student&status=active$/,
      ),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("loads user detail and sends explicit status and role patches", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => successfulResponse(user));
    vi.stubGlobal("fetch", fetchMock);

    await expect(adminUsersService.get(user.id)).resolves.toEqual(user);
    await expect(
      adminUsersService.updateStatus(user.id, "suspended"),
    ).resolves.toEqual(user);
    await expect(
      adminUsersService.updateRoles(user.id, ["student", "instructor"]),
    ).resolves.toEqual(user);

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/api\/v1\/admin\/users\/.+\/status$/),
      expect.objectContaining({
        body: JSON.stringify({ status: "suspended" }),
        method: "PATCH",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching(/\/api\/v1\/admin\/users\/.+\/roles$/),
      expect.objectContaining({
        body: JSON.stringify({ roles: ["student", "instructor"] }),
        method: "PATCH",
      }),
    );
  });
});
