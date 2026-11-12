import { useEffect, useState } from 'react';
import { GdsWithdrawalPanel } from '../wallet/GdsWithdrawalPanel';
import { gdsWalletService, type GdsWalletSummary } from '../../services/gds-wallet.service';
import { usePlatform } from '../platform/PlatformProvider';

/** Reuse the existing verified/manual bank withdrawal flow and its idempotent request handling. */
export function AffiliateWithdrawal({ onChanged }: { onChanged: () => void }) {
  const { t } = usePlatform();
  const [summary, setSummary] = useState<GdsWalletSummary | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState(false);
  useEffect(() => {
    let mounted = true;
    gdsWalletService.summary().then(value => { if (mounted) { setSummary(value); setError(false); } })
      .catch(() => { if (mounted) setError(true); });
    return () => { mounted = false; };
  }, [revision]);
  if (error) return <div role="alert"><p>{t('Chưa tải được ví GDS.', 'Unable to load the GDS wallet.')}</p>
    <button onClick={() => { setError(false); setRevision(value => value + 1); }}>{t('Thử lại', 'Retry')}</button></div>;
  if (!summary) return <p role="status">{t('Đang tải ví…', 'Loading wallet…')}</p>;
  return <GdsWithdrawalPanel summary={summary} onChanged={() => { setRevision(value => value + 1); onChanged(); }} />;
}
