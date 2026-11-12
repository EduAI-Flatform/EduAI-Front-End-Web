import { ApiClient } from './api-client';
import { getAuthSession } from './auth.service';
export interface MembershipTier {
  code: string;
  name: { vi: string; en: string };
  threshold: number;
  benefits: Array<{ vi: string; en: string }>;
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
const client = new ApiClient({ getAccessToken: () => getAuthSession()?.accessToken });
export const membershipCardsService = {
  mine: () => client.get<MembershipCardState>('/membership-cards/me'),
};
