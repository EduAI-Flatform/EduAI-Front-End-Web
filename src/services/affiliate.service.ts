import { ApiClient, ApiClientError } from './api-client';
import { getAuthSession } from './auth.service';
const client = new ApiClient({ getAccessToken: () => getAuthSession()?.accessToken });
const publicClient = new ApiClient();
const VISIT_KEY = 'gds.referral.visit.v1';
export interface AffiliateState {
  enabled: boolean; policyRevisionId: string | null; totalReferrals: number;
  identities: Array<{ id: string; kind: 'general' | 'instructor'; code: string; status: string; referralUrl: string | null; qrCodeDataUrl: string | null }>;
  accruedAmountMinor: string; currency: string; availableBalanceMinor: string | null;
  withdrawalEnabled: boolean; walletCreditStatus: string; subAffiliateEnabled: boolean;
  heldBalanceMinor?: string | null; debtMinor?: string | null; withdrawalMinimumMinor?: string | null; balanceScope?: 'GDS_WALLET';
}
export interface AffiliateRow {
  id: string; userName: string; kind: string; createdAt: string; orderNumber: string; orderStatus: string;
  policyRevisionId: string; accruedAmountMinor: string | null; holdUntil: string | null; currency: string; walletCreditStatus: string;
}
export interface AffiliatePage { items: AffiliateRow[]; total: number; page: number; pageSize: number; totalPages: number; }
export interface AffiliateFilters { page: number; search?: string; from?: string; to?: string; kind?: string; }
function query(filters: AffiliateFilters) {
  const params = new URLSearchParams({ page: String(filters.page), pageSize: '25' });
  for (const key of ['search', 'from', 'to', 'kind'] as const) if (filters[key]) params.set(key, filters[key]!);
  return params.toString();
}
function currentVisit(): { token: string; expiresAt: string } | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(VISIT_KEY) ?? 'null');
    return /^[a-f0-9]{64}$/.test(value?.token ?? '') && Date.parse(value.expiresAt) > Date.now() ? value : null;
  } catch { return null; }
}
export const affiliateService = {
  state: () => client.get<AffiliateState>('/affiliate/me'),
  createIdentity: (kind: 'general' | 'instructor') => client.post('/affiliate/identities', { kind }),
  reconcile: (after?: string) => client.post<{ nextCursor: string | null; items: Array<{ id: string; status: string; walletCreditStatus?: string }> }>('/affiliate/reconcile', after ? { after } : {}),
  list: (filters: AffiliateFilters) => client.get<AffiliatePage>('/affiliate/performance?' + query(filters)),
  export: (filters: AffiliateFilters) => client.get<{filename: string; contentType: string; dataBase64: string}>('/affiliate/performance/export?' + query(filters)),
};
/** First-touch visit is issued and dated by the server. Its opaque token carries no account data. */
export async function captureAffiliateVisit(code: string) {
  if (!/^[a-f0-9]{30}$/.test(code) || currentVisit()) return;
  const visit = await publicClient.post<{ token: string; expiresAt: string }>('/affiliate/visits', { code });
  sessionStorage.setItem(VISIT_KEY, JSON.stringify(visit));
}
export async function attachAffiliateVisit(orderId: string) {
  const visit = currentVisit();
  if (!visit) return;
  try { await client.post('/affiliate/attributions', { orderId, visitToken: visit.token }); }
  catch (error) {
    // An expired/disabled referral must not prevent a purchase. Network failures can be retried before payment.
    if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) {
      sessionStorage.removeItem(VISIT_KEY); return;
    }
    throw error;
  }
}
