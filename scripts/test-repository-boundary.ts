import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

class MemoryStorage {
  private values = new Map<string, string>();
  failWrites = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('quota exceeded');
    this.values.set(key, value);
  }
  removeItem(key: string) { this.values.delete(key); }
}

const localStorage = new MemoryStorage();
const eventTarget = new EventTarget();
const fakeWindow = Object.assign(eventTarget, { localStorage, setTimeout, clearTimeout });
Object.defineProperty(globalThis, 'window', { value: fakeWindow, configurable: true });
Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true });

const { LocalAquaGuideRepository } = await import('../src/services/repository/local-aquaguide.repository');
const { selectRepositoryMode } = await import('../src/services/repository/repository-mode');
const repository = new LocalAquaGuideRepository();

const aquarium = await repository.saveAquarium({ id: 'local-tank', name: '本地测试缸', fishes: [], waterType: 'Freshwater' });
assert.equal(aquarium.id, 'local-tank');
assert.equal((await repository.getAquariums()).length, 1);
const stateWithLocalTank = JSON.parse(localStorage.getItem('aquarium_app_state_v1') || '{}');
assert.equal(selectRepositoryMode(true, stateWithLocalTank), 'local', 'login must not bypass local migration confirmation');
assert.equal(selectRepositoryMode(true, { ...stateWithLocalTank, cloudMigrationConfirmed: true }), 'cloud');

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

const stocked = await repository.saveAquarium({
  ...aquarium,
  fishes: [{
    id: 'local-stock-1', fishId: 'sp_0001', quantity: 2,
    entryDate: '2026-07-16T00:00:00.000Z', lastWaterChangeDate: '2026-07-16T00:00:00.000Z',
    batches: [{ id: 'local-batch-1', quantity: 2, entryDate: '2026-07-16T00:00:00.000Z', lifeStage: 'adult', reproductiveState: 'normal', stateUpdatedAt: '2026-07-16T00:00:00.000Z' }],
  }],
});
const memorialUpdate = await repository.saveLivestockMemorial({ aquariumId: stocked.id, aquariumFishId: 'local-stock-1', batchId: 'local-batch-1', speciesCatalogKey: 'sp_0001', date: '2026-07-17', reason: '批次复盘', operationId: 'local-op-1' });
assert.equal(memorialUpdate.aquarium.fishes[0].quantity, 1, 'memorial and batch decrement must commit together');

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

localStorage.failWrites = true;
await assert.rejects(
  repository.saveAquarium({ ...aquarium, name: '不应伪成功' }),
  /quota exceeded/,
  'local repository must reject when storage writes fail',
);
localStorage.failWrites = false;

const apiRepositorySource = readFileSync(resolve(import.meta.dirname, '../src/services/repository/api-aquaguide.repository.ts'), 'utf8');
const apiClientSource = readFileSync(resolve(import.meta.dirname, '../src/services/api/api-client.ts'), 'utf8');
const aquariumApiSource = readFileSync(resolve(import.meta.dirname, '../apps/api/src/routes/aquariums.ts'), 'utf8');
const atomicSplitMigration = readFileSync(resolve(import.meta.dirname, '../supabase/migrations/202607220002_atomic_livestock_batch_split.sql'), 'utf8');
const atomicMemorialMigration = readFileSync(resolve(import.meta.dirname, '../supabase/migrations/202607220003_atomic_livestock_memorial.sql'), 'utf8');
const aquariumPageSource = readFileSync(resolve(import.meta.dirname, '../src/pages/Aquarium.tsx'), 'utf8');
assert.doesNotMatch(apiRepositorySource, /supabase\.from\(/);
assert.match(apiRepositorySource, /apiRequest/);
assert.match(apiClientSource, /Bearer/);
assert.match(apiClientSource, /Idempotency-Key/);
assert.match(apiRepositorySource, /syncSpeciesBatches/);
assert.match(apiRepositorySource, /aquarium-species-batch-update/);
assert.match(apiRepositorySource, /aquarium-species-batch-split/);
assert.match(aquariumApiSource, /rpc\('split_aquarium_species_batch'/);
assert.doesNotMatch(aquariumApiSource, /原数量已尝试恢复/);
assert.match(atomicSplitMigration, /for update/);
assert.match(atomicSplitMigration, /new_batch_id/);
assert.match(atomicSplitMigration, /aquarium_species_id = expected_species_record_id/);
assert.match(atomicSplitMigration, /BATCH_VERSION_CONFLICT/);
assert.match(aquariumApiSource, /rpc\('record_livestock_memorial'/);
assert.match(atomicMemorialMigration, /for update/);
assert.match(atomicMemorialMigration, /insert into public\.memorial_records/);
assert.match(atomicMemorialMigration, /species_record\.species_catalog_key/);
assert.doesNotMatch(atomicMemorialMigration, /target_species_catalog_key/);
assert.match(aquariumPageSource, /getCurrentAquaGuideRepository/);
assert.match(aquariumPageSource, /subscribeToRepositoryMode/);

console.log('repository boundary verified: local compatibility and cloud API-only access');
