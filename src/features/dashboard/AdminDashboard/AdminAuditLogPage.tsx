import { SystemValue } from '@/features/platform/SystemText';
import { currentSystemLocale } from "../../platform/translate-system-message";
import { useSystemMessages } from "../../platform/SystemText";
import { SystemText } from "../../platform/SystemText";
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
  const messageForUi = useSystemMessages();
  const translateUI = useSystemMessages();

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
          <p><SystemText message={"Quản trị hệ thống"} /></p>
          <h1><SystemText message={"Nhật ký kiểm toán"} /></h1>
          <span><SystemText message={"Theo dõi các hành động nhạy cảm trên toàn nền tảng."} /></span>
        </div>
        <div className="admin-dashboard-home__scope">
          <ShieldCheck aria-hidden="true" />
          <SystemText message={"Chỉ quản trị viên nền tảng"} />
        </div>
      </header>

      <form className="admin-audit-filters" onSubmit={applyFilters}>
        <label className="admin-audit-filters__search">
          <span><SystemText message={"Tìm nhật ký"} /></span>
          <span>
            <Search aria-hidden="true" />
            <input
              aria-label={messageForUi("Tìm nhật ký")}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={messageForUi("Người thực hiện, hành động hoặc đối tượng")}
              type="search"
              value={search}
            />
          </span>
        </label>

        <label>
          <span><SystemText message="Hành động" /></span>
          <select
            aria-label={translateUI("Hành động")}
            onChange={(event) => setAction(event.target.value)}
            value={action}
          >
            <option value=""><SystemText message={"Tất cả hành động"} /></option>
            {ADMIN_AUDIT_ACTIONS.map((auditAction) => (
              <option key={auditAction} value={auditAction}>
                {auditAction}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span><SystemText message={"Loại đối tượng"} /></span>
          <input
            aria-label={messageForUi("Loại đối tượng")}
            onChange={(event) => setTargetType(event.target.value)}
            placeholder={messageForUi("khóa học, người dùng…")}
            value={targetType}
          />
        </label>

        <button type="submit"><SystemText message={"Áp dụng bộ lọc"} /></button>
      </form>

      <section className="admin-audit-results" aria-live="polite">
        {isLoading ? (
          <AdminAuditLoading />
        ) : error || !page ? (
          <div className="admin-dashboard-state" role="alert">
            <AlertTriangle aria-hidden="true" />
            <div>
              <h2><SystemText message={"Chưa thể tải nhật ký kiểm toán"} /></h2>
              <p><SystemText message={error} /></p>
            </div>
            <button onClick={() => void loadAuditLogs(query)} type="button"><SystemText message="Thử lại" /></button>
          </div>
        ) : page.items.length === 0 ? (
          <p className="admin-audit-empty" role="status">
            <SystemText message={"Không có bản ghi kiểm toán phù hợp."} />
          </p>
        ) : (
          <AdminAuditTable items={page.items} />
        )}
      </section>

      {page && page.total > 0 ? (
        <nav className="admin-audit-pagination" aria-label={messageForUi("Phân trang nhật ký")}>
          <span>
            <SystemText message={"Trang"} /> {page.page} / {Math.max(page.totalPages, 1)} · {page.total} <SystemText message={"bản ghi"} />
          </span>
          <div>
            <button
              disabled={page.page <= 1 || isLoading}
              onClick={() =>
                setQuery((current) => ({ ...current, page: current.page - 1 }))
              }
              type="button"
            >
              <SystemText message={"Trang trước"} />
            </button>
            <button
              disabled={page.page >= page.totalPages || isLoading}
              onClick={() =>
                setQuery((current) => ({ ...current, page: current.page + 1 }))
              }
              type="button"
            >
              <SystemText message={"Trang sau"} />
            </button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function AdminAuditTable({ items }: { items: AdminAuditLogItem[] }) {
  const messageForUi = useSystemMessages();
  return (
    <div className="admin-audit-table-wrap">
      <table className="admin-audit-table">
        <caption className="sr-only"><SystemText message={"Danh sách bản ghi kiểm toán nền tảng"} /></caption>
        <thead>
          <tr>
            <th><SystemText message="Thời gian" /></th>
            <th><SystemText message={"Người thực hiện"} /></th>
            <th><SystemText message="Hành động" /></th>
            <th><SystemText message={"Đối tượng"} /></th>
            <th><SystemText message={"Siêu dữ liệu"} /></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td data-label={messageForUi("Thời gian")}>
                <time dateTime={item.occurredAt}>
                  <SystemValue render={() => (formatAuditDate(item.occurredAt))} />
                </time>
              </td>
              <td data-label={messageForUi("Người thực hiện")}>
                <strong>{item.actor?.fullName ?? item.actorKind}</strong>
                {item.actor ? <small>{item.actor.email}</small> : null}
              </td>
              <td data-label={messageForUi("Hành động")}>
                <code>{item.action}</code>
              </td>
              <td data-label={messageForUi("Đối tượng")}>
                <strong>{item.targetType}</strong>
                <small>{item.targetId}</small>
              </td>
              <td data-label={messageForUi("Siêu dữ liệu")}><SystemValue render={() => (formatAuditMetadata(item.metadataJson))} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminAuditLoading() {
  const messageForUi = useSystemMessages();
  return (
    <div
      aria-busy="true"
      aria-label={messageForUi("Đang tải nhật ký kiểm toán")}
      className="admin-audit-loading"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function formatAuditDate(value: string): string {
  return new Intl.DateTimeFormat(currentSystemLocale(), {
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
