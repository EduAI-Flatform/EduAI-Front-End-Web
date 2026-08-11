import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ShieldCheck, Users } from "lucide-react";
import {
  adminUsersService,
  getAdminUserErrorMessage,
  type AdminUser,
  type AdminUserPage,
  type AdminUserQuery,
  type AdminUserRole,
} from "../../../services/admin-users.service";
import { AdminUserConfirmationDialog } from "./AdminUserConfirmationDialog";
import { AdminUserDetailPanel } from "./AdminUserDetailPanel";
import { AdminUserFilters } from "./AdminUserFilters";
import { AdminUserTable } from "./AdminUserTable";
import { ROLE_LABELS } from "./admin-user-labels";
import "./AdminUserManagementPage.css";

const INITIAL_QUERY: AdminUserQuery = { page: 1, pageSize: 25 };

type PendingMutation =
  | { kind: "status"; status: "active" | "suspended" }
  | { kind: "roles"; roles: AdminUserRole[] };

export function AdminUserManagementPage() {
  const [query, setQuery] = useState<AdminUserQuery>(INITIAL_QUERY);
  const [page, setPage] = useState<AdminUserPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [pendingMutation, setPendingMutation] = useState<PendingMutation | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const detailRequestId = useRef(0);

  const loadUsers = useCallback(async (request: AdminUserQuery) => {
    setIsLoading(true);
    setListError(null);
    try {
      setPage(await adminUsersService.list(request));
    } catch (error) {
      setPage(null);
      setListError(getAdminUserErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers(query);
  }, [loadUsers, query]);

  async function selectUser(userId: string) {
    const requestId = ++detailRequestId.current;
    setSelectedUserId(userId);
    setSelectedUser(null);
    setDetailError(null);
    setIsDetailLoading(true);
    try {
      const user = await adminUsersService.get(userId);
      if (requestId !== detailRequestId.current) return;
      setSelectedUser(user);
    } catch (error) {
      if (requestId !== detailRequestId.current) return;
      setDetailError(getAdminUserErrorMessage(error));
    } finally {
      if (requestId === detailRequestId.current) {
        setIsDetailLoading(false);
      }
    }
  }

  function clearSelection() {
    detailRequestId.current += 1;
    setSelectedUserId(undefined);
    setSelectedUser(null);
    setDetailError(null);
    setIsDetailLoading(false);
  }

  function applyFilters(
    filters: Omit<AdminUserQuery, "page" | "pageSize">,
  ) {
    setQuery({ ...INITIAL_QUERY, ...filters });
    clearSelection();
  }

  async function confirmMutation() {
    if (!pendingMutation || !selectedUser) return;
    setIsMutating(true);
    setMutationError(null);

    try {
      const updated =
        pendingMutation.kind === "status"
          ? await adminUsersService.updateStatus(
              selectedUser.id,
              pendingMutation.status,
            )
          : await adminUsersService.updateRoles(
              selectedUser.id,
              pendingMutation.roles,
            );
      setSelectedUser(updated);
      setPage((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
      );
      setPendingMutation(null);
    } catch (error) {
      setMutationError(getAdminUserErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  }

  const dialogCopy = getDialogCopy(pendingMutation, selectedUser);

  return (
    <div className="admin-user-page">
      <header className="admin-user-page__header">
        <div>
          <p>Quản trị hệ thống</p>
          <h1>Quản lý người dùng</h1>
          <span>Tìm kiếm tài khoản, kiểm tra quyền và xử lý trạng thái an toàn.</span>
        </div>
        <div className="admin-dashboard-home__scope">
          <ShieldCheck aria-hidden="true" />
          Chỉ quản trị viên nền tảng
        </div>
      </header>

      <AdminUserFilters disabled={isLoading} onApply={applyFilters} />

      <div className="admin-user-page__workspace">
        <section className="admin-user-results" aria-live="polite">
          {isLoading ? (
            <AdminUserLoading />
          ) : listError || !page ? (
            <div className="admin-dashboard-state" role="alert">
              <AlertTriangle aria-hidden="true" />
              <div><h2>Chưa thể tải danh sách tài khoản</h2><p>{listError}</p></div>
              <button onClick={() => void loadUsers(query)} type="button">Thử lại</button>
            </div>
          ) : page.items.length === 0 ? (
            <div className="admin-user-empty" role="status">
              <Users aria-hidden="true" />
              <p>Không có tài khoản phù hợp.</p>
            </div>
          ) : (
            <AdminUserTable
              items={page.items}
              onSelect={(userId) => void selectUser(userId)}
              selectedUserId={selectedUserId}
            />
          )}
        </section>

        <AdminUserDetailPanel
          error={detailError}
          isLoading={isDetailLoading}
          isMutating={isMutating}
          onClose={clearSelection}
          onRequestRoles={(roles) => {
            setMutationError(null);
            setPendingMutation({ kind: "roles", roles });
          }}
          onRequestStatus={(status) => {
            setMutationError(null);
            setPendingMutation({ kind: "status", status });
          }}
          onRetry={() => {
            if (selectedUserId) void selectUser(selectedUserId);
          }}
          user={selectedUser}
        />
      </div>

      {page && page.total > 0 ? (
        <AdminUserPagination
          disabled={isLoading}
          onPage={(nextPage) => {
            clearSelection();
            setQuery((current) => ({ ...current, page: nextPage }));
          }}
          page={page}
        />
      ) : null}

      <AdminUserConfirmationDialog
        description={dialogCopy.description}
        error={mutationError}
        isSubmitting={isMutating}
        onCancel={() => {
          setPendingMutation(null);
          setMutationError(null);
        }}
        onConfirm={() => void confirmMutation()}
        open={Boolean(pendingMutation)}
        title={dialogCopy.title}
      />
    </div>
  );
}

function AdminUserLoading() {
  return (
    <div aria-busy="true" aria-label="Đang tải danh sách người dùng" className="admin-user-loading">
      {Array.from({ length: 5 }, (_, index) => <span key={index} />)}
    </div>
  );
}

function AdminUserPagination({
  disabled,
  onPage,
  page,
}: {
  disabled: boolean;
  onPage: (page: number) => void;
  page: AdminUserPage;
}) {
  return (
    <nav aria-label="Phân trang người dùng" className="admin-user-pagination">
      <span>Trang {page.page} / {Math.max(page.totalPages, 1)} · {page.total} tài khoản</span>
      <div>
        <button disabled={disabled || page.page <= 1} onClick={() => onPage(page.page - 1)} type="button">Trang trước</button>
        <button disabled={disabled || page.page >= page.totalPages} onClick={() => onPage(page.page + 1)} type="button">Trang sau</button>
      </div>
    </nav>
  );
}

function getDialogCopy(
  mutation: PendingMutation | null,
  user: AdminUser | null,
): { description: string; title: string } {
  if (!mutation || !user) return { description: "", title: "Xác nhận thay đổi" };
  if (mutation.kind === "status") {
    return mutation.status === "suspended"
      ? {
          title: "Xác nhận tạm ngưng",
          description: `Tài khoản ${user.email} sẽ mất quyền truy cập và các phiên làm việc hiện tại sẽ bị thu hồi.`,
        }
      : {
          title: "Xác nhận kích hoạt",
          description: `Tài khoản ${user.email} sẽ có thể đăng nhập lại.`,
        };
  }

  return {
    title: "Xác nhận thay đổi vai trò",
    description: `Cấp cho ${user.email}: ${mutation.roles.map((role) => ROLE_LABELS[role]).join(", ")}. Các phiên hiện tại sẽ bị thu hồi.`,
  };
}
