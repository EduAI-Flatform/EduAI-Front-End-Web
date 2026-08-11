import type { AdminUser } from "../../../services/admin-users.service";
import { ROLE_LABELS, STATUS_LABELS } from "./admin-user-labels";

interface AdminUserTableProps {
  items: AdminUser[];
  selectedUserId?: string;
  onSelect: (userId: string) => void;
}

export function AdminUserTable({
  items,
  selectedUserId,
  onSelect,
}: AdminUserTableProps) {
  return (
    <div className="admin-user-table-wrap">
      <table className="admin-user-table">
        <caption className="sr-only">Danh sách tài khoản nền tảng</caption>
        <thead>
          <tr>
            <th>Người dùng</th>
            <th>Vai trò</th>
            <th>Trạng thái</th>
            <th>Xác thực</th>
            <th><span className="sr-only">Hành động</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              className={
                item.id === selectedUserId ? "admin-user-table__row--selected" : undefined
              }
              key={item.id}
            >
              <td data-label="Người dùng">
                <strong>{item.fullName}</strong>
                <small>{item.email}</small>
              </td>
              <td data-label="Vai trò">
                <div className="admin-user-badges">
                  {item.roles.map((role) => (
                    <span className="admin-user-badge" key={role}>
                      {ROLE_LABELS[role]}
                    </span>
                  ))}
                </div>
              </td>
              <td data-label="Trạng thái">
                <span className={`admin-user-status admin-user-status--${item.status}`}>
                  {STATUS_LABELS[item.status]}
                </span>
              </td>
              <td data-label="Xác thực">
                {item.authProvider === "google" ? "Google" : "Email"}
                <small>{item.emailVerified ? "Đã xác minh" : "Chưa xác minh"}</small>
              </td>
              <td data-label="Hành động">
                <button
                  aria-label={`Xem chi tiết ${item.fullName}`}
                  className="admin-user-table__detail-button"
                  onClick={() => onSelect(item.id)}
                  type="button"
                >
                  Xem chi tiết
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
