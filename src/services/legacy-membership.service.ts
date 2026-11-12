import { ApiClient } from './api-client';
import { getAuthSession } from './auth.service';

export const LEGACY_SOURCES = ['orders', 'subscriptions', 'course_grants', 'service_grants'] as const;
export type LegacySource = typeof LEGACY_SOURCES[number];
export interface LegacyInventory {
  source: LegacySource; scope: 'source_page'; readOnly: true; migrationReadiness: 'not_assessed';
  observedAt: string; requiredSources: LegacySource[]; pageSize: number; hasMore: boolean; nextCursor: string | null;
  items: Array<{ id: string; orderId: string | null; code: string }>;
}
export interface LegacyReport {
  orderId: string; orderLineId?: string; scope: 'single_order'; readOnly: true; purchasedAccessPreserved: true;
  status: 'reconciled' | 'attention' | 'blocked'; findings: Array<{ code: string; resourceId?: string }>;
}
const client = new ApiClient({ getAccessToken: () => getAuthSession()?.accessToken });
export const legacyMembershipService = {
  inventory(source: LegacySource, after?: string): Promise<LegacyInventory> {
    const query = new URLSearchParams({ source, pageSize: '20' });
    if (after) query.set('after', after);
    return client.get(`/admin/membership/legacy-orders/inventory?${query}`);
  },
  report(orderId: string): Promise<LegacyReport> {
    return client.get(`/admin/membership/legacy-orders/${encodeURIComponent(orderId)}/reconciliation`);
  },
};
