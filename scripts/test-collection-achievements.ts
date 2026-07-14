import assert from 'node:assert/strict';
import type { LocalAppState } from '../src/services/storage/local-app-state';
import { evaluateAchievements } from '../src/services/collection/collection.service';

const patrolDates = Array.from({ length: 7 }, (_, index) => {
  const date = new Date(2026, 6, 1 + index, 9, 0, 0);
  return {
    diagnosisId: `d-${index}`,
    aquariumId: 'tank-1',
    problemType: '巡检',
    createdAt: date.toISOString(),
  };
});

const state: LocalAppState = {
  version: 1,
  currentAquariumId: 'tank-1',
  aquariums: [{
    id: 'tank-1',
    name: '成就测试缸',
    fishes: [
      { id: 'resident-1', fishId: 'sp_0015', quantity: 1, entryDate: '2026-06-01', lastWaterChangeDate: '2026-07-03' },
      { id: 'resident-2', fishId: 'sp_0153', quantity: 1, entryDate: '2026-06-01', lastWaterChangeDate: '2026-07-03' },
    ],
    dimensions: { length: '200', width: '80', height: '60' },
    waterType: 'Freshwater',
    targetTemperature: '25',
    waterChangeHistory: ['2026-07-01', '2026-07-02', '2026-07-03'],
    equipment: { filter: '桶滤', heater: true, oxygen: true, light: '普通灯' },
  }],
  wishlist: [],
  dismissedRecommendations: [],
  diagnosisRecords: patrolDates,
  compatibilityRecords: [],
  deceasedRecords: [],
  feedingRecords: [],
  observationRecords: [],
  riskReminderState: {},
  updatedAt: new Date().toISOString(),
};

const memorials = [{ id: 'm-1', fishId: 'sp_0015', date: '2026-06-30', reason: '换水后应激，已复盘温差' }];
const achievements = evaluateAchievements(state, 5, 3, memorials);
assert.equal(achievements.length, 8);
assert.equal(achievements.every(item => item.unlocked), true, achievements.filter(item => !item.unlocked).map(item => item.id).join(','));
assert.equal(achievements.find(item => item.id === 'seven_day_guardian')?.current, 7);
assert.equal(achievements.find(item => item.id === 'compatible_community')?.unlocked, true);

const lockedReflection = evaluateAchievements(state, 5, 3, [{ ...memorials[0], reason: '' }]);
assert.equal(lockedReflection.find(item => item.id === 'life_reflection')?.unlocked, false);

const interruptedPatrolState = {
  ...state,
  diagnosisRecords: [patrolDates[0], patrolDates[2], patrolDates[3]],
};
const interrupted = evaluateAchievements(interruptedPatrolState, 0, 0, []);
assert.equal(interrupted.find(item => item.id === 'seven_day_guardian')?.current, 2);
assert.equal(interrupted.find(item => item.id === 'wishlist_collector')?.nextAction?.route, '/encyclopedia');

console.log('collection achievements: 8 rules, retrospective progress and safety gate passed');
