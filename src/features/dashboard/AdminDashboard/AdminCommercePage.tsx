import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Archive, PackageSearch, ReceiptText, Save, Search } from "lucide-react";
import {
  adminCommerceService,
  getAdminCommerceErrorMessage,
  type CommerceCatalogItem,
  type CommerceCatalogPage,
  type CommerceCatalogQuery,
  type CommerceOrderDetail,
  type CommerceOrderPage,
  type CommerceOrderQuery,
} from "../../../services/admin-commerce.service";
import "./AdminCommercePage.css";

const PAGE_SIZE = 25;

export function AdminCommercePage() {
  const [mode, setMode] = useState<"catalog" | "orders">("catalog");

  return (
    <div className="admin-commerce-page">
      <header className="admin-commerce-header">
        <div>
          <p>Phase 3 · Commerce operations</p>
          <h1>Thương mại</h1>
          <span>Giá hiện tại có thể thay đổi; lịch sử đơn hàng luôn bất biến.</span>
        </div>
        <div className="admin-commerce-tabs" role="tablist" aria-label="Chế độ quản trị thương mại">
          <button aria-selected={mode === "catalog"} onClick={() => setMode("catalog")} role="tab" type="button"><PackageSearch aria-hidden="true" /> Danh mục</button>
          <button aria-selected={mode === "orders"} onClick={() => setMode("orders")} role="tab" type="button"><ReceiptText aria-hidden="true" /> Đơn hàng</button>
        </div>
      </header>
      {mode === "catalog" ? <CatalogOperations /> : <OrderOperations />}
    </div>
  );
}

function CatalogOperations() {
  const [query, setQuery] = useState<CommerceCatalogQuery>({ page: 1, pageSize: PAGE_SIZE });
  const [search, setSearch] = useState("");
  const [sellability, setSellability] = useState("");
  const [page, setPage] = useState<CommerceCatalogPage | null>(null);
  const [selected, setSelected] = useState<CommerceCatalogItem | null>(null);
  const [price, setPrice] = useState("");
  const [sellable, setSellable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const load = useCallback(async (request: CommerceCatalogQuery) => {
    const sequence = ++requestSequence.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminCommerceService.listCatalog(request);
      if (sequence !== requestSequence.current) return;
      setPage(result);
      setSelected((current) => current ? result.items.find((item) => item.id === current.id) ?? null : null);
    } catch (loadError) {
      if (sequence !== requestSequence.current) return;
      setPage(null);
      setError(getAdminCommerceErrorMessage(loadError));
    } finally {
      if (sequence === requestSequence.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(query); }, [load, query]);

  function choose(item: CommerceCatalogItem) {
    setSelected(item);
    setPrice(item.priceAmountMinor ?? "0");
    setSellable(item.product?.status === "ACTIVE");
    setError(null);
  }

  function filter(event: FormEvent) {
    event.preventDefault();
    setQuery({ page: 1, pageSize: PAGE_SIZE, search: search.trim() || undefined, sellability: sellability ? sellability as CommerceCatalogQuery["sellability"] : undefined });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const amount = Number(price);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      setError("Giá phải là số nguyên không âm trong giới hạn an toàn.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const updated = await adminCommerceService.updateCatalog(selected.id, {
        priceAmountMinor: amount,
        priceCurrency: "VND",
        sellable,
        expectedCourseUpdatedAt: selected.updatedAt,
      });
      setSelected(updated);
      setPrice(updated.priceAmountMinor ?? "0");
      setSellable(updated.product?.status === "ACTIVE");
      await load(query);
    } catch (saveError) {
      setError(getAdminCommerceErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  const archived = selected?.product?.status === "ARCHIVED";

  return (
    <section aria-labelledby="commerce-catalog-title">
      <form className="admin-commerce-filters" onSubmit={filter}>
        <label><span>Tìm khóa học</span><span className="admin-commerce-search"><Search aria-hidden="true" /><input aria-label="Tìm khóa học" onChange={(event) => setSearch(event.target.value)} placeholder="Tên, slug hoặc giảng viên" type="search" value={search} /></span></label>
        <label><span>Khả năng bán</span><select aria-label="Khả năng bán" onChange={(event) => setSellability(event.target.value)} value={sellability}><option value="">Tất cả</option><option value="sellable">Đang bán</option><option value="not_sellable">Chưa bán</option><option value="archived">Đã lưu trữ</option></select></label>
        <button type="submit">Áp dụng bộ lọc</button>
      </form>

      {error ? <p className="admin-commerce-error" role="alert"><AlertTriangle aria-hidden="true" />{error}</p> : null}
      <div className="admin-commerce-grid">
        <section className="admin-commerce-panel" aria-labelledby="commerce-catalog-title">
          <div className="admin-commerce-panel__heading"><div><PackageSearch aria-hidden="true" /><h2 id="commerce-catalog-title">Danh mục có thể bán</h2></div><span>{page?.total ?? 0} khóa học</span></div>
          {isLoading ? <p aria-busy="true" role="status">Đang tải danh mục…</p> : null}
          {!isLoading && !page?.items.length ? <p className="admin-commerce-empty">Không có khóa học phù hợp.</p> : null}
          <div className="admin-commerce-list">
            {page?.items.map((item) => <button aria-label={`Chỉnh sửa ${item.title}`} className={selected?.id === item.id ? "admin-commerce-list__item admin-commerce-list__item--active" : "admin-commerce-list__item"} key={item.id} onClick={() => choose(item)} type="button"><span><strong>{item.title}</strong><small>{item.instructor.fullName} · {formatMoney(item.priceAmountMinor, item.priceCurrency)}</small></span><Status value={item.product?.status ?? "NOT_LISTED"} /></button>)}
          </div>
          <Pagination page={page} loading={isLoading} onPage={(next) => setQuery((current) => ({ ...current, page: next }))} />
        </section>

        <section className="admin-commerce-panel" aria-label="Cấu hình danh mục">
          <div className="admin-commerce-panel__heading"><div><Save aria-hidden="true" /><h2>Cấu hình giá và bán</h2></div></div>
          {!selected ? <p className="admin-commerce-empty">Chọn một khóa học để cấu hình.</p> : (
            <form className="admin-commerce-form" onSubmit={save}>
              <div className="admin-commerce-course-summary"><strong>{selected.title}</strong><span>{selected.status} · {selected.visibility} · {selected.moderationStatus}</span><small>Cập nhật: {formatDate(selected.updatedAt)}</small></div>
              <label><span>Giá hiện tại (đồng)</span><input aria-label="Giá hiện tại (đồng)" disabled={archived || isSaving} inputMode="numeric" max={Number.MAX_SAFE_INTEGER} min="0" required step="1" type="number" value={price} onChange={(event) => setPrice(event.target.value)} /></label>
              <label className="admin-commerce-toggle"><input checked={sellable} disabled={archived || isSaving} onChange={(event) => setSellable(event.target.checked)} type="checkbox" /><span>Cho phép bán khóa học này</span></label>
              {sellable ? <p className="admin-commerce-note">Backend chỉ kích hoạt khi khóa học đã xuất bản, công khai, kiểm duyệt rõ ràng và có giá lớn hơn 0.</p> : null}
              {!sellable && selected.product?.status === "ACTIVE" ? <p className="admin-commerce-warning"><Archive aria-hidden="true" />Lưu thay đổi sẽ lưu trữ vĩnh viễn định danh sản phẩm. Không thể kích hoạt lại.</p> : null}
              {archived ? <p className="admin-commerce-warning"><Archive aria-hidden="true" />Sản phẩm đã lưu trữ và không thể kích hoạt lại.</p> : null}
              <button disabled={archived || isSaving} type="submit"><Save aria-hidden="true" />{isSaving ? "Đang lưu…" : "Lưu cấu hình"}</button>
            </form>
          )}
        </section>
      </div>
    </section>
  );
}

function OrderOperations() {
  const [query, setQuery] = useState<CommerceOrderQuery>({ page: 1, pageSize: PAGE_SIZE });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [fulfillment, setFulfillment] = useState("");
  const [page, setPage] = useState<CommerceOrderPage | null>(null);
  const [detail, setDetail] = useState<CommerceOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listSequence = useRef(0);
  const detailSequence = useRef(0);

  const load = useCallback(async (request: CommerceOrderQuery) => {
    const sequence = ++listSequence.current;
    setLoading(true); setError(null);
    try {
      const result = await adminCommerceService.listOrders(request);
      if (sequence === listSequence.current) setPage(result);
    }
    catch (loadError) { if (sequence === listSequence.current) { setPage(null); setError(getAdminCommerceErrorMessage(loadError)); } }
    finally { if (sequence === listSequence.current) setLoading(false); }
  }, []);
  useEffect(() => { void load(query); }, [load, query]);

  async function choose(orderId: string) {
    const sequence = ++detailSequence.current;
    setDetailLoading(true); setError(null);
    try { const result = await adminCommerceService.getOrder(orderId); if (sequence === detailSequence.current) setDetail(result); }
    catch (loadError) { if (sequence === detailSequence.current) { setDetail(null); setError(getAdminCommerceErrorMessage(loadError)); } }
    finally { if (sequence === detailSequence.current) setDetailLoading(false); }
  }

  function filter(event: FormEvent) {
    event.preventDefault();
    setQuery({ page: 1, pageSize: PAGE_SIZE, search: search.trim() || undefined, status: status || undefined, fulfillmentStatus: fulfillment || undefined });
  }

  return (
    <section aria-labelledby="commerce-orders-title">
      <form className="admin-commerce-filters admin-commerce-filters--orders" onSubmit={filter}>
        <label><span>Tìm đơn hàng</span><span className="admin-commerce-search"><Search aria-hidden="true" /><input aria-label="Tìm đơn hàng" onChange={(event) => setSearch(event.target.value)} placeholder="Mã đơn hoặc người mua" type="search" value={search} /></span></label>
        <label><span>Đơn hàng</span><select aria-label="Trạng thái đơn hàng" onChange={(event) => setStatus(event.target.value)} value={status}><option value="">Tất cả</option><option value="pending_payment">Chờ thanh toán</option><option value="confirmed">Đã xác nhận</option><option value="cancelled">Đã hủy</option><option value="expired">Hết hạn</option></select></label>
        <label><span>Fulfillment</span><select aria-label="Trạng thái fulfillment" onChange={(event) => setFulfillment(event.target.value)} value={fulfillment}><option value="">Tất cả</option><option value="not_started">Chưa bắt đầu</option><option value="processing">Đang xử lý</option><option value="fulfilled">Hoàn tất</option><option value="failed">Lỗi</option></select></label>
        <button type="submit">Áp dụng bộ lọc</button>
      </form>
      {error ? <p className="admin-commerce-error" role="alert"><AlertTriangle aria-hidden="true" />{error}</p> : null}
      <div className="admin-commerce-grid admin-commerce-grid--orders">
        <section className="admin-commerce-panel" aria-labelledby="commerce-orders-title">
          <div className="admin-commerce-panel__heading"><div><ReceiptText aria-hidden="true" /><h2 id="commerce-orders-title">Đơn hàng</h2></div><span>{page?.total ?? 0} đơn</span></div>
          {loading ? <p aria-busy="true" role="status">Đang tải đơn hàng…</p> : null}
          {!loading && !page?.items.length ? <p className="admin-commerce-empty">Không có đơn hàng phù hợp.</p> : null}
          <div className="admin-commerce-list">
            {page?.items.map((item) => <button aria-label={`Xem đơn ${item.orderNumber}`} className={detail?.id === item.id ? "admin-commerce-list__item admin-commerce-list__item--active" : "admin-commerce-list__item"} key={item.id} onClick={() => void choose(item.id)} type="button"><span><strong>{item.orderNumber}</strong><small>{item.buyer.fullName} · {formatMoney(item.payableAmountMinor, item.currency)}</small></span><span className="admin-commerce-status-stack"><Status value={item.status} /><Status value={item.fulfillmentStatus} /></span></button>)}
          </div>
          <Pagination page={page} loading={loading} onPage={(next) => setQuery((current) => ({ ...current, page: next }))} />
        </section>
        <section className="admin-commerce-panel admin-commerce-detail" aria-label="Chi tiết đơn hàng">
          {detailLoading ? <p aria-busy="true" role="status">Đang tải chi tiết…</p> : detail ? <OrderDetail detail={detail} /> : <p className="admin-commerce-empty">Chọn một đơn để xem lịch sử bất biến.</p>}
        </section>
      </div>
    </section>
  );
}

function OrderDetail({ detail }: { detail: CommerceOrderDetail }) {
  return <div className="admin-commerce-detail__content">
    <div className="admin-commerce-panel__heading"><div><ReceiptText aria-hidden="true" /><h2>{detail.orderNumber}</h2></div><Status value={detail.status} /></div>
    <dl className="admin-commerce-facts"><div><dt>Người mua</dt><dd>{detail.buyer.fullName}<small>{detail.buyer.email}</small></dd></div><div><dt>Phải trả</dt><dd>{formatMoney(detail.payableAmountMinor, detail.currency)}</dd></div><div><dt>Thanh toán</dt><dd>{detail.paymentStatus}</dd></div><div><dt>Fulfillment</dt><dd>{detail.fulfillmentStatus}</dd></div><div><dt>Chính sách giá</dt><dd>{detail.pricingPolicyVersion}</dd></div><div><dt>Tạo lúc</dt><dd>{formatDate(detail.createdAt)}</dd></div></dl>
    <h3>Dòng đơn hàng</h3>
    <div className="admin-commerce-detail__lines">{detail.lines.map((line) => <article key={line.id}><div><strong>{line.displayTitle}</strong><Status value={line.productType} /></div><span>{formatMoney(line.finalAmountMinor, line.currency)}</span><small>Giá niêm yết {formatMoney(line.unitListPriceAmountMinor, line.currency)} · giảm {formatMoney(line.discountAmountMinor, line.currency)}</small></article>)}</div>
    <h3>Thanh toán và settlement</h3>
    {!detail.paymentAttempts.length && !detail.settlements.length ? <p className="admin-commerce-empty">Chưa có bản ghi thanh toán.</p> : <ol className="admin-commerce-timeline">{detail.paymentAttempts.map((item) => <li key={item.id}><Status value={item.status} /><span>Payment attempt · {formatMoney(item.amountMinor, item.currency)}</span><time>{formatDate(item.createdAt)}</time></li>)}{detail.settlements.map((item) => <li key={item.id}><Status value={item.disposition} /><span>{item.kind} · {formatMoney(item.amountMinor, item.currency)}</span><time>{formatDate(item.recordedAt)}</time></li>)}</ol>}
    <h3>Lịch sử vòng đời</h3>
    {!detail.lifecycle.length ? <p className="admin-commerce-empty">Chưa có sự kiện vòng đời.</p> : <ol className="admin-commerce-timeline">{detail.lifecycle.map((event) => <li key={event.id}><Status value={event.nextStatus} /><span>{humanizeStatus(event.previousStatus ?? "CREATED")} → {humanizeStatus(event.nextStatus)}<small>{event.reasonCode ?? event.actorKind}</small></span><time>{formatDate(event.occurredAt)}</time></li>)}</ol>}
    <p className="admin-commerce-note">Trang này chỉ đọc. Không có dữ liệu bí mật, chữ ký, payload QR hoặc định danh thanh toán của nhà cung cấp.</p>
  </div>;
}

function Pagination({ page, loading, onPage }: { page: { page: number; total: number; totalPages: number } | null; loading: boolean; onPage: (page: number) => void }) {
  if (!page || page.total === 0) return null;
  return <nav className="admin-commerce-pagination" aria-label="Phân trang"><span>Trang {page.page} / {Math.max(page.totalPages, 1)}</span><div><button disabled={loading || page.page <= 1} onClick={() => onPage(page.page - 1)} type="button">Trước</button><button disabled={loading || page.page >= page.totalPages} onClick={() => onPage(page.page + 1)} type="button">Sau</button></div></nav>;
}

function Status({ value }: { value: string }) {
  return <em className={`admin-commerce-status admin-commerce-status--${value.toLowerCase()}`}>{humanizeStatus(value)}</em>;
}

function humanizeStatus(value: string) { return value.replace(/_/g, " "); }

function formatMoney(value: string | null, currency: string | null) {
  if (value === null || !currency) return "Chưa đặt giá";
  try { return `${BigInt(value).toLocaleString("vi-VN")} ${currency}`; }
  catch { return `${value} ${currency}`; }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
