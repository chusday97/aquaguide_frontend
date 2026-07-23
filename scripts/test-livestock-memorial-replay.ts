import assert from 'node:assert/strict';
import { resolveLivestockMemorialReplay } from '../apps/api/src/livestock-memorial-replay';

let ownershipChecks = 0;
const replay = await resolveLivestockMemorialReplay({
  resourceId: 'memorial-1',
  loadReplay: async id => ({ id }),
  assertOwnedSpecies: async () => { ownershipChecks += 1; },
});
assert.deepEqual(replay, { id: 'memorial-1' });
assert.equal(ownershipChecks, 0, 'a committed replay must not require the now-deleted livestock parent');

const fresh = await resolveLivestockMemorialReplay({
  resourceId: 'deterministic-new-id',
  loadReplay: async () => null,
  assertOwnedSpecies: async () => { ownershipChecks += 1; },
});
assert.equal(fresh, null);
assert.equal(ownershipChecks, 1, 'a fresh request must still verify livestock ownership');

await assert.rejects(
  resolveLivestockMemorialReplay({
    resourceId: 'missing-result',
    replayRequired: true,
    loadReplay: async () => null,
    assertOwnedSpecies: async () => { ownershipChecks += 1; },
  }),
  /暂时无法读取结果/,
);
assert.equal(ownershipChecks, 1, 'a broken replay must not fall through to a deleted parent lookup');

console.log('livestock memorial replay verified: committed retries bypass deleted livestock parents');
