export const COMPATIBILITY_SELECTION_SESSION_KEY = 'aquaguide_compatibility_selection';

const normalizeIds = (value: unknown) => (
  Array.isArray(value)
    ? Array.from(new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0)))
    : []
);

export const getCompatibilitySelection = () => {
  if (typeof window === 'undefined') return [] as string[];
  try {
    return normalizeIds(JSON.parse(window.sessionStorage.getItem(COMPATIBILITY_SELECTION_SESSION_KEY) || '[]'));
  } catch {
    return [];
  }
};

export const setCompatibilitySelection = (ids: Iterable<string>) => {
  const normalized = normalizeIds(Array.from(ids));
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(COMPATIBILITY_SELECTION_SESSION_KEY, JSON.stringify(normalized));
  }
  return normalized;
};
