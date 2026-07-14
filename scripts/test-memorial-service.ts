import assert from 'node:assert/strict';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const localStorage = new MemoryStorage();
const eventTarget = new EventTarget();
const fakeWindow = Object.assign(eventTarget, { localStorage, setTimeout, clearTimeout });
Object.defineProperty(globalThis, 'window', { value: fakeWindow, configurable: true });
Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true });

const { recordSpeciesMemorial } = await import('../src/services/collection/memorial.service');

assert.throws(
  () => recordSpeciesMemorial({ fishId: 'sp_0015', date: '2026-07-14', reason: '  ' }),
  /日期和原因/,
);

let stateChangeCount = 0;
window.addEventListener('aquaguide:app-state-changed', () => { stateChangeCount += 1; });
const result = recordSpeciesMemorial({
  fishId: 'sp_0015',
  date: '2026-07-14',
  reason: '换水温差过大，后续先对温再缓慢换水',
});

assert.equal(result.records.length, 1);
assert.equal(result.record.reason, '换水温差过大，后续先对温再缓慢换水');
assert.equal(stateChangeCount, 1);
assert.deepEqual(JSON.parse(localStorage.getItem('deceasedRecords') || '[]'), result.records);

console.log('memorial service: required review, compatible storage and change event passed');
