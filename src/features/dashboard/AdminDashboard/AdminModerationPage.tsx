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
          <p>Quản trị hệ thống</p>
          <h1>Kiểm duyệt nội dung</h1>
          <span>
            Xem bằng chứng, áp dụng quyết định có lý do và theo dõi lịch sử kiểm
            toán.
          </span>
        </div>
        <div className="admin-dashboard-home__scope">
          <ShieldCheck aria-hidden="true" />
          Chỉ quản trị viên nền tảng
        </div>
      </header>

      <form className="admin-moderation-filters" onSubmit={applyFilters}>
        <label>
          <span>Loại nội dung</span>
          <select
            aria-label="Loại nội dung"
            disabled={isLoading}
            onChange={(event) =>
              setTargetType(event.target.value as AdminModerationTargetType)
            }
            value={targetType}
          >
            {ADMIN_MODERATION_TARGET_TYPES.map((value) => (
              <option key={value} value={value}>
                {TARGET_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Trạng thái kiểm duyệt</span>
          <select
            aria-label="Trạng thái kiểm duyệt"
            disabled={isLoading}
            onChange={(event) =>
              setStatus(event.target.value as AdminModerationStatus | "")
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

        <label className="admin-moderation-filters__search">
          <span>Tìm nội dung</span>
          <span>
            <Search aria-hidden="true" />
            <input
              aria-label="Tìm nội dung"
              disabled={isLoading}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tiêu đề hoặc nội dung"
              type="search"
              value={search}
            />
          </span>
        </label>

        <button disabled={isLoading} type="submit">
          Áp dụng bộ lọc
        </button>
      </form>

      <div className="admin-moderation-workspace">
        <section className="admin-moderation-results" aria-live="polite">
          {isLoading ? (
            <ModerationLoading label="Đang tải hàng đợi kiểm duyệt" />
          ) : listError || !page ? (
            <div className="admin-dashboard-state" role="alert">
              <AlertTriangle aria-hidden="true" />
              <div>
                <h2>Chưa thể tải hàng đợi kiểm duyệt</h2>
                <p>{listError}</p>
              </div>
              <button onClick={() => void loadQueue(query)} type="button">
                Thử lại
              </button>
            </div>
          ) : page.items.length === 0 ? (
            <div className="admin-moderation-empty" role="status">
              <FileSearch aria-hidden="true" />
              <p>Không có nội dung phù hợp.</p>
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
  return (
    <div className="admin-moderation-table-wrap">
      <table className="admin-moderation-table">
        <caption className="sr-only">Hàng đợi kiểm duyệt nội dung</caption>
        <thead>
          <tr>
            <th>Nội dung</th>
            <th>Chủ sở hữu</th>
            <th>Trạng thái</th>
            <th>Cập nhật</th>
            <th><span className="sr-only">Hành động</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              className={selectedId === item.id ? "admin-moderation-table__row--selected" : undefined}
              key={item.id}
            >
              <td data-label="Nội dung">
                <strong>{item.title}</strong>
                <small>{TARGET_LABELS[item.targetType]}</small>
              </td>
              <td data-label="Chủ sở hữu">{item.owner.fullName}</td>
              <td data-label="Trạng thái"><ModerationStatusBadge status={item.moderationStatus} /></td>
              <td data-label="Cập nhật">{formatDate(item.updatedAt)}</td>
              <td data-label="Hành động">
                <button aria-label={`Xem ${item.title}`} onClick={() => onSelect(item)} type="button">Xem</button>
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
  if (isLoading) {
    return <aside className="admin-moderation-detail admin-moderation-loading" aria-busy="true"><span /><span /><span /></aside>;
  }

  if (error) {
    return (
      <aside className="admin-moderation-detail">
        <div className="admin-moderation-detail__error" role="alert">
          <AlertTriangle aria-hidden="true" /><p>{error}</p><button onClick={onRetry} type="button">Thử lại</button>
        </div>
      </aside>
    );
  }

  if (!detail) {
    return <aside className="admin-moderation-detail admin-moderation-detail--empty"><p>Chọn một nội dung để xem bằng chứng và lịch sử kiểm duyệt.</p></aside>;
  }

  const { item, history } = detail;
  const actions = ALLOWED_ACTIONS[item.targetType].filter(
    (action) => ACTION_STATUS[action] !== item.moderationStatus,
  );

  return (
    <aside className="admin-moderation-detail" aria-label="Chi tiết kiểm duyệt">
      <header className="admin-moderation-detail__header">
        <div><p>{TARGET_LABELS[item.targetType]}</p><h2>{item.title}</h2><span>{item.owner.fullName}</span></div>
        <button aria-label="Đóng chi tiết" onClick={onClose} type="button"><X aria-hidden="true" /></button>
      </header>

      <div className="admin-moderation-detail__content">{item.content || "Không có nội dung mô tả."}</div>

      <dl className="admin-moderation-detail__facts">
        <div><dt>Trạng thái</dt><dd><ModerationStatusBadge status={item.moderationStatus} /></dd></div>
        <div><dt>Lý do hiện tại</dt><dd>{item.moderationReason || "—"}</dd></div>
        <div><dt>Kiểm duyệt lúc</dt><dd>{item.moderatedAt ? formatDate(item.moderatedAt) : "—"}</dd></div>
      </dl>

      <section className="admin-moderation-detail__actions" aria-label="Hành động kiểm duyệt">
        <h3>Quyết định</h3>
        <div>
          {actions.map((action) => (
            <button
              className={action === "restore" ? "admin-moderation-action--restore" : undefined}
              disabled={isMutating}
              key={action}
              onClick={() => onAction(action)}
              type="button"
            >
              {ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      </section>

      <section className="admin-moderation-history">
        <h3>Lịch sử kiểm duyệt</h3>
        {history.length === 0 ? <p>Chưa có quyết định kiểm duyệt.</p> : (
          <ol>
            {history.map((entry) => (
              <li key={entry.id}>
                <strong>{historyStatus(entry.metadataJson)}</strong>
                <span>{historyReason(entry.metadataJson)}</span>
                <small>{entry.actor?.fullName ?? entry.actorKind} · {formatDate(entry.occurredAt)}</small>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  );
}

function ModerationStatusBadge({ status }: { status: AdminModerationStatus }) {
  return <span className={`admin-moderation-status admin-moderation-status--${status}`}>{STATUS_LABELS[status]}</span>;
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
  return (
    <nav className="admin-moderation-pagination" aria-label="Phân trang kiểm duyệt">
      <span>Trang {page.page} / {Math.max(page.totalPages, 1)} · {page.total} nội dung</span>
      <div>
        <button disabled={disabled || page.page <= 1} onClick={() => onPage(page.page - 1)} type="button">Trang trước</button>
        <button disabled={disabled || page.page >= page.totalPages} onClick={() => onPage(page.page + 1)} type="button">Trang sau</button>
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
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
