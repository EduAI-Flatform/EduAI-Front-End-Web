import { Percent, Plus, Save, ShieldCheck, Ticket, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  adminVoucherService,
  getVoucherErrorMessage,
  type Voucher,
  type VoucherMutationInput,
  type VoucherPage,
  type VoucherRedemptionPage,
} from "../../../services/voucher.service";
import "./AdminVoucherManagementPage.css";

type VoucherForm = {
  code: string;
  kind: "percentage" | "fixed";
  value: string;
  currency: string;
  startsAt: string;
  endsAt: string;
  minimumCoursePriceMinor: string;
  maximumDiscountMinor: string;
  usageLimit: string;
  perUserLimit: string;
  courseIds: string;
  categorySlugs: string;
  eligibleUserIds: string;
  status: "draft" | "active" | "disabled";
};

const emptyForm: VoucherForm = {
  code: "",
  kind: "percentage",
  value: "20",
  currency: "VND",
  startsAt: "2026-08-01T00:00",
  endsAt: "2026-09-01T00:00",
  minimumCoursePriceMinor: "",
  maximumDiscountMinor: "",
  usageLimit: "",
  perUserLimit: "",
  courseIds: "",
  categorySlugs: "",
  eligibleUserIds: "",
  status: "draft",
};

export function AdminVoucherManagementPage() {
  const [page, setPage] = useState<VoucherPage | null>(null);
  const [selected, setSelected] = useState<Voucher | null>(null);
  const [history, setHistory] = useState<VoucherRedemptionPage | null>(null);
  const [form, setForm] = useState<VoucherForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadVouchers() {
    setIsLoading(true);
    try {
      setPage(await adminVoucherService.list());
      setError(null);
    } catch (requestError) {
      setError(getVoucherErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadVouchers();
  }, []);

  function startCreate() {
    setSelected(null);
    setHistory(null);
    setForm(emptyForm);
    setError(null);
  }

  async function selectVoucher(voucher: Voucher) {
    setSelected(voucher);
    setForm(toForm(voucher));
    try {
      setHistory(await adminVoucherService.redemptions(voucher.id));
      setError(null);
    } catch (requestError) {
      setError(getVoucherErrorMessage(requestError));
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const input = toMutationInput(form);
      const saved = selected
        ? await adminVoucherService.update(selected.id, input)
        : await adminVoucherService.create(input);
      await loadVouchers();
      await selectVoucher(saved);
    } catch (requestError) {
      setError(getVoucherErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  const title = useMemo(
    () => (selected ? `Voucher ${selected.code}` : "Tạo voucher"),
    [selected],
  );

  return (
    <div className="admin-voucher-page">
      <header className="admin-voucher-page__header">
        <div>
          <p>Khuyến mãi có kiểm soát</p>
          <h1>Quản lý voucher</h1>
          <span>Giá và điều kiện luôn được xác nhận ở backend.</span>
        </div>
        <button className="admin-voucher-page__primary" onClick={startCreate} type="button">
          <Plus aria-hidden="true" /> Tạo voucher
        </button>
      </header>

      {error ? <p className="admin-voucher-page__error" role="alert">{error}</p> : null}

      <div className="admin-voucher-page__grid">
        <section className="admin-voucher-panel" aria-label="Danh sách voucher">
          <div className="admin-voucher-panel__heading">
            <div><Ticket aria-hidden="true" /><h2>Chính sách voucher</h2></div>
            <span>{page?.total ?? 0} mã</span>
          </div>
          {isLoading ? <p role="status">Đang tải voucher...</p> : null}
          {!isLoading && !page?.items.length ? <p className="admin-voucher-empty">Chưa có voucher.</p> : null}
          <div className="admin-voucher-list">
            {page?.items.map((voucher) => (
              <button
                className={selected?.id === voucher.id ? "admin-voucher-list__item admin-voucher-list__item--active" : "admin-voucher-list__item"}
                key={voucher.id}
                onClick={() => void selectVoucher(voucher)}
                type="button"
              >
                <span><strong>{voucher.code}</strong><small>{voucher.kind === "percentage" ? `${voucher.value}%` : `${voucher.value.toLocaleString("vi-VN")} ${voucher.currency}`}</small></span>
                <em className={`admin-voucher-status admin-voucher-status--${voucher.status}`}>{voucher.status}</em>
              </button>
            ))}
          </div>
        </section>

        <section className="admin-voucher-panel" aria-label="Biểu mẫu voucher">
          <div className="admin-voucher-panel__heading">
            <div><ShieldCheck aria-hidden="true" /><h2>{title}</h2></div>
            {selected ? <span>{selected.redeemedCount} lượt đã dùng</span> : null}
          </div>
          <form className="admin-voucher-form" onSubmit={save}>
            <label>Mã voucher<input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
            <div className="admin-voucher-form__split">
              <label>Loại<select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as VoucherForm["kind"] })}><option value="percentage">Phần trăm</option><option value="fixed">Số tiền cố định</option></select></label>
              <label>Giá trị<input required min="1" type="number" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} /></label>
              <label>Tiền tệ<input maxLength={3} required value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} /></label>
            </div>
            <div className="admin-voucher-form__split">
              <label>Bắt đầu<input required type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>
              <label>Kết thúc<input required type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label>
              <label>Trạng thái<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as VoucherForm["status"] })}><option value="draft">Nháp</option><option value="active">Đang bật</option><option value="disabled">Đã tắt</option></select></label>
            </div>
            <div className="admin-voucher-form__split admin-voucher-form__split--four">
              <OptionalNumber label="Giá tối thiểu" value={form.minimumCoursePriceMinor} onChange={(value) => setForm({ ...form, minimumCoursePriceMinor: value })} />
              <OptionalNumber label="Giảm tối đa" value={form.maximumDiscountMinor} onChange={(value) => setForm({ ...form, maximumDiscountMinor: value })} />
              <OptionalNumber label="Tổng lượt" value={form.usageLimit} onChange={(value) => setForm({ ...form, usageLimit: value })} />
              <OptionalNumber label="Lượt/người" value={form.perUserLimit} onChange={(value) => setForm({ ...form, perUserLimit: value })} />
            </div>
            <label>Course ID scope<small>Phân cách bằng dấu phẩy</small><input value={form.courseIds} onChange={(event) => setForm({ ...form, courseIds: event.target.value })} /></label>
            <label>Category slug scope<input value={form.categorySlugs} onChange={(event) => setForm({ ...form, categorySlugs: event.target.value })} /></label>
            <label>User eligibility scope<input value={form.eligibleUserIds} onChange={(event) => setForm({ ...form, eligibleUserIds: event.target.value })} /></label>
            <button className="admin-voucher-page__primary" disabled={isSaving} type="submit"><Save aria-hidden="true" />{isSaving ? "Đang lưu..." : "Lưu chính sách"}</button>
          </form>
        </section>
      </div>

      {selected ? (
        <section className="admin-voucher-panel admin-voucher-history" aria-label="Lịch sử redemption">
          <div className="admin-voucher-panel__heading"><div><Percent aria-hidden="true" /><h2>Lịch sử sử dụng</h2></div><span>{history?.total ?? 0} redemption</span></div>
          {!history?.items.length ? <p className="admin-voucher-empty">Chưa có redemption.</p> : <div className="admin-voucher-history__table"><table><thead><tr><th>Người dùng</th><th>Khóa học</th><th>Giảm</th><th>Thời điểm</th></tr></thead><tbody>{history.items.map((item) => <tr key={item.id}><td data-label="Người dùng">{item.userId}</td><td data-label="Khóa học">{item.courseId}</td><td data-label="Giảm">{item.discountAmountMinor.toLocaleString("vi-VN")} {item.currency}</td><td data-label="Thời điểm">{new Date(item.createdAt).toLocaleString("vi-VN")}</td></tr>)}</tbody></table></div>}
        </section>
      ) : null}
    </div>
  );
}

function OptionalNumber({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label>{label}<input min="0" type="number" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function toForm(voucher: Voucher): VoucherForm {
  return {
    code: voucher.code, kind: voucher.kind, value: String(voucher.value), currency: voucher.currency,
    startsAt: voucher.startsAt.slice(0, 16), endsAt: voucher.endsAt.slice(0, 16),
    minimumCoursePriceMinor: String(voucher.minimumCoursePriceMinor ?? ""), maximumDiscountMinor: String(voucher.maximumDiscountMinor ?? ""),
    usageLimit: String(voucher.usageLimit ?? ""), perUserLimit: String(voucher.perUserLimit ?? ""),
    courseIds: voucher.courseIds.join(", "), categorySlugs: voucher.categorySlugs.join(", "), eligibleUserIds: voucher.eligibleUserIds.join(", "), status: voucher.status,
  };
}

function toMutationInput(form: VoucherForm): VoucherMutationInput {
  const optionalNumber = (value: string) => (value.trim() ? Number(value) : null);
  const split = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
  return {
    code: form.code, kind: form.kind, value: Number(form.value), currency: form.currency,
    startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(), status: form.status,
    minimumCoursePriceMinor: optionalNumber(form.minimumCoursePriceMinor), maximumDiscountMinor: optionalNumber(form.maximumDiscountMinor),
    usageLimit: optionalNumber(form.usageLimit), perUserLimit: optionalNumber(form.perUserLimit),
    courseIds: split(form.courseIds), categorySlugs: split(form.categorySlugs), eligibleUserIds: split(form.eligibleUserIds),
  };
}
