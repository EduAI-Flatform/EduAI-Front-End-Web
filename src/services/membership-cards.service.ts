import { ApiClient } from './api-client';
import { getAuthSession } from './auth.service';
export interface MembershipTier {
  code: string;
  name: { vi: string; en: string };
  threshold: number;
  benefits: Array<{ vi: string; en: string }>;
  serviceLimits?: Array<{ definitionId: string; quota: string }>;
}
export interface CardServiceLimitSettings {
  enabled: boolean;
  consumptionPriority: 'card_first' | 'purchased_first';
  termAnchorAt: string;
  termMonths: number;
}
export interface MembershipPolicyContent {
  enabled: boolean; basis: string; currency: string; cycleMode: string; cycleMonths: number;
  tiers: MembershipTier[]; serviceLimits?: CardServiceLimitSettings;
}
export interface CardEvaluation {
  basis?: 'spend' | 'topup';
  status: 'disabled' | 'unavailable' | 'evaluated';
  reason: string | null;
  policyRevisionId: string | null;
  qualifyingAmountMinor: string | null;
  tier: MembershipTier | null;
  currency: string;
  windowStartsAt: string | null;
  windowEndsAt: string | null;
  evaluatedAt: string | null;
}
export interface MembershipCardState {
  policy: { enabled: boolean; basis: string; currency: string; cycleMode: string; cycleMonths: number; tiers: MembershipTier[] };
  evaluation: CardEvaluation;
  entitlementMigrationApplied: boolean;
  legacyPurchasedAccessPreserved: boolean;
}
export interface CardServiceQuota {
  code: string; displayName: string; source: 'card'; unitLabel: string | null;
  valueType: string; resetPeriod: string; allowed: boolean; quota: string | null;
  consumed: string | null; remaining: string | null; periodStartsAt: string | null; periodEndsAt: string | null;
}
export interface CardServiceQuotaState {
  cardItems?: CardServiceQuota[];
  evaluatedAt: string;
}
const client = new ApiClient({ getAccessToken: () => getAuthSession()?.accessToken });
export const membershipCardsService = {
  mine: () => client.get<MembershipCardState>('/membership-cards/me'),
  quotas: () => client.get<CardServiceQuotaState>('/membership/service-entitlements'),
};
