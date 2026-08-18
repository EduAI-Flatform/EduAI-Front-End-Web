import { Coins, History, Plus, Save, ShieldCheck, Undo2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  adminTmiService,
  getTmiErrorMessage,
  type TmiAdminLedgerEntry,
  type TmiAdminRedemption,
  type TmiReward,
  type TmiRewardMutationInput,
  type TmiRewardStatus,
} from "../../../services/tmi.service";
import "./AdminTmiManagementPage.css";

type RewardForm = {
  title: string;
  description: string;
  kind: "course_access" | "voucher" | "gift";
  cost: string;
  startsAt: string;
  endsAt: string;
  quota: string;
  status: TmiRewardStatus;
  inventoryMetadata: string;
};

const emptyForm: RewardForm = {
  title: "",
  description: "",
  kind: "gift",
  cost: "50",
  startsAt: "2026-08-01T00:00",
  endsAt: "2026-09-01T00:00",
  quota: "",
  status: "draft",
  inventoryMetadata: "",
};

function toForm(reward: TmiReward): RewardForm {
  return {
    title: reward.title,
    description: reward.description ?? "",
    kind: reward.kind as RewardForm["kind"],
    cost: String(reward.cost),
    startsAt: reward.startsAt.slice(0, 16),
    endsAt: reward.endsAt.slice(0, 16),
    quota: reward.quota === null ? "" : String(reward.quota),
    status: reward.status as TmiRewardStatus,
    inventoryMetadata: reward.inventoryMetadata ? JSON.stringify(reward.inventoryMetadata) : "",
  };
}

function toInput(form: RewardForm): TmiRewardMutationInput {
  const metadata = form.inventoryMetadata.trim() ? JSON.parse(form.inventoryMetadata) as Record<string, unknown> : null;
  return {
    title: form.title,
    description: form.description.trim() || null,
    kind: form.kind,
    cost: Number(form.cost),
    startsAt: new Date(form.startsAt).toISOString(),
    endsAt: new Date(form.endsAt).toISOString(),
    quota: form.quota.trim() ? Number(form.quota) : null,
    status: form.status,
    inventoryMetadata: metadata,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

export function AdminTmiManagementPage() {
  const [rewards, setRewards] = useState<TmiReward[]>([]);
  const [redemptions, setRedemptions] = useState<TmiAdminRedemption[]>([]);
  const [ledger, setLedger] = useState<TmiAdminLedgerEntry[]>([]);
  const [selected, setSelected] = useState<TmiReward | null>(null);
  const [form, setForm] = useState<RewardForm>(emptyForm);
  const [adjustment, setAdjustment] = useState({ userId: "", amount: "10", direction: "credit" as "credit" | "debit", adjustmentKey: "", reason: "" });
  const [pendingRefund, setPendingRefund] = useState<TmiAdminRedemption | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rewardPage, redemptionPage, ledgerPage] = await Promise.all([
        adminTmiService.listRewards(),
        adminTmiService.listRedemptions(),
        adminTmiService.listLedger(),
      ]);
      setRewards(rewardPage.items);
      setRedemptions(redemptionPage.items);
      setLedger(ledgerPage.items);
    } catch (requestError) {
      setError(getTmiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function startCreate() {
    setSelected(null);
    setForm(emptyForm);
    setSuccess(null);
  }

  function selectReward(reward: TmiReward) {
    setSelected(reward);
    setForm(toForm(reward));
    setSuccess(null);
  }

  async function saveReward(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const input = toInput(form);
      const saved = selected ? await adminTmiService.updateReward(selected.id, input) : await adminTmiService.createReward(input);
      setSelected(saved);
      setForm(toForm(saved));
      setSuccess("Đã lưu phần thưởng TMI.");
      await load();
    } catch (requestError) {
      setError(getTmiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function adjustBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMutating(true);
    setError(null);
    try {
      await adminTmiService.adjustBalance({ ...adjustment, amount: Number(adjustment.amount) });
      setSuccess("Đã ghi nhận điều chỉnh TMI có audit.");
      setAdjustment({ ...adjustment, adjustmentKey: "", reason: "" });
      await load();
    } catch (requestError) {
      setError(getTmiErrorMessage(requestError));
    } finally {
      setMutating(false);
    }
  }

  async function confirmRefund() {
    if (!pendingRefund) return;
    setMutating(true);
    setError(null);
    try {
      await adminTmiService.refund(pendingRefund.id, { reason: "Admin TMI refund" });
      setPendingRefund(null);
      setSuccess("Đã hoàn TMI và thu hồi entitlement.");
      await load();
    } catch (requestError) {
      setError(getTmiErrorMessage(requestError));
    } finally {
      setMutating(false);
    }
  }

  return (
    <div className="admin-tmi-page">
      <header className="admin-tmi-page__header">
        <div>
          <p>TMI Rewards có kiểm soát</p>
          <h1>Quản lý TMI Rewards</h1>
          <span>Catalog, ledger và mutation đều được xác nhận bởi backend và actor admin.</span>
        </div>
        <button className="admin-tmi-page__primary" type="button" onClick={startCreate}><Plus aria-hidden="true" /> Tạo phần thưởng</button>
      </header>

      {error ? <p className="admin-tmi-page__alert" role="alert">{error}</p> : null}
      {success ? <p className="admin-tmi-page__success" role="status">{success}</p> : null}

      <div className="admin-tmi-page__grid">
        <section className="admin-tmi-panel" aria-label="Danh sách phần thưởng TMI">
          <div className="admin-tmi-panel__heading"><div><Coins aria-hidden="true" /><h2>Catalog</h2></div><span>{rewards.length} phần thưởng</span></div>
          {loading ? <p role="status">Đang tải catalog...</p> : null}
          {!loading && !rewards.length ? <p className="admin-tmi-page__empty">Chưa có phần thưởng.</p> : null}
          <div className="admin-tmi-list">
            {rewards.map((reward) => <button className={selected?.id === reward.id ? "admin-tmi-list__item admin-tmi-list__item--active" : "admin-tmi-list__item"} key={reward.id} type="button" onClick={() => selectReward(reward)}><span><strong>{reward.title}</strong><small>{reward.cost.toLocaleString("vi-VN")} TMI · {reward.kind}</small></span><em className={`admin-tmi-status admin-tmi-status--${reward.status}`}>{reward.status}</em></button>)}
          </div>
        </section>

        <section className="admin-tmi-panel" aria-label="Biểu mẫu phần thưởng TMI">
          <div className="admin-tmi-panel__heading"><div><ShieldCheck aria-hidden="true" /><h2>{selected ? `Sửa ${selected.title}` : "Tạo phần thưởng"}</h2></div></div>
          <form className="admin-tmi-form" onSubmit={saveReward}>
            <label>Tiêu đề phần thưởng<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label>Mô tả<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <div className="admin-tmi-form__split">
              <label>Loại<select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as RewardForm["kind"] })}><option value="gift">Quà tặng</option><option value="voucher">Voucher</option><option value="course_access">Quyền truy cập khóa học</option></select></label>
              <label>Chi phí TMI<input required min="1" type="number" value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} /></label>
              <label>Quota<input min="1" type="number" value={form.quota} onChange={(event) => setForm({ ...form, quota: event.target.value })} /></label>
            </div>
            <div className="admin-tmi-form__split">
              <label>Bắt đầu<input required type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>
              <label>Kết thúc<input required type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label>
              <label>Trạng thái<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TmiRewardStatus })}><option value="draft">Nháp</option><option value="active">Đang bật</option><option value="disabled">Đã tắt</option><option value="expired">Hết hạn</option></select></label>
            </div>
            <label>Inventory metadata JSON<small>Không nhập secret hoặc dữ liệu thanh toán.</small><textarea value={form.inventoryMetadata} onChange={(event) => setForm({ ...form, inventoryMetadata: event.target.value })} /></label>
            <button className="admin-tmi-page__primary" disabled={saving} type="submit"><Save aria-hidden="true" /> {saving ? "Đang lưu..." : "Lưu phần thưởng"}</button>
          </form>
        </section>
      </div>

      <section className="admin-tmi-panel" aria-label="Điều chỉnh số dư TMI">
        <div className="admin-tmi-panel__heading"><div><ShieldCheck aria-hidden="true" /><h2>Điều chỉnh số dư</h2></div><span>Reason và adjustment key bắt buộc</span></div>
        <form className="admin-tmi-form admin-tmi-form--adjustment" onSubmit={adjustBalance}>
          <label>User ID<input required aria-label="User ID điều chỉnh" value={adjustment.userId} onChange={(event) => setAdjustment({ ...adjustment, userId: event.target.value })} /></label>
          <label>Số TMI<input required min="1" type="number" value={adjustment.amount} onChange={(event) => setAdjustment({ ...adjustment, amount: event.target.value })} /></label>
          <label>Hướng<select value={adjustment.direction} onChange={(event) => setAdjustment({ ...adjustment, direction: event.target.value as "credit" | "debit" })}><option value="credit">Cộng</option><option value="debit">Trừ</option></select></label>
          <label>Adjustment key<input required minLength={8} value={adjustment.adjustmentKey} onChange={(event) => setAdjustment({ ...adjustment, adjustmentKey: event.target.value })} /></label>
          <label>Lý do<input required minLength={3} value={adjustment.reason} onChange={(event) => setAdjustment({ ...adjustment, reason: event.target.value })} /></label>
          <button className="admin-tmi-page__primary" disabled={mutating} type="submit">{mutating ? "Đang ghi..." : "Ghi điều chỉnh"}</button>
        </form>
      </section>

      <div className="admin-tmi-page__history-grid">
        <section className="admin-tmi-panel" aria-label="Lịch sử redemption TMI">
          <div className="admin-tmi-panel__heading"><div><Undo2 aria-hidden="true" /><h2>Redemptions</h2></div><span>{redemptions.length} bản ghi</span></div>
          {!redemptions.length ? <p className="admin-tmi-page__empty">Chưa có redemption.</p> : <div className="admin-tmi-table-wrap"><table><thead><tr><th>User</th><th>Reward</th><th>Cost</th><th>Thao tác</th></tr></thead><tbody>{redemptions.map((item) => <tr key={item.id}><td>{item.userId}</td><td>{item.reward.title}</td><td>{item.cost.toLocaleString("vi-VN")} TMI</td><td><button type="button" onClick={() => setPendingRefund(item)} disabled={mutating}>Hoàn</button></td></tr>)}</tbody></table></div>}
        </section>
        <section className="admin-tmi-panel" aria-label="Lịch sử ledger TMI">
          <div className="admin-tmi-panel__heading"><div><History aria-hidden="true" /><h2>Ledger</h2></div><span>{ledger.length} bản ghi</span></div>
          {!ledger.length ? <p className="admin-tmi-page__empty">Chưa có ledger entry.</p> : <div className="admin-tmi-table-wrap"><table><thead><tr><th>User</th><th>Kind</th><th>Amount</th><th>Source</th></tr></thead><tbody>{ledger.map((item) => <tr key={item.id}><td>{item.userId}</td><td>{item.kind}</td><td>{item.amount.toLocaleString("vi-VN")} TMI</td><td>{item.sourceType}<small>{formatDate(item.occurredAt)}</small></td></tr>)}</tbody></table></div>}
        </section>
      </div>

      {pendingRefund ? <div className="admin-tmi-dialog-backdrop"><div className="admin-tmi-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-tmi-refund-title"><h2 id="admin-tmi-refund-title">Xác nhận hoàn TMI</h2><p>Hoàn {pendingRefund.cost.toLocaleString("vi-VN")} TMI cho redemption của user này?</p><div><button type="button" onClick={() => setPendingRefund(null)} disabled={mutating}>Hủy</button><button type="button" onClick={() => void confirmRefund()} disabled={mutating}>Xác nhận hoàn</button></div></div></div> : null}
    </div>
  );
}
