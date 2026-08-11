import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type {
  AdminUser,
  AdminUserRole,
} from "../../../services/admin-users.service";
import { ADMIN_USER_ROLES, ROLE_LABELS, STATUS_LABELS } from "./admin-user-labels";

interface AdminUserDetailPanelProps {
  error: string | null;
  isLoading: boolean;
  isMutating: boolean;
  user: AdminUser | null;
  onClose: () => void;
  onRequestRoles: (roles: AdminUserRole[]) => void;
  onRequestStatus: (status: "active" | "suspended") => void;
  onRetry: () => void;
}

export function AdminUserDetailPanel({
  error,
  isLoading,
  isMutating,
  user,
  onClose,
  onRequestRoles,
  onRequestStatus,
  onRetry,
}: AdminUserDetailPanelProps) {
  const [roleDraft, setRoleDraft] = useState<AdminUserRole[]>([]);

  useEffect(() => {
    setRoleDraft(user?.roles ?? []);
  }, [user]);

  if (isLoading) {
    return (
      <aside
        aria-busy="true"
        aria-label="Đang tải chi tiết tài khoản"
        className="admin-user-detail admin-user-detail--loading"
      >
        <span />
        <span />
        <span />
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="admin-user-detail">
        <div className="admin-user-detail__error" role="alert">
          <AlertTriangle aria-hidden="true" />
          <p>{error}</p>
          <button onClick={onRetry} type="button">Thử lại</button>
        </div>
      </aside>
    );
  }

  if (!user) {
    return (
      <aside className="admin-user-detail admin-user-detail--empty">
        <p>Chọn một tài khoản để xem chi tiết và quản lý quyền truy cập.</p>
      </aside>
    );
  }

  const rolesChanged =
    roleDraft.length !== user.roles.length ||
    roleDraft.some((role) => !user.roles.includes(role));
  const nextStatus = user.status === "active" ? "suspended" : "active";

  function toggleRole(role: AdminUserRole) {
    setRoleDraft((current) =>
      current.includes(role)
        ? current.filter((value) => value !== role)
        : ADMIN_USER_ROLES.filter(
            (value) => current.includes(value) || value === role,
          ),
    );
  }

  return (
    <aside className="admin-user-detail" aria-label="Chi tiết tài khoản">
      <header className="admin-user-detail__header">
        <div>
          <p>Chi tiết tài khoản</p>
          <h2>{user.fullName}</h2>
          <span>{user.email}</span>
        </div>
        <button aria-label="Đóng chi tiết" onClick={onClose} type="button">
          <X aria-hidden="true" />
        </button>
      </header>

      <dl className="admin-user-detail__facts">
        <div><dt>Trạng thái</dt><dd>{STATUS_LABELS[user.status]}</dd></div>
        <div><dt>Đăng nhập</dt><dd>{user.authProvider === "google" ? "Google" : "Email"}</dd></div>
        <div><dt>Xác minh email</dt><dd>{user.emailVerified ? "Đã xác minh" : "Chưa xác minh"}</dd></div>
        <div><dt>Tạo lúc</dt><dd>{formatUserDate(user.createdAt)}</dd></div>
      </dl>

      <fieldset className="admin-user-detail__roles" disabled={isMutating}>
        <legend>Vai trò được cấp</legend>
        {ADMIN_USER_ROLES.map((role) => (
          <label key={role}>
            <input
              checked={roleDraft.includes(role)}
              onChange={() => toggleRole(role)}
              type="checkbox"
            />
            <span>{ROLE_LABELS[role]}</span>
          </label>
        ))}
      </fieldset>

      <div className="admin-user-detail__actions">
        <button
          disabled={!rolesChanged || roleDraft.length === 0 || isMutating}
          onClick={() => onRequestRoles(roleDraft)}
          type="button"
        >
          Lưu vai trò
        </button>
        <button
          className={nextStatus === "suspended" ? "admin-user-detail__danger" : undefined}
          disabled={isMutating}
          onClick={() => onRequestStatus(nextStatus)}
          type="button"
        >
          {nextStatus === "suspended"
            ? "Tạm ngưng tài khoản"
            : "Kích hoạt tài khoản"}
        </button>
      </div>
    </aside>
  );
}

function formatUserDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
    new Date(value),
  );
}
