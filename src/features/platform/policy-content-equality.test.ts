import { describe, expect, it } from 'vitest';
import { policyContentEqual } from './policy-content-equality';
describe('JSON policy content equality', () => {
  it('ignores nested object key order after JSONB persistence', () => {
    expect(policyContentEqual({ tiers: [{ code: 'member', name: { vi: 'Thẻ', en: 'Card' } }] }, { tiers: [{ name: { en: 'Card', vi: 'Thẻ' }, code: 'member' }] })).toBe(true);
  });
  it('retains navigation and tier array ordering', () => {
    expect(policyContentEqual({ navigation: ['courses', 'learning'] }, { navigation: ['learning', 'courses'] })).toBe(false);
  });
  it.each([[null, false], [false, 0], [0, '0'], [{ a: null }, {}], [{ threshold: 0 }, { threshold: 1 }]])('detects actual JSON value changes', (left, right) => {
    expect(policyContentEqual(left, right)).toBe(false);
  });
});
