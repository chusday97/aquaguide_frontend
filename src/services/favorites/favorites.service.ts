import { loadAppStateFromStorage, patchLocalAppState } from '../storage/local-app-state';

export const FAVORITES_CHANGED_EVENT = 'aquaguide:favorites-changed';
export const SPECIES_FAVORITES_STORAGE_KEY = 'wishlistFishIds';
export const CARE_FAVORITES_STORAGE_KEY = 'aqua_care_favorites';

export type CareFavorite = {
  id: string;
  title: string;
  favoritedAt: string;
};

export type CareFavoriteMap = Record<string, CareFavorite>;

const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) || '') as T;
  } catch {
    return fallback;
  }
};

const normalizeSpeciesIds = (value: unknown) => (
  Array.isArray(value)
    ? value.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : []
);

const normalizeCareFavorites = (value: unknown): CareFavoriteMap => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, CareFavorite] => {
      const favorite = entry[1] as Partial<CareFavorite> | null;
      return Boolean(favorite && typeof favorite.id === 'string' && typeof favorite.title === 'string');
    })
  );
};

const emitFavoritesChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
};

export const getSpeciesFavoriteIds = () => {
  if (typeof window === 'undefined') return [] as string[];
  const legacyIds = normalizeSpeciesIds(readJson<unknown>(SPECIES_FAVORITES_STORAGE_KEY, []));
  const appStateIds = normalizeSpeciesIds(loadAppStateFromStorage().wishlist);
  return Array.from(new Set([...legacyIds, ...appStateIds]));
};

export const setSpeciesFavoriteIds = (ids: Iterable<string>) => {
  const normalized = Array.from(new Set(Array.from(ids).filter(Boolean)));
  patchLocalAppState({ wishlist: normalized });
  emitFavoritesChanged();
  return normalized;
};

export const toggleSpeciesFavorite = (speciesId: string) => {
  const next = new Set(getSpeciesFavoriteIds());
  const isFavorite = !next.has(speciesId);
  if (isFavorite) next.add(speciesId);
  else next.delete(speciesId);
  setSpeciesFavoriteIds(next);
  return isFavorite;
};

export const addSpeciesFavorite = (speciesId: string) => {
  const next = new Set(getSpeciesFavoriteIds());
  next.add(speciesId);
  setSpeciesFavoriteIds(next);
};

export const getCareFavorites = () => normalizeCareFavorites(
  readJson<unknown>(CARE_FAVORITES_STORAGE_KEY, {})
);

export const setCareFavorites = (favorites: CareFavoriteMap) => {
  if (typeof window === 'undefined') return favorites;
  const normalized = normalizeCareFavorites(favorites);
  try {
    window.localStorage.setItem(CARE_FAVORITES_STORAGE_KEY, JSON.stringify(normalized));
    emitFavoritesChanged();
  } catch (error) {
    console.warn('AquaGuide care favorites save failed', error);
  }
  return normalized;
};

export const toggleCareFavorite = (favorite: CareFavorite) => {
  const next = getCareFavorites();
  if (next[favorite.id]) delete next[favorite.id];
  else next[favorite.id] = favorite;
  return setCareFavorites(next);
};

export const getFavoriteCounts = () => ({
  species: getSpeciesFavoriteIds().length,
  care: Object.keys(getCareFavorites()).length,
});

export const subscribeToFavorites = (listener: () => void) => {
  if (typeof window === 'undefined') return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === SPECIES_FAVORITES_STORAGE_KEY
      || event.key === CARE_FAVORITES_STORAGE_KEY
      || event.key === 'aquarium_app_state_v1'
    ) listener();
  };
  window.addEventListener(FAVORITES_CHANGED_EVENT, listener);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(FAVORITES_CHANGED_EVENT, listener);
    window.removeEventListener('storage', handleStorage);
  };
};
