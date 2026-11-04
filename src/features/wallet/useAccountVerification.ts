import { useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../../services/api-client';
import { gdsWithdrawalService, type AccountVerification } from '../../services/gds-withdrawal.service';

export function useAccountVerification(bankCode: string, accountNumber: string, enabled: boolean) {
  const [result, setResult] = useState<AccountVerification | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'invalid' | 'error' | 'expired'>('idle');
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  // Match the result to current inputs during render, before effects run.
  const current = result?.bankCode === bankCode && result.accountNumber === accountNumber ? result : null;
  useEffect(() => {
    const version = ++generation.current;
    setResult(null); setState('idle');
    if (!enabled || !bankCode || !/^[0-9]{6,19}$/.test(accountNumber)) return;
    const timer = window.setTimeout(() => {
      setState('loading');
      void gdsWithdrawalService.verifyAccount({ bankCode, accountNumber }).then(value => {
        if (version !== generation.current) return;
        if (value.bankCode !== bankCode || value.accountNumber !== accountNumber || !value.accountHolder || !value.verificationId || !Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= Date.now()) {
          setState('error'); return;
        }
        setResult(value); setState('success');
      }, cause => {
        if (version === generation.current) setState(cause instanceof ApiClientError && [400, 422].includes(cause.status) ? 'invalid' : 'error');
      });
    }, 600);
    return () => { window.clearTimeout(timer); generation.current++; };
  }, [bankCode, accountNumber, enabled, attempt]);
  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(() => { setResult(null); setState('expired'); }, Math.max(0, Date.parse(current.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [current]);
  return { result: enabled && current && Date.parse(current.expiresAt) > Date.now() ? current : null, state, retry: () => setAttempt(value => value + 1) };
}
