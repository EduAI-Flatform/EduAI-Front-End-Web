import { FormEvent, useState } from "react";
import { AlertTriangle, Plus, Save, Trash2 } from "lucide-react";
import type {
  MembershipDurationInput,
  MembershipPlanInput,
  MembershipVersionInput,
} from "../../../services/admin-membership.service";

interface DurationRow {
  key: number;
  months: string;
  mode: "discount" | "fixed";
  value: string;
}

interface Props {
  planCode?: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (input: MembershipPlanInput | MembershipVersionInput) => Promise<void>;
}

export function MembershipVersionEditor({ planCode, busy, onCancel, onSubmit }: Props) {
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [salesStartAt, setSalesStartAt] = useState("");
  const [salesEndAt, setSalesEndAt] = useState("");
  const [durations, setDurations] = useState<DurationRow[]>([
    { key: 1, months: "1", mode: "discount", value: "0" },
  ]);
  const [error, setError] = useState<string | null>(null);

  const hasHighDiscount = durations.some(
    (duration) => duration.mode === "discount" && Number(duration.value) >= 50,
  );

  function updateDuration(key: number, patch: Partial<DurationRow>) {
    setDurations((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const normalized = normalizeDurations(durations);
    if (typeof normalized === "string") {
      setError(normalized);
      return;
    }
    if (!/^\d+$/.test(basePrice)) {
      setError("Giá cơ sở phải là số nguyên không âm.");
      return;
    }
    if (salesStartAt && salesEndAt && new Date(salesEndAt) <= new Date(salesStartAt)) {
      setError("Thời điểm kết thúc bán phải sau thời điểm bắt đầu.");
      return;
    }
    const version: MembershipVersionInput = {
      displayName: displayName.trim(),
      description: description.trim() || null,
      baseMonthlyPriceAmountMinor: basePrice,
      currency: "VND",
      salesStartAt: salesStartAt ? new Date(salesStartAt).toISOString() : null,
      salesEndAt: salesEndAt ? new Date(salesEndAt).toISOString() : null,
      durations: normalized,
    };
    await onSubmit(planCode ? version : { ...version, code: code.trim().toUpperCase() });
  }

  return (
    <form className="membership-editor" onSubmit={(event) => void submit(event)}>
      <div className="membership-section-heading">
        <div>
          <small>{planCode ? `PLAN ${planCode}` : "PLAN MỚI"}</small>
          <h2>{planCode ? "Tạo phiên bản nháp" : "Tạo gói và bản nháp đầu tiên"}</h2>
        </div>
        <button className="membership-button membership-button--quiet" onClick={onCancel} type="button">Hủy</button>
      </div>

      {error ? <p className="membership-alert membership-alert--error" role="alert">{error}</p> : null}
      <div className="membership-form-grid">
        {!planCode ? <label><span>Mã gói</span><input aria-label="Mã gói" maxLength={64} onChange={(event) => setCode(event.target.value)} pattern="[A-Za-z0-9_-]{2,64}" required value={code} /></label> : null}
        <label><span>Tên hiển thị</span><input aria-label="Tên hiển thị" maxLength={120} onChange={(event) => setDisplayName(event.target.value)} required value={displayName} /></label>
        <label><span>Giá cơ sở mỗi tháng (đồng)</span><input aria-label="Giá cơ sở mỗi tháng (đồng)" inputMode="numeric" min="0" onChange={(event) => setBasePrice(event.target.value)} pattern="\d+" required value={basePrice} /></label>
        <label><span>Bắt đầu bán (không bắt buộc)</span><input aria-label="Bắt đầu bán" onChange={(event) => setSalesStartAt(event.target.value)} type="datetime-local" value={salesStartAt} /></label>
        <label><span>Kết thúc bán (không bắt buộc)</span><input aria-label="Kết thúc bán" onChange={(event) => setSalesEndAt(event.target.value)} type="datetime-local" value={salesEndAt} /></label>
        <label className="membership-form-grid__wide"><span>Mô tả</span><textarea aria-label="Mô tả" maxLength={2000} onChange={(event) => setDescription(event.target.value)} rows={4} value={description} /></label>
      </div>

      <div className="membership-duration-heading">
        <div><h3>Tùy chọn thời hạn</h3><p>Mỗi thời hạn là số tháng nguyên; giá cố định hoặc tỷ lệ giảm được tính bằng số nguyên.</p></div>
        <button className="membership-button membership-button--quiet" onClick={() => setDurations((current) => [...current, { key: Math.max(...current.map((item) => item.key)) + 1, months: "", mode: "discount", value: "0" }])} type="button"><Plus aria-hidden="true" /> Thêm thời hạn</button>
      </div>
      <div className="membership-duration-list">
        {durations.map((duration, index) => (
          <div className="membership-duration-row" key={duration.key}>
            <label><span>Số tháng</span><input aria-label={`Số tháng ${index + 1}`} max="120" min="1" onChange={(event) => updateDuration(duration.key, { months: event.target.value })} required type="number" value={duration.months} /></label>
            <label><span>Kiểu giá</span><select aria-label={`Kiểu giá ${index + 1}`} onChange={(event) => updateDuration(duration.key, { mode: event.target.value as DurationRow["mode"], value: "0" })} value={duration.mode}><option value="discount">Giảm theo %</option><option value="fixed">Giá cố định</option></select></label>
            <label><span>{duration.mode === "discount" ? "Giảm (%)" : "Giá (đồng)"}</span><input aria-label={`${duration.mode === "discount" ? "Giảm phần trăm" : "Giá cố định"} ${index + 1}`} max={duration.mode === "discount" ? 100 : undefined} min="0" onChange={(event) => updateDuration(duration.key, { value: event.target.value })} required type="number" value={duration.value} /></label>
            <button aria-label={`Xóa thời hạn ${index + 1}`} className="membership-icon-button" disabled={durations.length === 1} onClick={() => setDurations((current) => current.filter((item) => item.key !== duration.key))} type="button"><Trash2 aria-hidden="true" /></button>
          </div>
        ))}
      </div>
      {hasHighDiscount ? <p className="membership-alert membership-alert--warning" role="status"><AlertTriangle aria-hidden="true" />Mức giảm từ 50% trở lên. Hệ thống không áp trần nhân tạo, nhưng quản trị viên phải kiểm tra kỹ trước khi xuất bản.</p> : null}
      <div className="membership-editor__actions">
        <button className="membership-button" disabled={busy} type="submit"><Save aria-hidden="true" />{busy ? "Đang tạo…" : "Lưu bản nháp"}</button>
      </div>
    </form>
  );
}

function normalizeDurations(rows: DurationRow[]): MembershipDurationInput[] | string {
  const months = new Set<number>();
  for (const row of rows) {
    const month = Number(row.months);
    const value = Number(row.value);
    if (!Number.isInteger(month) || month < 1 || month > 120) return "Thời hạn phải là số tháng nguyên từ 1 đến 120.";
    if (months.has(month)) return "Mỗi thời hạn tháng chỉ được xuất hiện một lần.";
    months.add(month);
    if (!Number.isInteger(value) || value < 0 || (row.mode === "discount" && value > 100)) return "Giá và tỷ lệ giảm phải là số nguyên trong giới hạn cho phép.";
  }
  return rows.map((row, displayOrder) => ({
    months: Number(row.months),
    displayOrder,
    ...(row.mode === "fixed" ? { priceAmountMinor: row.value } : { discountPercent: Number(row.value) }),
  }));
}
