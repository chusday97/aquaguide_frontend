import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

const { LocalAquaGuideRepository } = await import('../src/services/repository/local-aquaguide.repository');
const repository = new LocalAquaGuideRepository();

const aquarium = await repository.saveAquarium({ id: 'local-tank', name: '本地测试缸', fishes: [], waterType: 'Freshwater' });
assert.equal(aquarium.id, 'local-tank');
assert.equal((await repository.getAquariums()).length, 1);

await repository.updateFavorite({ type: 'species', catalogKey: 'sp_0001', favorite: true });
assert.deepEqual(JSON.parse(localStorage.getItem('wishlistFishIds') || '[]'), ['sp_0001']);
await repository.updateFavorite({ type: 'species', catalogKey: 'sp_0001', favorite: false });
assert.deepEqual(JSON.parse(localStorage.getItem('wishlistFishIds') || '[]'), []);

const diagnosis = await repository.saveDiagnosis({
  diagnosisId: 'daily-local',
  createdAt: '2026-07-16T08:00:00.000Z',
  aquariumId: aquarium.id,
  problemType: '巡检',
  answers: {},
  resultSummary: '状态正常',
  riskLevel: '低风险',
  suggestedActions: [],
  missingInfo: [],
  followUpNotes: [],
});
assert.equal(diagnosis.diagnosisId, 'daily-local');

const memorial = await repository.saveMemorial({ speciesCatalogKey: 'sp_0001', date: '2026-07-16', reason: '完成复盘' });
assert.equal(memorial.fishId, 'sp_0001');

const reminder = await repository.updateCareReminder({
  action: 'upsert',
  record: {
    sourceTopicId: 'guide_water',
    title: '换水',
    type: 'water_change',
    scheduledFor: '2026-07-17T08:00:00.000Z',
  },
});
assert.equal(reminder?.sourceTopicId, 'guide_water');

const apiRepositorySource = readFileSync(resolve(import.meta.dirname, '../src/services/repository/api-aquaguide.repository.ts'), 'utf8');
const apiClientSource = readFileSync(resolve(import.meta.dirname, '../src/services/api/api-client.ts'), 'utf8');
assert.doesNotMatch(apiRepositorySource, /supabase\.from\(/);
assert.match(apiRepositorySource, /apiRequest/);
assert.match(apiClientSource, /Bearer/);
assert.match(apiClientSource, /Idempotency-Key/);
assert.match(apiRepositorySource, /syncSpeciesBatches/);
assert.match(apiRepositorySource, /aquarium-species-batch-update/);

console.log('repository boundary verified: local compatibility and cloud API-only access');
