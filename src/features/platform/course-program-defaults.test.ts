import { describe, expect, it } from 'vitest';
import { DEFAULT_PLATFORM_SETTINGS, withCourseProgramDefaults } from './platform.defaults';

describe('historical course program compatibility', () => {
  it('recognizes known legacy labels after reordering without changing input', () => {
    const categories = DEFAULT_PLATFORM_SETTINGS.courses.categories.map(({ id: _id, ...label }) => label).reverse();
    const before = JSON.stringify(categories);
    const result = withCourseProgramDefaults({ categories }) as { categories: Array<{ id: string }> };
    expect(result.categories.map(group => group.id)).toEqual(['scholarships', 'joint-programs', 'higher-education', 'vocational', 'k12', 'online']);
    expect(JSON.stringify(categories)).toBe(before);
  });
  it('retains explicit ids after translated labels change and leaves unknown legacy groups unconnected', () => {
    const categories = [{ id: 'k12', vi: 'New name', en: 'New name' }, { vi: 'Custom', en: 'Custom' }];
    expect(withCourseProgramDefaults({ categories })).toEqual({ categories: [categories[0], { ...categories[1], id: 'legacy-program-2' }] });
  });
});
