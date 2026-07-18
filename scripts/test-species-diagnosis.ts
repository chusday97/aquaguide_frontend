import assert from 'node:assert/strict';

import { buildSpeciesDiagnosisStep, parseLocalSymptomObservations } from '../packages/domain-rules/src/index';
import type { SpeciesDiagnosisStepInput } from '../packages/contracts/src/index';

const baseSnapshot = {
  aquariumId: 'tank-1',
  waterType: 'Freshwater',
  temperature: '25°C',
  volume: '60L',
  stocked: '孔雀鱼 5 条',
  recentWaterChange: '3 天前',
  recentFeeding: '今天',
  recentAddedSpecies: '无',
};

const input = (description: string, overrides: Partial<SpeciesDiagnosisStepInput> = {}): SpeciesDiagnosisStepInput => ({
  locale: 'zh-CN',
  speciesCatalogKey: 'sp_0001',
  aquariumSnapshot: baseSnapshot,
  userDescription: description,
  answers: {},
  askedQuestionIds: [],
  ...overrides,
});

const singleNewFish = buildSpeciesDiagnosisStep(input('单条新鱼躲着不动'));
assert.equal(singleNewFish.urgency, 'watch');
assert.equal(singleNewFish.nextQuestion?.id, 'breathing');
assert.equal(singleNewFish.hypotheses[0]?.code, 'acclimation_stress');

const wholeTankAcute = buildSpeciesDiagnosisStep(input('全缸不动并急促呼吸'));
assert.equal(wholeTankAcute.urgency, 'urgent');
assert.equal(wholeTankAcute.nextQuestion?.id, 'posture');
assert.ok(wholeTankAcute.emergencyActions.some(action => action.includes('增氧')));
assert.notEqual(wholeTankAcute.nextQuestion?.id, singleNewFish.nextQuestion?.id);

const answered = buildSpeciesDiagnosisStep(input('鱼不动', {
  answers: { scope: 'all', breathing: 'surface_gasping', posture: 'sideways' },
  askedQuestionIds: ['scope', 'breathing', 'posture'],
}));
assert.equal(answered.complete, true);
assert.equal(answered.nextQuestion, undefined);
assert.equal(answered.urgency, 'urgent');
assert.ok(answered.hypotheses.every(item => !item.recommendedActions.some(action => action.includes('下药'))));

const local = parseLocalSymptomObservations('全缸浮头，刚刚换水');
assert.deepEqual(local.map(item => item.code), ['scope', 'breathing', 'recent_change']);

const english = buildSpeciesDiagnosisStep(input('single new fish hiding and not moving', { locale: 'en' }));
assert.equal(english.nextQuestion?.id, singleNewFish.nextQuestion?.id);
assert.deepEqual(english.hypotheses.map(item => item.code), singleNewFish.hypotheses.map(item => item.code));
assert.match(english.disclaimer, /risk triage/i);

console.log('species diagnosis rules: 5 scenarios passed');
