/** Validated JSON policy objects ignore property order; array order remains meaningful. */
export function policyContentEqual(left: unknown, right: unknown): boolean {
  const stable = (value: unknown) => JSON.stringify(value, (_key, item: unknown) => {
    if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      const object = item as Record<string, unknown>;
      return Object.fromEntries(Object.keys(object).sort().map(key => [key, object[key]]));
    }
    return item;
  });
  return stable(left) === stable(right);
}
