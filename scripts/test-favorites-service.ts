import assert from 'node:assert/strict';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

const localStorage = new MemoryStorage();
const eventTarget = new EventTarget();
const fakeWindow = Object.assign(eventTarget, {
  localStorage,
  setTimeout,
  clearTimeout,
});

Object.defineProperty(globalThis, 'window', { value: fakeWindow, configurable: true });
Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true });

const favorites = await import('../src/services/favorites/favorites.service');

localStorage.setItem('wishlistFishIds', JSON.stringify(['species_a']));
localStorage.setItem('aquarium_app_state_v1', JSON.stringify({
  version: 1,
  wishlist: ['species_b'],
  aquariums: [],
}));

assert.deepEqual(favorites.getSpeciesFavoriteIds().sort(), ['species_a', 'species_b']);

let changeCount = 0;
const unsubscribe = favorites.subscribeToFavorites(() => {
  changeCount += 1;
});

favorites.addSpeciesFavorite('species_c');
assert.deepEqual(favorites.getSpeciesFavoriteIds().sort(), ['species_a', 'species_b', 'species_c']);
assert.equal(changeCount, 1);

assert.equal(favorites.toggleSpeciesFavorite('species_b'), false);
assert.deepEqual(favorites.getSpeciesFavoriteIds().sort(), ['species_a', 'species_c']);
assert.equal(changeCount, 2);

favorites.toggleCareFavorite({ id: 'guide_a', title: '指南 A', favoritedAt: '2026-07-11T00:00:00.000Z' });
assert.equal(favorites.getFavoriteCounts().care, 1);
assert.equal(changeCount, 3);

favorites.toggleCareFavorite({ id: 'guide_a', title: '指南 A', favoritedAt: '2026-07-11T00:00:00.000Z' });
assert.equal(favorites.getFavoriteCounts().care, 0);
assert.equal(changeCount, 4);

unsubscribe();
console.log('favorites service: all checks passed');
