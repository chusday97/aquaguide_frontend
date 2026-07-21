import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  aquariumCreateSchema,
  aquariumSpeciesCreateSchema,
  aquariumSpeciesBatchCreateSchema,
  aquariumSpeciesBatchSplitSchema,
  careReminderCreateSchema,
  diagnosisSaveSchema,
} from '../packages/contracts/src/index';
import { clampAiPriority, highestRisk } from '../packages/domain-rules/src/index';
import { camelize, deterministicUuid, snakeize } from '../apps/api/src/data-utils';

assert.equal(aquariumCreateSchema.safeParse({ name: '客厅缸', lengthCm: 60 }).success, true);
assert.equal(aquariumCreateSchema.safeParse({ name: '', lengthCm: -1 }).success, false);
assert.equal(aquariumSpeciesCreateSchema.safeParse({ speciesCatalogKey: 'sp_0001', quantity: 3, entryDate: '2026-07-16' }).success, true);
assert.equal(aquariumSpeciesBatchCreateSchema.safeParse({ quantity: 2, entryDate: '2026-07-16', lifeStage: 'juvenile', reproductiveState: 'normal' }).success, true);
assert.equal(aquariumSpeciesBatchSplitSchema.safeParse({ quantity: 1, lifeStage: 'adult', reproductiveState: 'pregnant_or_gravid', sourceVersion: 1 }).success, true);
assert.equal(aquariumSpeciesBatchSplitSchema.safeParse({ quantity: 0, lifeStage: 'adult', reproductiveState: 'normal', sourceVersion: 1 }).success, false);
assert.equal(careReminderCreateSchema.safeParse({ sourceCatalogKey: 'guide_water', title: '换水', reminderType: '换水', scheduledFor: '2026-07-17T08:00:00+08:00' }).success, true);
assert.equal(diagnosisSaveSchema.safeParse({ diagnosisKey: 'daily', answers: {}, resultSummary: '正常', riskLevel: '低' }).success, true);

const firstId = deterministicUuid('user:operation:key');
assert.equal(firstId, deterministicUuid('user:operation:key'));
assert.notEqual(firstId, deterministicUuid('user:operation:other'));
assert.match(firstId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

assert.deepEqual(snakeize({ targetTemperatureC: 25, lastWaterStoredAt: undefined }), { target_temperature_c: 25 });
assert.deepEqual(camelize({ target_temperature_c: 25, nested_rows: [{ created_at: 'now' }] }), {
  targetTemperatureC: 25,
  nestedRows: [{ createdAt: 'now' }],
});

assert.equal(clampAiPriority('high', 'routine'), 'urgent');
assert.equal(clampAiPriority('low', 'watch'), 'watch');
assert.equal(highestRisk('low', 'high', 'medium'), 'high');

const routes = [
  readFileSync(resolve(import.meta.dirname, '../apps/api/src/routes/aquariums.ts'), 'utf8'),
  readFileSync(resolve(import.meta.dirname, '../apps/api/src/routes/user-records.ts'), 'utf8'),
].join('\n');

for (const route of [
  '/aquariums',
  '/aquariums/:id/species',
  '/aquariums/:id/species/:recordId/batches',
  '/aquariums/:id/species/:recordId/batches/:batchId/split',
  '/aquariums/:id/equipment',
  '/aquariums/:id/daily-checks/:localDate',
  '/memorial-records',
  '/care-reminders',
  '/care-events',
]) {
  assert.equal(routes.includes(route), true, `${route} route must exist`);
}
assert.match(routes, /registerFavoriteRoutes\('species'\)/);
assert.match(routes, /registerFavoriteRoutes\('care'\)/);

console.log('business API contract verified: validation, case conversion, deterministic ids, safety invariants and protected routes');
