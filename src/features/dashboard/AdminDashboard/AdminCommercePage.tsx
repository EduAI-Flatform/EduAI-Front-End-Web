import { SystemValue } from '@/features/platform/SystemText';
import { currentSystemLocale } from "../../platform/translate-system-message";
import { SystemText, useSystemMessages } from "../../platform/SystemText";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Archive, PackageSearch, ReceiptText, RefreshCw, Save, Search, ShieldAlert } from "lucide-react";
import {
  adminCommerceService,
  getAdminCommerceErrorMessage,
  type CommerceCatalogItem,
  type CommerceCatalogPage,
  type CommerceCatalogQuery,
  type CommerceOrderDetail,
  type CommerceOrderPage,
  type CommerceOrderQuery,
  type PaymentReview,
  type PaymentReviewPage,
} from "../../../services/admin-commerce.service";
import "./AdminCommercePage.css";
import { RefundOperations } from "./RefundOperations";

const PAGE_SIZE = 25;

export function AdminCommercePage() {
  const messageForUi = useSystemMessages();
  const [mode, setMode] = useState<"catalog" | "orders" | "reviews" | "refunds">("catalog");

  return (
    <div className="admin-commerce-page">
      <header className="admin-commerce-header">
        <div>
          <p><SystemText message={"Quản lý bán hàng"} /></p>
          <h1><SystemText message={"Thương mại"} /></h1>
          <span><SystemText message={"Theo dõi đơn hàng, thanh toán và hoàn tiền."} /></span>
        </div>
        <div className="admin-commerce-tabs" role="tablist" aria-label={messageForUi("Chế độ quản trị thương mại")}>
          <button aria-selected={mode === "catalog"} onClick={() => setMode("catalog")} role="tab" type="button"><PackageSearch aria-hidden="true" />{" "}<SystemText message="Danh mục" /></button>
          <button aria-selected={mode === "orders"} onClick={() => setMode("orders")} role="tab" type="button"><ReceiptText aria-hidden="true" />{" "}<SystemText message="Đơn hàng" /></button>
          <button aria-selected={mode === "reviews"} onClick={() => setMode("reviews")} role="tab" type="button"><ShieldAlert aria-hidden="true" /> <SystemText message={"Đối soát"} /></button>
          <button aria-selected={mode === "refunds"} onClick={() => setMode("refunds")} role="tab" type="button"><ReceiptText aria-hidden="true" /> <SystemText message={"Hoàn tiền"} /></button>
        </div>
      </header>
      {mode === "catalog" ? <CatalogOperations /> : mode === "orders" ? <OrderOperations /> : mode === "reviews" ? <PaymentReviewOperations /> : <RefundOperations />}
    </div>
  );
}

function PaymentReviewOperations() {
  const messageForUi = useSystemMessages();
  const [page, setPage] = useState<PaymentReviewPage | null>(null);
  const [selected, setSelected] = useState<PaymentReview | null>(null);
  const [status, setStatus] = useState("open");
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);

  const load = useCallback(async (nextPage = pageNumber) => {
    const request = ++sequence.current;
    setLoading(true); setError(null);
    try {
      const result = await adminCommerceService.listPaymentReviews({
        page: nextPage,
        pageSize: PAGE_SIZE,
        status: status || undefined,
      });
      if (request !== sequence.current) return;
      setPage(result);
      setSelected((current) => current
        ? result.items.find((item) => item.id === current.id) ?? null
        : null);
    } catch (reason) {
      if (request === sequence.current) {
        setPage(null);
        setError(getAdminCommerceErrorMessage(reason));
      }
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [pageNumber, status]);

  useEffect(() => { void load(); }, [load]);

  async function run() {
    setWorking(true); setError(null);
    try {
      await adminCommerceService.runPaymentReconciliation();
      setPageNumber(1);
      await load(1);
    } catch (reason) {
      setError(getAdminCommerceErrorMessage(reason));
    } finally {
      setWorking(false);
    }
  }

  async function resolve() {
    if (!selected) return;
    const resolution = selected.kind === "PAID_NOT_FULFILLED"
      ? "retry_succeeded"
      : "acknowledged";
    setWorking(true); setError(null);
    try {
      await adminCommerceService.resolvePaymentReview(selected.id, {
        resolution,
        expectedUpdatedAt: selected.updatedAt,
      });
      setSelected(null);
      await load();
    } catch (reason) {
      setError(getAdminCommerceErrorMessage(reason));
    } finally {
      setWorking(false);
    }
  }

  return <section aria-labelledby="commerce-reviews-title">
    <div className="admin-commerce-filters">
      <label><span><SystemText message={"Trạng thái"} /></span><select aria-label={messageForUi("Trạng thái kiểm tra")} onChange={(event) => { setPageNumber(1); setStatus(event.target.value); }} value={status}><option value="open"><SystemText message={"Đang mở"} /></option><option value="resolved"><SystemText message={"Đã xử lý"} /></option><option value=""><SystemText message={"Tất cả"} /></option></select></label>
      <button disabled={working} onClick={() => void run()} type="button"><RefreshCw aria-hidden="true" />{working ? <SystemText message={"Đang kiểm tra…"} /> : <SystemText message={"Kiểm tra thanh toán"} />}</button>
    </div>
    {error ? <p className="admin-commerce-error" role="alert"><AlertTriangle aria-hidden="true" /><SystemText message={error} /></p> : null}
    <div className="admin-commerce-grid admin-commerce-grid--orders">
      <section className="admin-commerce-panel" aria-labelledby="commerce-reviews-title">
        <div className="admin-commerce-panel__heading"><div><ShieldAlert aria-hidden="true" /><h2 id="commerce-reviews-title"><SystemText message={"Kiểm tra thanh toán"} /></h2></div><span>{page?.total ?? 0} <SystemText message={"trường hợp"} /></span></div>
        {loading ? <p aria-busy="true" role="status"><SystemText message={"Đang tải các trường hợp cần kiểm tra…"} /></p> : null}
        {!loading && !page?.items.length ? <p className="admin-commerce-empty"><SystemText message={"Không có trường hợp kiểm tra phù hợp."} /></p> : null}
        <div className="admin-commerce-list">
          {page?.items.map((item) => <button aria-label={`Review ${item.order.orderNumber}`} className={selected?.id === item.id ? "admin-commerce-list__item admin-commerce-list__item--active" : "admin-commerce-list__item"} key={item.id} onClick={() => setSelected(item)} type="button"><span><strong>{item.order.orderNumber}</strong><small>{humanizeStatus(item.reasonCode)} <SystemText message={"· đã kiểm tra"} /> {item.checkCount} <SystemText message={"lần"} /></small></span><span className="admin-commerce-status-stack"><Status value={item.kind} /><Status value={item.status} /></span></button>)}
        </div>
        <Pagination page={page} loading={loading} onPage={setPageNumber} />
      </section>
      <section className="admin-commerce-panel admin-commerce-detail" aria-label={messageForUi("Chi tiết kiểm tra thanh toán")}>
        {!selected ? <p className="admin-commerce-empty"><SystemText message={"Chọn trường hợp để xem chứng cứ đã lọc dữ liệu nhạy cảm."} /></p> : <div className="admin-commerce-detail__content">
          <div className="admin-commerce-panel__heading"><div><ShieldAlert aria-hidden="true" /><h2>{selected.order.orderNumber}</h2></div><Status value={selected.status} /></div>
          <dl className="admin-commerce-facts"><div><dt><SystemText message={"Lý do"} /></dt><dd>{humanizeStatus(selected.reasonCode)}</dd></div><div><dt><SystemText message={"Loại"} /></dt><dd>{humanizeStatus(selected.kind)}</dd></div><div><dt><SystemText message={"Đơn hàng"} /></dt><dd>{humanizeStatus(selected.order.status)}</dd></div><div><dt><SystemText message={"Cấp quyền truy cập"} /></dt><dd>{humanizeStatus(selected.order.fulfillmentStatus)}</dd></div><div><dt><SystemText message={"Số tiền"} /></dt><dd><SystemValue render={() => (formatMoney(selected.order.payableAmountMinor, selected.order.currency))} /></dd></div><div><dt><SystemText message={"Kiểm tra gần nhất"} /></dt><dd><SystemValue render={() => (selected.lastCheckedAt ? formatDate(selected.lastCheckedAt) : "Not checked")} /></dd></div></dl>
          {selected.status === "OPEN" && !["DUPLICATE_COLLECTION", "LATE_PAYMENT"].includes(selected.kind) ? <button className="admin-commerce-review-action" disabled={working} onClick={() => void resolve()} type="button">{selected.kind === "PAID_NOT_FULFILLED" ? <SystemText message={"Thử cấp quyền lại"} /> : <SystemText message={"Xác nhận đã kiểm tra chứng cứ"} />}</button> : null}
          {["DUPLICATE_COLLECTION", "LATE_PAYMENT"].includes(selected.kind) ? <p className="admin-commerce-warning"><AlertTriangle aria-hidden="true" /><SystemText message={"Khoản thu này cần quy trình chấp nhận/hoàn tiền riêng. Không thể bỏ qua chỉ bằng xác nhận đã xem."} /></p> : null}
        </div>}
      </section>
    </div>
  </section>;
}

function CatalogOperations() {
  const messageForUi = useSystemMessages();
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
        <label><span><SystemText message={"Tìm khóa học"} /></span><span className="admin-commerce-search"><Search aria-hidden="true" /><input aria-label={messageForUi("Tìm khóa học")} onChange={(event) => setSearch(event.target.value)} placeholder={messageForUi("Tên, slug hoặc giảng viên")} type="search" value={search} /></span></label>
        <label><span><SystemText message={"Khả năng bán"} /></span><select aria-label={messageForUi("Khả năng bán")} onChange={(event) => setSellability(event.target.value)} value={sellability}><option value=""><SystemText message="Tất cả" /></option><option value="sellable"><SystemText message={"Đang bán"} /></option><option value="not_sellable"><SystemText message={"Chưa bán"} /></option><option value="archived"><SystemText message="Đã lưu trữ" /></option></select></label>
        <button type="submit"><SystemText message={"Áp dụng bộ lọc"} /></button>
      </form>

      {error ? <p className="admin-commerce-error" role="alert"><AlertTriangle aria-hidden="true" /><SystemText message={error} /></p> : null}
      <div className="admin-commerce-grid">
        <section className="admin-commerce-panel" aria-labelledby="commerce-catalog-title">
          <div className="admin-commerce-panel__heading"><div><PackageSearch aria-hidden="true" /><h2 id="commerce-catalog-title"><SystemText message={"Danh mục có thể bán"} /></h2></div><span>{page?.total ?? 0} <SystemText message={"khóa học"} /></span></div>
          {isLoading ? <p aria-busy="true" role="status"><SystemText message={"Đang tải danh mục…"} /></p> : null}
          {!isLoading && !page?.items.length ? <p className="admin-commerce-empty"><SystemText message={"Không có khóa học phù hợp."} /></p> : null}
          <div className="admin-commerce-list">
            {page?.items.map((item) => <button aria-label={`${messageForUi("Chỉnh sửa ")}${item.title}`} className={selected?.id === item.id ? "admin-commerce-list__item admin-commerce-list__item--active" : "admin-commerce-list__item"} key={item.id} onClick={() => choose(item)} type="button"><span><strong>{item.title}</strong><small>{item.instructor.fullName} · <SystemValue render={() => (formatMoney(item.priceAmountMinor, item.priceCurrency))} /></small></span><Status value={item.product?.status ?? "NOT_LISTED"} /></button>)}
          </div>
          <Pagination page={page} loading={isLoading} onPage={(next) => setQuery((current) => ({ ...current, page: next }))} />
        </section>

        <section className="admin-commerce-panel" aria-label={messageForUi("Cấu hình danh mục")}>
          <div className="admin-commerce-panel__heading"><div><Save aria-hidden="true" /><h2><SystemText message={"Cấu hình giá và bán"} /></h2></div></div>
          {!selected ? <p className="admin-commerce-empty"><SystemText message={"Chọn một khóa học để cấu hình."} /></p> : (
            <form className="admin-commerce-form" onSubmit={save}>
              <div className="admin-commerce-course-summary"><strong>{selected.title}</strong><span>{selected.status} · {selected.visibility} · {selected.moderationStatus}</span><small><SystemText message={"Cập nhật:"} /> <SystemValue render={() => (formatDate(selected.updatedAt))} /></small></div>
              <label><span><SystemText message={"Giá hiện tại (đồng)"} /></span><input aria-label={messageForUi("Giá hiện tại (đồng)")} disabled={archived || isSaving} inputMode="numeric" max={Number.MAX_SAFE_INTEGER} min="0" required step="1" type="number" value={price} onChange={(event) => setPrice(event.target.value)} /></label>
              <label className="admin-commerce-toggle"><input checked={sellable} disabled={archived || isSaving} onChange={(event) => setSellable(event.target.checked)} type="checkbox" /><span><SystemText message={"Cho phép bán khóa học này"} /></span></label>
              {sellable ? <p className="admin-commerce-note"><SystemText message={"Hệ thống chỉ kích hoạt khi khóa học đã xuất bản, công khai, kiểm duyệt rõ ràng và có giá lớn hơn 0."} /></p> : null}
              {!sellable && selected.product?.status === "ACTIVE" ? <p className="admin-commerce-warning"><Archive aria-hidden="true" /><SystemText message={"Lưu thay đổi sẽ lưu trữ vĩnh viễn định danh sản phẩm. Không thể kích hoạt lại."} /></p> : null}
              {archived ? <p className="admin-commerce-warning"><Archive aria-hidden="true" /><SystemText message={"Sản phẩm đã lưu trữ và không thể kích hoạt lại."} /></p> : null}
              <button disabled={archived || isSaving} type="submit"><Save aria-hidden="true" />{isSaving ? <SystemText message={"Đang lưu…"} /> : <SystemText message={"Lưu cấu hình"} />}</button>
            </form>
          )}
        </section>
      </div>
    </section>
  );
}

function OrderOperations() {
  const messageForUi = useSystemMessages();
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
        <label><span><SystemText message={"Tìm đơn hàng"} /></span><span className="admin-commerce-search"><Search aria-hidden="true" /><input aria-label={messageForUi("Tìm đơn hàng")} onChange={(event) => setSearch(event.target.value)} placeholder={messageForUi("Mã đơn hoặc người mua")} type="search" value={search} /></span></label>
        <label><span><SystemText message="Đơn hàng" /></span><select aria-label={messageForUi("Trạng thái đơn hàng")} onChange={(event) => setStatus(event.target.value)} value={status}><option value=""><SystemText message="Tất cả" /></option><option value="pending_payment"><SystemText message="Chờ thanh toán" /></option><option value="confirmed"><SystemText message={"Đã xác nhận"} /></option><option value="cancelled"><SystemText message="Đã hủy" /></option><option value="expired"><SystemText message={"Hết hạn"} /></option></select></label>
        <label><span><SystemText message={"Cấp quyền truy cập"} /></span><select aria-label={messageForUi("Trạng thái fulfillment")} onChange={(event) => setFulfillment(event.target.value)} value={fulfillment}><option value=""><SystemText message="Tất cả" /></option><option value="not_started"><SystemText message="Chưa bắt đầu" /></option><option value="processing"><SystemText message={"Đang xử lý"} /></option><option value="fulfilled"><SystemText message="Hoàn tất" /></option><option value="failed"><SystemText message={"Lỗi"} /></option></select></label>
        <button type="submit"><SystemText message={"Áp dụng bộ lọc"} /></button>
      </form>
      {error ? <p className="admin-commerce-error" role="alert"><AlertTriangle aria-hidden="true" /><SystemText message={error} /></p> : null}
      <div className="admin-commerce-grid admin-commerce-grid--orders">
        <section className="admin-commerce-panel" aria-labelledby="commerce-orders-title">
          <div className="admin-commerce-panel__heading"><div><ReceiptText aria-hidden="true" /><h2 id="commerce-orders-title"><SystemText message="Đơn hàng" /></h2></div><span>{page?.total ?? 0} <SystemText message={"đơn"} /></span></div>
          {loading ? <p aria-busy="true" role="status"><SystemText message={"Đang tải đơn hàng…"} /></p> : null}
          {!loading && !page?.items.length ? <p className="admin-commerce-empty"><SystemText message={"Không có đơn hàng phù hợp."} /></p> : null}
          <div className="admin-commerce-list">
            {page?.items.map((item) => <button aria-label={`${messageForUi("Xem đơn ")}${item.orderNumber}`} className={detail?.id === item.id ? "admin-commerce-list__item admin-commerce-list__item--active" : "admin-commerce-list__item"} key={item.id} onClick={() => void choose(item.id)} type="button"><span><strong>{item.orderNumber}</strong><small>{item.buyer.fullName} · <SystemValue render={() => (formatMoney(item.payableAmountMinor, item.currency))} /></small></span><span className="admin-commerce-status-stack"><Status value={item.status} /><Status value={item.fulfillmentStatus} /></span></button>)}
          </div>
          <Pagination page={page} loading={loading} onPage={(next) => setQuery((current) => ({ ...current, page: next }))} />
        </section>
        <section className="admin-commerce-panel admin-commerce-detail" aria-label={messageForUi("Chi tiết đơn hàng")}>
          {detailLoading ? <p aria-busy="true" role="status"><SystemText message={"Đang tải chi tiết…"} /></p> : detail ? <OrderDetail detail={detail} /> : <p className="admin-commerce-empty"><SystemText message={"Chọn một đơn để xem chi tiết và lịch sử."} /></p>}
        </section>
      </div>
    </section>
  );
}

function OrderDetail({ detail }: { detail: CommerceOrderDetail }) {
  const messageForUi = useSystemMessages();
  const [refundAmounts, setRefundAmounts] = useState<Record<string, string>>({});
  const [refundReason, setRefundReason] = useState("CUSTOMER_REQUEST");
  const [refundWorking, setRefundWorking] = useState(false);
  const [refundMessage, setRefundMessage] = useState<string | null>(null);
  const providerSettlement = detail.settlements.find((item) => item.kind === "PROVIDER_COLLECTION");

  async function requestRefund(event: FormEvent) {
    event.preventDefault();
    if (!providerSettlement) return;
    const allocations = detail.lines.flatMap((line) => {
      const value = refundAmounts[line.id]?.trim();
      return value && /^[1-9][0-9]*$/.test(value)
        ? [{ orderLineId: line.id, amountMinor: value }]
        : [];
    });
    if (!allocations.length) {
      setRefundMessage("Enter at least one positive line allocation.");
      return;
    }
    const total = allocations.reduce((sum, item) => sum + BigInt(item.amountMinor), 0n);
    if (!window.confirm(`Create a manual refund request for ${total} ${detail.currency}? No payout will be initiated.`)) return;
    setRefundWorking(true);
    setRefundMessage(null);
    try {
      await adminCommerceService.createRefund({
        settlementId: providerSettlement.id,
        amountMinor: total.toString(),
        reasonCode: refundReason,
        allocations,
      });
      setRefundAmounts({});
      setRefundMessage("Refund request created. Complete or reject it in the Refunds tab.");
    } catch (reason) {
      setRefundMessage(getAdminCommerceErrorMessage(reason));
    } finally {
      setRefundWorking(false);
    }
  }

  return <div className="admin-commerce-detail__content">
    <div className="admin-commerce-panel__heading"><div><ReceiptText aria-hidden="true" /><h2>{detail.orderNumber}</h2></div><Status value={detail.status} /></div>
    <dl className="admin-commerce-facts"><div><dt><SystemText message={"Người mua"} /></dt><dd>{detail.buyer.fullName}<small>{detail.buyer.email}</small></dd></div><div><dt><SystemText message={"Phải trả"} /></dt><dd><SystemValue render={() => (formatMoney(detail.payableAmountMinor, detail.currency))} /></dd></div><div><dt><SystemText message="Thanh toán" /></dt><dd>{detail.paymentStatus}</dd></div><div><dt><SystemText message={"Cấp quyền truy cập"} /></dt><dd>{detail.fulfillmentStatus}</dd></div><div><dt><SystemText message={"Chính sách giá"} /></dt><dd>{detail.pricingPolicyVersion}</dd></div><div><dt><SystemText message={"Tạo lúc"} /></dt><dd><SystemValue render={() => (formatDate(detail.createdAt))} /></dd></div></dl>
    <h3><SystemText message={"Dòng đơn hàng"} /></h3>
    <div className="admin-commerce-detail__lines">{detail.lines.map((line) => <article key={line.id}><div><strong>{line.displayTitle}</strong><Status value={line.productType} /></div><span><SystemValue render={() => (formatMoney(line.finalAmountMinor, line.currency))} /></span><small><SystemText message={"Giá niêm yết"} /> <SystemValue render={() => (formatMoney(line.unitListPriceAmountMinor, line.currency))} /> <SystemText message={"· giảm"} /> <SystemValue render={() => (formatMoney(line.discountAmountMinor, line.currency))} /></small></article>)}</div>
    <h3><SystemText message={"Thanh toán và settlement"} /></h3>
    {!detail.paymentAttempts.length && !detail.settlements.length ? <p className="admin-commerce-empty"><SystemText message={"Chưa có bản ghi thanh toán."} /></p> : <ol className="admin-commerce-timeline">{detail.paymentAttempts.map((item) => <li key={item.id}><Status value={item.status} /><span><SystemText message={"Lần thanh toán ·"} /> <SystemValue render={() => (formatMoney(item.amountMinor, item.currency))} /></span><time><SystemValue render={() => (formatDate(item.createdAt))} /></time></li>)}{detail.settlements.map((item) => <li key={item.id}><Status value={item.disposition} /><span>{item.kind} · <SystemValue render={() => (formatMoney(item.amountMinor, item.currency))} /></span><time><SystemValue render={() => (formatDate(item.recordedAt))} /></time></li>)}</ol>}
    <h3><SystemText message={"Lịch sử vòng đời"} /></h3>
    {!detail.lifecycle.length ? <p className="admin-commerce-empty"><SystemText message={"Chưa có sự kiện vòng đời."} /></p> : <ol className="admin-commerce-timeline">{detail.lifecycle.map((event) => <li key={event.id}><Status value={event.nextStatus} /><span>{humanizeStatus(event.previousStatus ?? "CREATED")} → {humanizeStatus(event.nextStatus)}<small>{event.reasonCode ?? event.actorKind}</small></span><time><SystemValue render={() => (formatDate(event.occurredAt))} /></time></li>)}</ol>}
    {providerSettlement ? <form className="admin-commerce-form" onSubmit={requestRefund}>
      <h3><SystemText message={"Yêu cầu hoàn tiền thủ công"} /></h3>
      {detail.lines.map((line) => <label key={line.id}><span>{line.displayTitle} <SystemText message={"phân bổ ("} />{line.currency})</span><input aria-label={`${line.displayTitle} refund allocation`} inputMode="numeric" max={line.finalAmountMinor} min="0" pattern="[0-9]+" value={refundAmounts[line.id] ?? ""} onChange={(event) => setRefundAmounts((current) => ({ ...current, [line.id]: event.target.value }))} /></label>)}
      <label><span><SystemText message={"Mã lý do"} /></span><input aria-label={messageForUi("Mã lý do hoàn tiền")} pattern="[A-Z][A-Z0-9_]{2,79}" required value={refundReason} onChange={(event) => setRefundReason(event.target.value.toUpperCase())} /></label>
      <button disabled={refundWorking} type="submit">{refundWorking ? <SystemText message={"Đang tạo…"} /> : <SystemText message={"Tạo yêu cầu hoàn tiền"} />}</button>
      {refundMessage ? <p role="status">{refundMessage}</p> : null}
    </form> : null}
  </div>;
}

function Pagination({ page, loading, onPage }: { page: { page: number; total: number; totalPages: number } | null; loading: boolean; onPage: (page: number) => void }) {
  const messageForUi = useSystemMessages();
  if (!page || page.total === 0) return null;
  return <nav className="admin-commerce-pagination" aria-label={messageForUi("Phân trang")}><span><SystemText message={"Trang"} /> {page.page} / {Math.max(page.totalPages, 1)}</span><div><button disabled={loading || page.page <= 1} onClick={() => onPage(page.page - 1)} type="button"><SystemText message={"Trước"} /></button><button disabled={loading || page.page >= page.totalPages} onClick={() => onPage(page.page + 1)} type="button"><SystemText message={"Sau"} /></button></div></nav>;
}

function Status({ value }: { value: string }) {
  return <em className={`admin-commerce-status admin-commerce-status--${value.toLowerCase()}`}>{humanizeStatus(value)}</em>;
}

function humanizeStatus(value: string) { return value.replace(/_/g, " "); }

function formatMoney(value: string | null, currency: string | null) {
  if (value === null || !currency) return "Chưa đặt giá";
  try { return `${BigInt(value).toLocaleString(currentSystemLocale())} ${currency}`; }
  catch { return `${value} ${currency}`; }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(currentSystemLocale(), { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
