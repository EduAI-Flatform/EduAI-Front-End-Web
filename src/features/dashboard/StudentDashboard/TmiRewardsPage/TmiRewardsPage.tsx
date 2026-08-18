import { useCallback, useEffect, useState } from "react";
import { Coins, Gift, History, LoaderCircle, RefreshCw } from "lucide-react";
import {
  getTmiErrorMessage,
  tmiService,
  type TmiLedgerEntry,
  type TmiReward,
  type TmiWallet,
} from "../../../../services/tmi.service";
import "./TmiRewardsPage.css";

const emptyWallet: TmiWallet = { current: 0, earned: 0, spent: 0, expired: 0 };

function createIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `tmi-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

function getRewardKindLabel(kind: string) {
  const labels: Record<string, string> = {
    digital: "Quà số",
    physical: "Quà tặng",
    course_access: "Khóa học",
  };
  return labels[kind] ?? "Phần thưởng";
}

function BalanceCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <article className={`tmi-rewards__balance-card ${tone ?? ""}`}>
      <span className="tmi-rewards__balance-label">{label}</span>
      <strong className="tmi-rewards__balance-value">{formatNumber(value)} TMI</strong>
    </article>
  );
}

export function TmiRewardsPage() {
  const [wallet, setWallet] = useState<TmiWallet>(emptyWallet);
  const [rewards, setRewards] = useState<TmiReward[]>([]);
  const [history, setHistory] = useState<TmiLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingReward, setPendingReward] = useState<TmiReward | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rewardPage, walletData, historyData] = await Promise.all([
        tmiService.listRewards(),
        tmiService.wallet(),
        tmiService.history(),
      ]);
      setRewards(rewardPage.items);
      setWallet(walletData);
      setHistory(historyData);
    } catch (loadError) {
      setError(getTmiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmRedemption() {
    if (!pendingReward) return;
    setIsRedeeming(true);
    setError(null);
    try {
      const redemption = await tmiService.redeem(pendingReward.id, createIdempotencyKey());
      setPendingReward(null);
      setResult(redemption.idempotent ? "Yêu cầu đổi thưởng đã được xác nhận trước đó." : "Đổi thưởng thành công.");
      await load();
    } catch (redeemError) {
      setError(getTmiErrorMessage(redeemError));
    } finally {
      setIsRedeeming(false);
    }
  }

  if (isLoading) {
    return (
      <div className="tmi-rewards-page container student-dashboard__shell" aria-busy="true" aria-label="Đang tải TMI">
        <div className="tmi-rewards__skeleton" />
        <div className="tmi-rewards__skeleton tmi-rewards__skeleton--wide" />
      </div>
    );
  }

  return (
    <div className="tmi-rewards-page container student-dashboard__shell">
      <header className="tmi-rewards__header">
        <div>
          <p className="tmi-rewards__eyebrow">TMI Rewards</p>
          <h1>Đổi thưởng TMI</h1>
          <p>Đổi điểm lấy quyền lợi học tập và quà tặng. Số dư và kết quả đổi luôn được xác nhận từ hệ thống.</p>
        </div>
        <button className="tmi-rewards__refresh" type="button" onClick={() => void load()}>
          <RefreshCw aria-hidden="true" />
          Làm mới
        </button>
      </header>

      {error ? <div className="tmi-rewards__alert" role="alert">{error}</div> : null}
      {result ? <div className="tmi-rewards__success" role="status">{result}</div> : null}

      <section aria-labelledby="tmi-balance-heading">
        <h2 id="tmi-balance-heading" className="tmi-rewards__section-title">Số dư TMI</h2>
        <div className="tmi-rewards__balance-grid">
          <BalanceCard label="Hiện có" value={wallet.current} tone="tmi-rewards__balance-card--current" />
          <BalanceCard label="Đã tích lũy" value={wallet.earned} />
          <BalanceCard label="Đã sử dụng" value={wallet.spent} />
          <BalanceCard label="Đã hết hạn" value={wallet.expired} />
        </div>
      </section>

      <section aria-labelledby="tmi-catalog-heading">
        <div className="tmi-rewards__section-heading">
          <div>
            <h2 id="tmi-catalog-heading" className="tmi-rewards__section-title">Phần thưởng khả dụng</h2>
            <p>Chọn phần thưởng phù hợp với hành trình học của bạn.</p>
          </div>
          <Gift aria-hidden="true" />
        </div>
        {rewards.length === 0 ? (
          <div className="tmi-rewards__empty" role="status">
            <Gift aria-hidden="true" />
            <strong>Chưa có phần thưởng khả dụng.</strong>
            <span>Hãy quay lại sau để xem các quyền lợi mới.</span>
          </div>
        ) : (
          <div className="tmi-rewards__catalog" role="list">
            {rewards.map((reward) => (
              <article className="tmi-rewards__reward-card" key={reward.id} role="listitem">
                <div className="tmi-rewards__reward-icon"><Coins aria-hidden="true" /></div>
                <span className="tmi-rewards__reward-kind">{getRewardKindLabel(reward.kind)}</span>
                <h3>{reward.title}</h3>
                <p>{reward.description ?? "Quyền lợi dành cho học viên EduAI."}</p>
                <div className="tmi-rewards__reward-meta">
                  <strong>{formatNumber(reward.cost)} TMI</strong>
                  <span>Đến {formatDate(reward.endsAt)}</span>
                </div>
                <button type="button" onClick={() => { setResult(null); setPendingReward(reward); }} aria-label={`Đổi ${reward.title}`}>
                  Đổi thưởng
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="tmi-history-heading" className="tmi-rewards__history-section">
        <div className="tmi-rewards__section-heading">
          <div>
            <h2 id="tmi-history-heading" className="tmi-rewards__section-title">Lịch sử TMI</h2>
            <p>Các biến động điểm do hệ thống ghi nhận.</p>
          </div>
          <History aria-hidden="true" />
        </div>
        {history.length === 0 ? (
          <div className="tmi-rewards__history-empty">Chưa có giao dịch TMI.</div>
        ) : (
          <ol className="tmi-rewards__history" aria-label="Lịch sử giao dịch TMI">
            {history.map((entry) => (
              <li key={entry.id}>
                <span><strong>{entry.kind}</strong><small>{formatDate(entry.occurredAt)} · {entry.sourceType}</small></span>
                <strong className={entry.kind === "redeem" || entry.kind === "expiry" ? "tmi-rewards__amount--debit" : "tmi-rewards__amount--credit"}>
                  {entry.kind === "redeem" || entry.kind === "expiry" ? "−" : "+"}{formatNumber(entry.amount)} TMI
                </strong>
              </li>
            ))}
          </ol>
        )}
      </section>

      {pendingReward ? (
        <div className="tmi-rewards__dialog-backdrop">
          <div className="tmi-rewards__dialog" role="dialog" aria-modal="true" aria-labelledby="tmi-confirm-heading">
            <h2 id="tmi-confirm-heading">Xác nhận đổi thưởng</h2>
            <p>Bạn muốn đổi <strong>{pendingReward.title}</strong> với giá <strong>{formatNumber(pendingReward.cost)} TMI</strong>?</p>
            <div className="tmi-rewards__dialog-actions">
              <button type="button" onClick={() => setPendingReward(null)} disabled={isRedeeming}>Hủy</button>
              <button type="button" onClick={() => void confirmRedemption()} disabled={isRedeeming}>
                {isRedeeming ? <LoaderCircle aria-hidden="true" className="tmi-rewards__spinner" /> : null}
                {isRedeeming ? "Đang xử lý" : "Xác nhận đổi"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
