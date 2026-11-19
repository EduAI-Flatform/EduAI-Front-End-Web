import { expect, it } from 'vitest';
import { DEFAULT_PLATFORM_SETTINGS, withAffiliateRankingDefaults } from './platform.defaults';

it('prepares legacy affiliate content without mutating immutable JSON or repairing present malformed ranking', () => {
  const old = Object.freeze({ enabled: false, currency: 'VND' });
  expect(withAffiliateRankingDefaults(old)).toEqual({ ...old, ranking: DEFAULT_PLATFORM_SETTINGS.affiliate.ranking });
  expect(old).not.toHaveProperty('ranking');
  for (const ranking of [null, {}, 'invalid', undefined]) {
    const present = { ...old, ranking };
    expect(withAffiliateRankingDefaults(present)).toEqual(present);
  }
});
