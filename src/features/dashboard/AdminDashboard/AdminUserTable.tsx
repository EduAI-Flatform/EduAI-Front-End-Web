import { SystemText, useSystemMessages } from "../../platform/SystemText";
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
  const messageForUi = useSystemMessages();
  return (
    <div className="admin-user-table-wrap">
      <table className="admin-user-table">
        <caption className="sr-only"><SystemText message={"Danh sách tài khoản nền tảng"} /></caption>
        <thead>
          <tr>
            <th><SystemText message={"Người dùng"} /></th>
            <th><SystemText message={"Vai trò"} /></th>
            <th><SystemText message="Trạng thái" /></th>
            <th><SystemText message={"Xác thực"} /></th>
            <th><span className="sr-only"><SystemText message="Hành động" /></span></th>
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
              <td data-label={messageForUi("Người dùng")}>
                <strong>{item.fullName}</strong>
                <small>{item.email}</small>
              </td>
              <td data-label={messageForUi("Vai trò")}>
                <div className="admin-user-badges">
                  {item.roles.map((role) => (
                    <span className="admin-user-badge" key={role}>
                      <SystemText message={ROLE_LABELS[role]} />
                    </span>
                  ))}
                </div>
              </td>
              <td data-label={messageForUi("Trạng thái")}>
                <span className={`admin-user-status admin-user-status--${item.status}`}>
                  <SystemText message={STATUS_LABELS[item.status]} />
                </span>
              </td>
              <td data-label={messageForUi("Xác thực")}>
                {item.authProvider === "google" ? "Google" : "Email"}
                <small>{item.emailVerified ? <SystemText message={"Đã xác minh"} /> : <SystemText message={"Chưa xác minh"} />}</small>
              </td>
              <td data-label={messageForUi("Hành động")}>
                <button
                  aria-label={`${messageForUi("Xem chi tiết ")}${item.fullName}`}
                  className="admin-user-table__detail-button"
                  onClick={() => onSelect(item.id)}
                  type="button"
                ><SystemText message="Xem chi tiết" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
