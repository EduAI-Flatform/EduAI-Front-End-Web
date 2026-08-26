import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertTriangle, Search, ShieldCheck } from "lucide-react";
import {
  ADMIN_AUDIT_ACTIONS,
  adminAuditService,
  getAdminAuditErrorMessage,
  type AdminAuditLogItem,
  type AdminAuditLogPage as AuditPage,
  type AdminAuditLogQuery,
} from "../../../services/admin-audit.service";

const INITIAL_QUERY: AdminAuditLogQuery = { page: 1, pageSize: 25 };

export function AdminAuditLogPage() {
  const [query, setQuery] = useState<AdminAuditLogQuery>(INITIAL_QUERY);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [page, setPage] = useState<AuditPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAuditLogs = useCallback(async (request: AdminAuditLogQuery) => {
    setIsLoading(true);
    setError(null);

    try {
      setPage(await adminAuditService.list(request));
    } catch (loadError) {
      setPage(null);
      setError(getAdminAuditErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAuditLogs(query);
  }, [loadAuditLogs, query]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery({
      page: 1,
      pageSize: INITIAL_QUERY.pageSize,
      search: search.trim() || undefined,
      action: action || undefined,
      targetType: targetType.trim() || undefined,
    });
  }

  return (
    <div className="admin-audit-page">
      <header className="admin-audit-page__header">
        <div>
          <p>Quản trị hệ thống</p>
          <h1>Nhật ký kiểm toán</h1>
          <span>Theo dõi các hành động nhạy cảm trên toàn nền tảng.</span>
        </div>
        <div className="admin-dashboard-home__scope">
          <ShieldCheck aria-hidden="true" />
          Chỉ quản trị viên nền tảng
        </div>
      </header>

      <form className="admin-audit-filters" onSubmit={applyFilters}>
        <label className="admin-audit-filters__search">
          <span>Tìm nhật ký</span>
          <span>
            <Search aria-hidden="true" />
            <input
              aria-label="Tìm nhật ký"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Người thực hiện, hành động hoặc đối tượng"
              type="search"
              value={search}
            />
          </span>
        </label>

        <label>
          <span>Hành động</span>
          <select
            aria-label="Hành động"
            onChange={(event) => setAction(event.target.value)}
            value={action}
          >
            <option value="">Tất cả hành động</option>
            {ADMIN_AUDIT_ACTIONS.map((auditAction) => (
              <option key={auditAction} value={auditAction}>
                {auditAction}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Loại đối tượng</span>
          <input
            aria-label="Loại đối tượng"
            onChange={(event) => setTargetType(event.target.value)}
            placeholder="course, user…"
            value={targetType}
          />
        </label>

        <button type="submit">Áp dụng bộ lọc</button>
      </form>

      <section className="admin-audit-results" aria-live="polite">
        {isLoading ? (
          <AdminAuditLoading />
        ) : error || !page ? (
          <div className="admin-dashboard-state" role="alert">
            <AlertTriangle aria-hidden="true" />
            <div>
              <h2>Chưa thể tải nhật ký kiểm toán</h2>
              <p>{error}</p>
            </div>
            <button onClick={() => void loadAuditLogs(query)} type="button">
              Thử lại
            </button>
          </div>
        ) : page.items.length === 0 ? (
          <p className="admin-audit-empty" role="status">
            Không có bản ghi kiểm toán phù hợp.
          </p>
        ) : (
          <AdminAuditTable items={page.items} />
        )}
      </section>

      {page && page.total > 0 ? (
        <nav className="admin-audit-pagination" aria-label="Phân trang nhật ký">
          <span>
            Trang {page.page} / {Math.max(page.totalPages, 1)} · {page.total} bản ghi
          </span>
          <div>
            <button
              disabled={page.page <= 1 || isLoading}
              onClick={() =>
                setQuery((current) => ({ ...current, page: current.page - 1 }))
              }
              type="button"
            >
              Trang trước
            </button>
            <button
              disabled={page.page >= page.totalPages || isLoading}
              onClick={() =>
                setQuery((current) => ({ ...current, page: current.page + 1 }))
              }
              type="button"
            >
              Trang sau
            </button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function AdminAuditTable({ items }: { items: AdminAuditLogItem[] }) {
  return (
    <div className="admin-audit-table-wrap">
      <table className="admin-audit-table">
        <caption className="sr-only">Danh sách bản ghi kiểm toán nền tảng</caption>
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Người thực hiện</th>
            <th>Hành động</th>
            <th>Đối tượng</th>
            <th>Metadata</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td data-label="Thời gian">
                <time dateTime={item.occurredAt}>
                  {formatAuditDate(item.occurredAt)}
                </time>
              </td>
              <td data-label="Người thực hiện">
                <strong>{item.actor?.fullName ?? item.actorKind}</strong>
                {item.actor ? <small>{item.actor.email}</small> : null}
              </td>
              <td data-label="Hành động">
                <code>{item.action}</code>
              </td>
              <td data-label="Đối tượng">
                <strong>{item.targetType}</strong>
                <small>{item.targetId}</small>
              </td>
              <td data-label="Metadata">{formatAuditMetadata(item.metadataJson)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminAuditLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải nhật ký kiểm toán"
      className="admin-audit-loading"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function formatAuditDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatAuditMetadata(metadata: Record<string, unknown>): string {
  const entries = Object.entries(metadata);
  if (entries.length === 0) return "—";

  return entries
    .map(([key, value]) =>
      `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`,
    )
    .join(" · ");
}
