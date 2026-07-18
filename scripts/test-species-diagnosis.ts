import assert from 'node:assert/strict';

import { buildSpeciesDiagnosisStep, parseLocalSymptomObservations } from '../packages/domain-rules/src/index';
import type { SpeciesDiagnosisStepInput } from '../packages/contracts/src/index';
import { fishData } from '../src/data/fishData';
import { mapVisionCandidateToCatalog } from '../src/lib/speciesRecognition';

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

const invalidAiObservation = buildSpeciesDiagnosisStep(input('鱼不动', {
  answers: { scope: 'invented-value' },
}), [{ code: 'breathing', value: 'invented-value', source: 'user_text' }]);
assert.equal(invalidAiObservation.nextQuestion?.id, 'scope');

const noRepeat = buildSpeciesDiagnosisStep(input('鱼不动', {
  answers: { scope: 'single' },
  askedQuestionIds: ['scope'],
}));
assert.notEqual(noRepeat.nextQuestion?.id, 'scope');

const maxThree = buildSpeciesDiagnosisStep(input('鱼不动', {
  askedQuestionIds: ['scope', 'breathing', 'posture'],
}));
assert.equal(maxThree.complete, true);
assert.equal(maxThree.nextQuestion, undefined);

const guppy = fishData.find(item => item.scientificName === 'Poecilia reticulata');
assert.ok(guppy);
const byScientificName = mapVisionCandidateToCatalog({ commonName: 'Unknown', scientificName: 'Poecilia reticulata', confidenceBand: 'high', visualEvidence: [] }, fishData);
assert.equal(byScientificName.fish?.id, guppy.id);
assert.equal(byScientificName.matchType, 'exact');
const unmatched = mapVisionCandidateToCatalog({ commonName: 'Not a catalog species', confidenceBand: 'low', visualEvidence: [] }, fishData);
assert.equal(unmatched.matchType, 'none');

console.log('species diagnosis and catalog mapping: 10 scenarios passed');
