import { SystemValue } from '@/features/platform/SystemText';
import { currentSystemLocale } from "../../platform/translate-system-message";
import { SystemText, useSystemMessages } from "../../platform/SystemText";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  FileSearch,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  ADMIN_MODERATION_TARGET_TYPES,
  adminModerationService,
  getAdminModerationErrorMessage,
  type AdminModerationAction,
  type AdminModerationDetail,
  type AdminModerationItem,
  type AdminModerationPage as ModerationPage,
  type AdminModerationQuery,
  type AdminModerationStatus,
  type AdminModerationTargetType,
} from "../../../services/admin-moderation.service";
import { AdminModerationDialog } from "./AdminModerationDialog";
import "./AdminModerationPage.css";

const INITIAL_QUERY: AdminModerationQuery = {
  targetType: "course",
  page: 1,
  pageSize: 25,
};

const TARGET_LABELS: Record<AdminModerationTargetType, string> = {
  course: "Khóa học",
  library_resource: "Tài nguyên thư viện",
  community_post: "Bài viết cộng đồng",
  community_comment: "Bình luận cộng đồng",
};

const STATUS_LABELS: Record<AdminModerationStatus, string> = {
  clear: "Bình thường",
  hidden: "Đã ẩn",
  rejected: "Đã từ chối",
  archived: "Đã lưu trữ",
};

const ACTION_LABELS: Record<AdminModerationAction, string> = {
  hide: "Ẩn",
  reject: "Từ chối",
  archive: "Lưu trữ",
  restore: "Khôi phục",
};

const ACTION_STATUS: Record<AdminModerationAction, AdminModerationStatus> = {
  hide: "hidden",
  reject: "rejected",
  archive: "archived",
  restore: "clear",
};

const ALLOWED_ACTIONS: Record<
  AdminModerationTargetType,
  AdminModerationAction[]
> = {
  course: ["reject", "archive", "restore"],
  library_resource: ["hide", "reject", "archive", "restore"],
  community_post: ["hide", "reject", "restore"],
  community_comment: ["hide", "reject", "restore"],
};

export function AdminModerationPage() {
  const messageForUi = useSystemMessages();
  const [query, setQuery] = useState<AdminModerationQuery>(INITIAL_QUERY);
  const [targetType, setTargetType] =
    useState<AdminModerationTargetType>(INITIAL_QUERY.targetType);
  const [status, setStatus] = useState<AdminModerationStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState<ModerationPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [detail, setDetail] = useState<AdminModerationDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] =
    useState<AdminModerationAction | null>(null);
  const [reason, setReason] = useState("");
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const detailRequestId = useRef(0);

  const loadQueue = useCallback(async (request: AdminModerationQuery) => {
    setIsLoading(true);
    setListError(null);
    try {
      setPage(await adminModerationService.list(request));
    } catch (error) {
      setPage(null);
      setListError(getAdminModerationErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue(query);
  }, [loadQueue, query]);

  async function selectTarget(item: AdminModerationItem) {
    const requestId = ++detailRequestId.current;
    setSelectedId(item.id);
    setDetail(null);
    setDetailError(null);
    setIsDetailLoading(true);
    try {
      const nextDetail = await adminModerationService.get(
        item.targetType,
        item.id,
      );
      if (requestId !== detailRequestId.current) return;
      setDetail(nextDetail);
    } catch (error) {
      if (requestId !== detailRequestId.current) return;
      setDetailError(getAdminModerationErrorMessage(error));
    } finally {
      if (requestId === detailRequestId.current) setIsDetailLoading(false);
    }
  }

  function clearSelection() {
    detailRequestId.current += 1;
    setSelectedId(undefined);
    setDetail(null);
    setDetailError(null);
    setIsDetailLoading(false);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearSelection();
    setQuery({
      targetType,
      status: status || undefined,
      search: search.trim() || undefined,
      page: 1,
      pageSize: INITIAL_QUERY.pageSize,
    });
  }

  function requestAction(action: AdminModerationAction) {
    setReason("");
    setMutationError(null);
    setPendingAction(action);
  }

  async function confirmMutation() {
    if (!detail || !pendingAction || reason.trim().length < 3) return;
    const target = detail.item;
    setIsMutating(true);
    setMutationError(null);
    try {
      const updated = await adminModerationService.moderate(
        target.targetType,
        target.id,
        { action: pendingAction, reason: reason.trim() },
      );
      setDetail((current) => (current ? { ...current, item: updated } : current));
      setPage((current) =>
        current
          ? {
              ...current,
              items: current.items.map((candidate) =>
                candidate.id === updated.id ? updated : candidate,
              ),
            }
          : current,
      );
      setPendingAction(null);
      setReason("");
      await Promise.all([
        loadQueue(query),
        adminModerationService
          .get(target.targetType, target.id)
          .then((refreshed) => setDetail(refreshed)),
      ]);
    } catch (error) {
      setMutationError(getAdminModerationErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="admin-moderation-page">
      <header className="admin-moderation-page__header">
        <div>
          <p><SystemText message={"Quản trị hệ thống"} /></p>
          <h1><SystemText message={"Kiểm duyệt nội dung"} /></h1>
          <span>
            <SystemText message={"Xem bằng chứng, áp dụng quyết định có lý do và theo dõi lịch sử kiểm toán."} />
          </span>
        </div>
        <div className="admin-dashboard-home__scope">
          <ShieldCheck aria-hidden="true" />
          <SystemText message={"Chỉ quản trị viên nền tảng"} />
        </div>
      </header>

      <form className="admin-moderation-filters" onSubmit={applyFilters}>
        <label>
          <span><SystemText message={"Loại nội dung"} /></span>
          <select
            aria-label={messageForUi("Loại nội dung")}
            disabled={isLoading}
            onChange={(event) =>
              setTargetType(event.target.value as AdminModerationTargetType)
            }
            value={targetType}
          >
            {ADMIN_MODERATION_TARGET_TYPES.map((value) => (
              <option key={value} value={value}>
                <SystemText message={TARGET_LABELS[value]} />
              </option>
            ))}
          </select>
        </label>

        <label>
          <span><SystemText message={"Trạng thái kiểm duyệt"} /></span>
          <select
            aria-label={messageForUi("Trạng thái kiểm duyệt")}
            disabled={isLoading}
            onChange={(event) =>
              setStatus(event.target.value as AdminModerationStatus | "")
            }
            value={status}
          >
            <option value=""><SystemText message={"Tất cả trạng thái"} /></option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-moderation-filters__search">
          <span><SystemText message={"Tìm nội dung"} /></span>
          <span>
            <Search aria-hidden="true" />
            <input
              aria-label={messageForUi("Tìm nội dung")}
              disabled={isLoading}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={messageForUi("Tiêu đề hoặc nội dung")}
              type="search"
              value={search}
            />
          </span>
        </label>

        <button disabled={isLoading} type="submit">
          <SystemText message={"Áp dụng bộ lọc"} />
        </button>
      </form>

      <div className="admin-moderation-workspace">
        <section className="admin-moderation-results" aria-live="polite">
          {isLoading ? (
            <ModerationLoading label={messageForUi("Đang tải hàng đợi kiểm duyệt")} />
          ) : listError || !page ? (
            <div className="admin-dashboard-state" role="alert">
              <AlertTriangle aria-hidden="true" />
              <div>
                <h2><SystemText message={"Chưa thể tải hàng đợi kiểm duyệt"} /></h2>
                <p><SystemText message={listError} /></p>
              </div>
              <button onClick={() => void loadQueue(query)} type="button"><SystemText message="Thử lại" /></button>
            </div>
          ) : page.items.length === 0 ? (
            <div className="admin-moderation-empty" role="status">
              <FileSearch aria-hidden="true" />
              <p><SystemText message={"Không có nội dung phù hợp."} /></p>
            </div>
          ) : (
            <ModerationTable
              items={page.items}
              onSelect={(item) => void selectTarget(item)}
              selectedId={selectedId}
            />
          )}
        </section>

        <ModerationDetailPanel
          detail={detail}
          error={detailError}
          isLoading={isDetailLoading}
          isMutating={isMutating}
          onAction={requestAction}
          onClose={clearSelection}
          onRetry={() => {
            const selected = page?.items.find((item) => item.id === selectedId);
            if (selected) void selectTarget(selected);
          }}
        />
      </div>

      {page && page.total > 0 ? (
        <ModerationPagination
          disabled={isLoading}
          onPage={(nextPage) => {
            clearSelection();
            setQuery((current) => ({ ...current, page: nextPage }));
          }}
          page={page}
        />
      ) : null}

      <AdminModerationDialog
        actionLabel={pendingAction ? ACTION_LABELS[pendingAction] : "Thay đổi"}
        error={mutationError}
        isSubmitting={isMutating}
        onCancel={() => {
          setPendingAction(null);
          setMutationError(null);
          setReason("");
        }}
        onConfirm={() => void confirmMutation()}
        onReasonChange={setReason}
        open={Boolean(pendingAction && detail)}
        reason={reason}
        targetTitle={detail?.item.title ?? ""}
      />
    </div>
  );
}

function ModerationTable({
  items,
  selectedId,
  onSelect,
}: {
  items: AdminModerationItem[];
  selectedId?: string;
  onSelect: (item: AdminModerationItem) => void;
}) {
  const messageForUi = useSystemMessages();
  return (
    <div className="admin-moderation-table-wrap">
      <table className="admin-moderation-table">
        <caption className="sr-only"><SystemText message={"Hàng đợi kiểm duyệt nội dung"} /></caption>
        <thead>
          <tr>
            <th><SystemText message="Nội dung" /></th>
            <th><SystemText message={"Chủ sở hữu"} /></th>
            <th><SystemText message="Trạng thái" /></th>
            <th><SystemText message="Cập nhật" /></th>
            <th><span className="sr-only"><SystemText message="Hành động" /></span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              className={selectedId === item.id ? "admin-moderation-table__row--selected" : undefined}
              key={item.id}
            >
              <td data-label={messageForUi("Nội dung")}>
                <strong>{item.title}</strong>
                <small><SystemText message={TARGET_LABELS[item.targetType]} /></small>
              </td>
              <td data-label={messageForUi("Chủ sở hữu")}>{item.owner.fullName}</td>
              <td data-label={messageForUi("Trạng thái")}><ModerationStatusBadge status={item.moderationStatus} /></td>
              <td data-label={messageForUi("Cập nhật")}><SystemValue render={() => (formatDate(item.updatedAt))} /></td>
              <td data-label={messageForUi("Hành động")}>
                <button aria-label={`Xem ${item.title}`} onClick={() => onSelect(item)} type="button"><SystemText message={"Xem"} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModerationDetailPanel({
  detail,
  error,
  isLoading,
  isMutating,
  onAction,
  onClose,
  onRetry,
}: {
  detail: AdminModerationDetail | null;
  error: string | null;
  isLoading: boolean;
  isMutating: boolean;
  onAction: (action: AdminModerationAction) => void;
  onClose: () => void;
  onRetry: () => void;
}) {
  const messageForUi = useSystemMessages();
  if (isLoading) {
    return <aside className="admin-moderation-detail admin-moderation-loading" aria-busy="true"><span /><span /><span /></aside>;
  }

  if (error) {
    return (
      <aside className="admin-moderation-detail">
        <div className="admin-moderation-detail__error" role="alert">
          <AlertTriangle aria-hidden="true" /><p>{error}</p><button onClick={onRetry} type="button"><SystemText message="Thử lại" /></button>
        </div>
      </aside>
    );
  }

  if (!detail) {
    return <aside className="admin-moderation-detail admin-moderation-detail--empty"><p><SystemText message={"Chọn một nội dung để xem bằng chứng và lịch sử kiểm duyệt."} /></p></aside>;
  }

  const { item, history } = detail;
  const actions = ALLOWED_ACTIONS[item.targetType].filter(
    (action) => ACTION_STATUS[action] !== item.moderationStatus,
  );

  return (
    <aside className="admin-moderation-detail" aria-label={messageForUi("Chi tiết kiểm duyệt")}>
      <header className="admin-moderation-detail__header">
        <div><p><SystemText message={TARGET_LABELS[item.targetType]} /></p><h2>{item.title}</h2><span>{item.owner.fullName}</span></div>
        <button aria-label={messageForUi("Đóng chi tiết")} onClick={onClose} type="button"><X aria-hidden="true" /></button>
      </header>

      <div className="admin-moderation-detail__content">{item.content || <SystemText message={"Không có nội dung mô tả."} />}</div>

      <dl className="admin-moderation-detail__facts">
        <div><dt><SystemText message="Trạng thái" /></dt><dd><ModerationStatusBadge status={item.moderationStatus} /></dd></div>
        <div><dt><SystemText message={"Lý do hiện tại"} /></dt><dd>{item.moderationReason || "—"}</dd></div>
        <div><dt><SystemText message={"Kiểm duyệt lúc"} /></dt><dd><SystemValue render={() => (item.moderatedAt ? formatDate(item.moderatedAt) : "—")} /></dd></div>
      </dl>

      <section className="admin-moderation-detail__actions" aria-label={messageForUi("Hành động kiểm duyệt")}>
        <h3><SystemText message={"Quyết định"} /></h3>
        <div>
          {actions.map((action) => (
            <button
              className={action === "restore" ? "admin-moderation-action--restore" : undefined}
              disabled={isMutating}
              key={action}
              onClick={() => onAction(action)}
              type="button"
            >
              <SystemText message={ACTION_LABELS[action]} />
            </button>
          ))}
        </div>
      </section>

      <section className="admin-moderation-history">
        <h3><SystemText message={"Lịch sử kiểm duyệt"} /></h3>
        {history.length === 0 ? <p><SystemText message={"Chưa có quyết định kiểm duyệt."} /></p> : (
          <ol>
            {history.map((entry) => (
              <li key={entry.id}>
                <strong>{historyStatus(entry.metadataJson)}</strong>
                <span>{historyReason(entry.metadataJson)}</span>
                <small>{entry.actor?.fullName ?? entry.actorKind} · <SystemValue render={() => (formatDate(entry.occurredAt))} /></small>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  );
}

function ModerationStatusBadge({ status }: { status: AdminModerationStatus }) {
  return <span className={`admin-moderation-status admin-moderation-status--${status}`}><SystemText message={STATUS_LABELS[status]} /></span>;
}

function ModerationLoading({ label }: { label: string }) {
  return <div aria-busy="true" aria-label={label} className="admin-moderation-loading">{Array.from({ length: 5 }, (_, index) => <span key={index} />)}</div>;
}

function ModerationPagination({
  disabled,
  onPage,
  page,
}: {
  disabled: boolean;
  onPage: (page: number) => void;
  page: ModerationPage;
}) {
  const messageForUi = useSystemMessages();
  return (
    <nav className="admin-moderation-pagination" aria-label={messageForUi("Phân trang kiểm duyệt")}>
      <span><SystemText message={"Trang"} /> {page.page} / {Math.max(page.totalPages, 1)} · {page.total} <SystemText message={"nội dung"} /></span>
      <div>
        <button disabled={disabled || page.page <= 1} onClick={() => onPage(page.page - 1)} type="button"><SystemText message={"Trang trước"} /></button>
        <button disabled={disabled || page.page >= page.totalPages} onClick={() => onPage(page.page + 1)} type="button"><SystemText message={"Trang sau"} /></button>
      </div>
    </nav>
  );
}

function historyReason(metadata: Record<string, unknown>): string {
  return typeof metadata.reason === "string" ? metadata.reason : "Không có lý do";
}

function historyStatus(metadata: Record<string, unknown>): string {
  const status = metadata.newStatus;
  return typeof status === "string" && status in STATUS_LABELS
    ? STATUS_LABELS[status as AdminModerationStatus]
    : "Đã thay đổi";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(currentSystemLocale(), { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
