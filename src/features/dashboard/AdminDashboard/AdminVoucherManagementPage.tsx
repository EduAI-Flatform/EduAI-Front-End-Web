import { SystemValue } from '@/features/platform/SystemText';
import { currentSystemLocale } from "../../platform/translate-system-message";
import { SystemText, useSystemMessages } from "../../platform/SystemText";
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
  const messageForUi = useSystemMessages();
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
          <p><SystemText message={"Khuyến mãi có kiểm soát"} /></p>
          <h1><SystemText message={"Quản lý voucher"} /></h1>
          <span><SystemText message={"Giá và điều kiện luôn được hệ thống xác nhận."} /></span>
        </div>
        <button className="admin-voucher-page__primary" onClick={startCreate} type="button">
          <Plus aria-hidden="true" /> <SystemText message={"Tạo voucher"} />
        </button>
      </header>

      {error ? <p className="admin-voucher-page__error" role="alert"><SystemText message={error} /></p> : null}

      <div className="admin-voucher-page__grid">
        <section className="admin-voucher-panel" aria-label={messageForUi("Danh sách voucher")}>
          <div className="admin-voucher-panel__heading">
            <div><Ticket aria-hidden="true" /><h2><SystemText message={"Chính sách voucher"} /></h2></div>
            <span>{page?.total ?? 0} <SystemText message={"mã"} /></span>
          </div>
          {isLoading ? <p role="status"><SystemText message={"Đang tải voucher..."} /></p> : null}
          {!isLoading && !page?.items.length ? <p className="admin-voucher-empty"><SystemText message={"Chưa có voucher."} /></p> : null}
          <div className="admin-voucher-list">
            {page?.items.map((voucher) => (
              <button
                className={selected?.id === voucher.id ? "admin-voucher-list__item admin-voucher-list__item--active" : "admin-voucher-list__item"}
                key={voucher.id}
                onClick={() => void selectVoucher(voucher)}
                type="button"
              >
                <span><strong>{voucher.code}</strong><small><SystemValue render={() => (voucher.kind === "percentage" ? `${voucher.value}%` : `${voucher.value.toLocaleString(currentSystemLocale())} ${voucher.currency}`)} /></small></span>
                <em className={`admin-voucher-status admin-voucher-status--${voucher.status}`}>{voucher.status}</em>
              </button>
            ))}
          </div>
        </section>

        <section className="admin-voucher-panel" aria-label={messageForUi("Biểu mẫu voucher")}>
          <div className="admin-voucher-panel__heading">
            <div><ShieldCheck aria-hidden="true" /><h2>{title}</h2></div>
            {selected ? <span>{selected.redeemedCount} <SystemText message={"lượt đã dùng"} /></span> : null}
          </div>
          <form className="admin-voucher-form" onSubmit={save}>
            <label><SystemText message={"Mã voucher"} /><input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
            <div className="admin-voucher-form__split">
              <label><SystemText message={"Loại"} /><select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as VoucherForm["kind"] })}><option value="percentage"><SystemText message={"Phần trăm"} /></option><option value="fixed"><SystemText message={"Số tiền cố định"} /></option></select></label>
              <label><SystemText message={"Giá trị"} /><input required min="1" type="number" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} /></label>
              <label><SystemText message={"Tiền tệ"} /><input maxLength={3} required value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} /></label>
            </div>
            <div className="admin-voucher-form__split">
              <label><SystemText message="Bắt đầu" /><input required type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>
              <label><SystemText message={"Kết thúc"} /><input required type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label>
              <label><SystemText message="Trạng thái" /><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as VoucherForm["status"] })}><option value="draft"><SystemText message={"Nháp"} /></option><option value="active"><SystemText message={"Đang bật"} /></option><option value="disabled"><SystemText message={"Đã tắt"} /></option></select></label>
            </div>
            <div className="admin-voucher-form__split admin-voucher-form__split--four">
              <OptionalNumber label={messageForUi("Giá tối thiểu")} value={form.minimumCoursePriceMinor} onChange={(value) => setForm({ ...form, minimumCoursePriceMinor: value })} />
              <OptionalNumber label={messageForUi("Giảm tối đa")} value={form.maximumDiscountMinor} onChange={(value) => setForm({ ...form, maximumDiscountMinor: value })} />
              <OptionalNumber label={messageForUi("Tổng lượt")} value={form.usageLimit} onChange={(value) => setForm({ ...form, usageLimit: value })} />
              <OptionalNumber label={messageForUi("Lượt/người")} value={form.perUserLimit} onChange={(value) => setForm({ ...form, perUserLimit: value })} />
            </div>
            <label><SystemText message={"Phạm vi mã khóa học"} /><small><SystemText message={"Phân cách bằng dấu phẩy"} /></small><input value={form.courseIds} onChange={(event) => setForm({ ...form, courseIds: event.target.value })} /></label>
            <label><SystemText message={"Phạm vi đường dẫn danh mục"} /><input value={form.categorySlugs} onChange={(event) => setForm({ ...form, categorySlugs: event.target.value })} /></label>
            <label><SystemText message={"Phạm vi người dùng đủ điều kiện"} /><input value={form.eligibleUserIds} onChange={(event) => setForm({ ...form, eligibleUserIds: event.target.value })} /></label>
            <button className="admin-voucher-page__primary" disabled={isSaving} type="submit"><Save aria-hidden="true" />{isSaving ? <SystemText message={"Đang lưu..."} /> : <SystemText message={"Lưu chính sách"} />}</button>
          </form>
        </section>
      </div>

      {selected ? (
        <section className="admin-voucher-panel admin-voucher-history" aria-label={messageForUi("Lịch sử redemption")}>
          <div className="admin-voucher-panel__heading"><div><Percent aria-hidden="true" /><h2><SystemText message={"Lịch sử sử dụng"} /></h2></div><span>{history?.total ?? 0} <SystemText message={"lượt sử dụng"} /></span></div>
          {!history?.items.length ? <p className="admin-voucher-empty"><SystemText message={"Chưa có redemption."} /></p> : <div className="admin-voucher-history__table"><table><thead><tr><th><SystemText message={"Người dùng"} /></th><th><SystemText message="Khóa học" /></th><th><SystemText message={"Giảm"} /></th><th><SystemText message={"Thời điểm"} /></th></tr></thead><tbody>{history.items.map((item) => <tr key={item.id}><td data-label={messageForUi("Người dùng")}>{item.userId}</td><td data-label={messageForUi("Khóa học")}>{item.courseId}</td><td data-label={messageForUi("Giảm")}><SystemValue render={() => (item.discountAmountMinor.toLocaleString(currentSystemLocale()))} /> {item.currency}</td><td data-label={messageForUi("Thời điểm")}><SystemValue render={() => (new Date(item.createdAt).toLocaleString(currentSystemLocale()))} /></td></tr>)}</tbody></table></div>}
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
