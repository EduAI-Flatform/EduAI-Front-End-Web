import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import type {
  AdminUserQuery,
  AdminUserRole,
  AdminUserStatus,
} from "../../../services/admin-users.service";
import { ADMIN_USER_ROLES, ROLE_LABELS, STATUS_LABELS } from "./admin-user-labels";

interface AdminUserFiltersProps {
  disabled: boolean;
  onApply: (filters: Omit<AdminUserQuery, "page" | "pageSize">) => void;
}

export function AdminUserFilters({ disabled, onApply }: AdminUserFiltersProps) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AdminUserRole | "">("");
  const [status, setStatus] = useState<AdminUserStatus | "">("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply({
      search: search.trim() || undefined,
      role: role || undefined,
      status: status || undefined,
    });
  }

  return (
    <form className="admin-user-filters" onSubmit={submit}>
      <label className="admin-user-filters__search">
        <span>Tìm người dùng</span>
        <span>
          <Search aria-hidden="true" />
          <input
            disabled={disabled}
            maxLength={120}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Họ tên hoặc email"
            type="search"
            value={search}
          />
        </span>
      </label>

      <label>
        <span>Vai trò</span>
        <select
          disabled={disabled}
          onChange={(event) => setRole(event.target.value as AdminUserRole | "")}
          value={role}
        >
          <option value="">Tất cả vai trò</option>
          {ADMIN_USER_ROLES.map((value) => (
            <option key={value} value={value}>
              {ROLE_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Trạng thái</span>
        <select
          disabled={disabled}
          onChange={(event) =>
            setStatus(event.target.value as AdminUserStatus | "")
          }
          value={status}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <button disabled={disabled} type="submit">
        Áp dụng bộ lọc
      </button>
    </form>
  );
}
