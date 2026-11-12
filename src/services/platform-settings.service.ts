import { ApiClient } from "./api-client";
import { getAuthSession } from "./auth.service";
import { type PlatformSettings } from "../features/platform/PlatformProvider";
import type { CardEvaluation } from './membership-cards.service';
import { type PlatformGroup } from "../features/platform/platform.defaults";

const client = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});
export interface PolicyRevision {
  id: string;
  group: PlatformGroup;
  version: number;
  status: "draft" | "approved" | "scheduled" | "cancelled";
  content: unknown;
  createdAt: string;
  createdById: string;
  approvedById: string | null;
  effectiveAt: string | null;
}
export interface PolicyState {
  settings: PlatformSettings;
  revisions: PolicyRevision[];
  versions: Partial<Record<PlatformGroup, string>>;
  groups: PlatformGroup[];
  pointCapabilities?: { supportedEvents: string[]; historicalAwardsPreserved: boolean;
    reprocessesHistoricalEvents: boolean; impactWindowDays: number;
    activationReady?: boolean; activationBlocker?: string | null };
}
export interface PolicyPreview {
  revisionId: string;
  group: string;
  version: number;
  changed: boolean;
  before: unknown;
  after: unknown;
  canSchedule: boolean;
  blockers: string[];
  preservesPurchasedAccess: boolean;
  membershipImpact: MembershipImpact | null;
  pointsImpact?: PointImpact | null;
}
interface PointImpactFacts {
  simulationOnly: true;
  historicalAwardsPreserved: true;
  reprocessesHistoricalEvents: false;
  windowStart: string;
  windowEnd: string;
  sampleLimit: number;
  beforeRevisionId: string | null;
  afterRevisionId: string;
}
export type PointImpact = PointImpactFacts & ({ status: 'evaluated'; sampledEvents: number; sampledLearners: number;
  affectedLearners: number; changedEvents: number; beforePoints: number; afterPoints: number }
  | { status: 'limit_exceeded'; sampledEvents: null; sampledLearners: null; affectedLearners: null;
    changedEvents: null; beforePoints: null; afterPoints: null });
export interface MembershipImpact {
  status: string;
  reason: string | null;
  policyRevisionId: string;
  evaluatedUsers?: number;
  totalUsers?: number;
  projectedChangesOnPage?: number;
  projectedBenefitChangesOnPage?: number;
  nextCursor: string | null;
  complete: boolean;
  items: Array<{ userId: string; previousTierCode: string | null; evaluation: CardEvaluation;
    projectedBenefitsChanged?: boolean | null; previousBenefits?: Array<{ vi: string; en: string }> | null }>;
}
export const platformSettingsService = {
  membershipImpact: (revisionId: string, after: string) => client.get<MembershipImpact>(
    `/admin/membership-cards/revisions/${revisionId}/impact?after=${encodeURIComponent(after)}`),
  state: () => client.get<PolicyState>("/admin/platform/settings"),
  create: (group: PlatformGroup, content: unknown) =>
    client.post<PolicyRevision>("/admin/platform/revisions", {
      group,
      content,
    }),
  preview: (id: string) =>
    client.get<PolicyPreview>(`/admin/platform/revisions/${id}/preview`),
  approve: (id: string) =>
    client.post<PolicyRevision>(`/admin/platform/revisions/${id}/approve`),
  schedule: (id: string, effectiveAt: string) =>
    client.post<PolicyRevision>(`/admin/platform/revisions/${id}/schedule`, {
      effectiveAt,
    }),
  cancel: (id: string) => client.post(`/admin/platform/revisions/${id}/cancel`),
};
