import { tmiLedgerKindLabel, tmiLedgerSourceLabel, tmiRewardKindLabel } from "../../../platform/system-enum-labels";
import { SystemValue } from '@/features/platform/SystemText';
import { currentSystemLocale } from "../../../platform/translate-system-message";
import { SystemText, useSystemMessages } from "../../../platform/SystemText";
import { usePlatform } from "../../../platform/PlatformProvider";
import { useCallback, useEffect, useState } from "react";
import { Gift, History, LoaderCircle, RefreshCw } from "lucide-react";
import { GdsPointMark } from "../../../../components/brand/GdsPointMark";
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
  return new Intl.NumberFormat(currentSystemLocale()).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(currentSystemLocale(), { dateStyle: "medium" }).format(new Date(value));
}

function BalanceCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <article className={`tmi-rewards__balance-card ${tone ?? ""}`}>
      <span className="tmi-rewards__balance-label">{label}</span>
      <strong className="tmi-rewards__balance-value"><SystemValue render={() => (formatNumber(value))} /> GDS Point</strong>
    </article>
  );
}

export function TmiRewardsPage() {
  const messageForUi = useSystemMessages();
  const { settings, t } = usePlatform();
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
      <div className="tmi-rewards-page container student-dashboard__shell" aria-busy="true" aria-label={messageForUi("Đang tải GDS Point")}>
        <div className="tmi-rewards__skeleton" />
        <div className="tmi-rewards__skeleton tmi-rewards__skeleton--wide" />
      </div>
    );
  }

  return (
    <div className="tmi-rewards-page container student-dashboard__shell">
      <header className="tmi-rewards__header">
        <div className="tmi-rewards__headline">
          <GdsPointMark size="hero" imageUrl={settings.branding.pointImageUrl} />
          <div>
            <p className="tmi-rewards__eyebrow"><SystemText message={"Phần thưởng GDS Point"} /></p>
            <h1><SystemText message={"Đổi thưởng GDS Point"} /></h1>
            <p>{t("Điểm tích lũy, quyền lợi và lịch sử của bạn.", "Your points, rewards and activity.")}</p>
          </div>
        </div>
        <button className="tmi-rewards__refresh" type="button" onClick={() => void load()}>
          <RefreshCw aria-hidden="true" /><SystemText message="Làm mới" /></button>
      </header>

      {error ? <div className="tmi-rewards__alert" role="alert"><SystemText message={error} /></div> : null}
      {result ? <div className="tmi-rewards__success" role="status">{result}</div> : null}

      <section aria-labelledby="tmi-balance-heading">
        <h2 id="tmi-balance-heading" className="tmi-rewards__section-title tmi-rewards__point-heading"><GdsPointMark size="medium" imageUrl={settings.branding.pointImageUrl} /><SystemText message={"Số dư GDS Point"} /></h2>
        <div className="tmi-rewards__balance-grid">
          <BalanceCard label={messageForUi("Hiện có")} value={wallet.current} tone="tmi-rewards__balance-card--current" />
          <BalanceCard label={messageForUi("Đã tích lũy")} value={wallet.earned} />
          <BalanceCard label={messageForUi("Đã sử dụng")} value={wallet.spent} />
          <BalanceCard label={messageForUi("Đã hết hạn")} value={wallet.expired} />
        </div>
      </section>

      <section aria-labelledby="tmi-catalog-heading">
        <div className="tmi-rewards__section-heading">
          <div>
            <h2 id="tmi-catalog-heading" className="tmi-rewards__section-title"><SystemText message={"Phần thưởng khả dụng"} /></h2>
            <p>{t("Đổi điểm theo quyền lợi đang có.", "Redeem points for available rewards.")}</p>
          </div>
          <Gift aria-hidden="true" />
        </div>
        {rewards.length === 0 ? (
          <div className="tmi-rewards__empty" role="status">
            <Gift aria-hidden="true" />
            <strong><SystemText message={"Chưa có phần thưởng khả dụng."} /></strong>
            <span>{t("Phần thưởng mới sẽ xuất hiện tại đây.", "New rewards will appear here.")}</span>
            <button type="button" onClick={() => void load()}>{t("Kiểm tra lại", "Check again")}</button>
          </div>
        ) : (
          <div className="tmi-rewards__catalog" role="list">
            {rewards.map((reward) => (
              <article className="tmi-rewards__reward-card" key={reward.id} role="listitem">
                <div className="tmi-rewards__reward-icon"><GdsPointMark size="small" imageUrl={settings.branding.pointImageUrl} /></div>
                <span className="tmi-rewards__reward-kind">{tmiRewardKindLabel(reward.kind, t)}</span>
                <h3>{reward.title}</h3>
                <p>{reward.description ?? <SystemText message={"Quyền lợi dành cho học viên GDS."} />}</p>
                <div className="tmi-rewards__reward-meta">
                  <strong><SystemValue render={() => (formatNumber(reward.cost))} /> GDS Point</strong>
                  <span><SystemText message={"Đến"} /> <SystemValue render={() => (formatDate(reward.endsAt))} /></span>
                </div>
                <button type="button" onClick={() => { setResult(null); setPendingReward(reward); }} aria-label={`${messageForUi("Đổi ")}${reward.title}`}>
                  <SystemText message={"Đổi thưởng"} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="tmi-history-heading" className="tmi-rewards__history-section">
        <div className="tmi-rewards__section-heading">
          <div>
            <h2 id="tmi-history-heading" className="tmi-rewards__section-title"><SystemText message={"Lịch sử GDS Point"} /></h2>
            <p>{t("Tất cả thay đổi điểm.", "Your point activity.")}</p>
          </div>
          <History aria-hidden="true" />
        </div>
        {history.length === 0 ? (
          <div className="tmi-rewards__history-empty"><History aria-hidden="true" /><SystemText message={"Chưa có giao dịch GDS Point."} /></div>
        ) : (
          <ol className="tmi-rewards__history" aria-label={messageForUi("Lịch sử giao dịch GDS Point")}>
            {history.map((entry) => (
              <li key={entry.id}>
                <span><strong>{tmiLedgerKindLabel(entry.kind, t)}</strong><small><SystemValue render={() => (formatDate(entry.occurredAt))} /> · {tmiLedgerSourceLabel(entry.sourceType, t)}</small></span>
                <strong className={entry.kind === "redeem" || entry.kind === "expiry" ? "tmi-rewards__amount--debit" : "tmi-rewards__amount--credit"}>
                  {entry.kind === "redeem" || entry.kind === "expiry" ? "−" : "+"}<SystemValue render={() => (formatNumber(entry.amount))} /> GDS Point
                </strong>
              </li>
            ))}
          </ol>
        )}
      </section>

      {pendingReward ? (
        <div className="tmi-rewards__dialog-backdrop">
          <div className="tmi-rewards__dialog" role="dialog" aria-modal="true" aria-labelledby="tmi-confirm-heading">
            <h2 id="tmi-confirm-heading"><SystemText message={"Xác nhận đổi thưởng"} /></h2>
            <p><SystemText message={"Bạn muốn đổi"} /> <strong>{pendingReward.title}</strong> <SystemText message={"với giá"} /> <strong><SystemValue render={() => (formatNumber(pendingReward.cost))} /> GDS Point</strong>?</p>
            <div className="tmi-rewards__dialog-actions">
              <button type="button" onClick={() => setPendingReward(null)} disabled={isRedeeming}><SystemText message="Hủy" /></button>
              <button type="button" onClick={() => void confirmRedemption()} disabled={isRedeeming}>
                {isRedeeming ? <LoaderCircle aria-hidden="true" className="tmi-rewards__spinner" /> : null}
                {isRedeeming ? <SystemText message={"Đang xử lý"} /> : <SystemText message={"Xác nhận đổi"} />}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
