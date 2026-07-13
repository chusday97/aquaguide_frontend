import assert from 'node:assert/strict';
import { evaluateSpeciesCombination } from '../src/lib/tankCompatibilityEngine';
import type { Fish } from '../src/types';

const makeFish = (overrides: Partial<Fish> & Pick<Fish, 'id' | 'name'>): Fish => ({
  id: overrides.id,
  name: overrides.name,
  scientificName: `${overrides.name} scientific`,
  category: '小型观赏鱼',
  image: '/test.png',
  difficulty: 'Easy',
  waterTemperature: '22-26°C',
  phLevel: '6.5-7.5',
  waterChangeCycle: 7,
  description: '温和小型淡水鱼',
  diet: '杂食',
  tankSize: '40L',
  temperament: 'Peaceful',
  size: 'Small',
  housingMode: '适合混养',
  ...overrides,
});

const peacefulA = makeFish({ id: 'peaceful-a', name: '温和鱼 A' });
const peacefulB = makeFish({ id: 'peaceful-b', name: '温和鱼 B' });
const territorial = makeFish({ id: 'territorial', name: '领地鱼', temperament: 'Territorial', housingMode: '谨慎混养' });
const predator = makeFish({ id: 'predator', name: '大型捕食鱼', size: 'Large', temperament: 'Aggressive', description: '会吞食小鱼' });
const incomplete = makeFish({ id: 'incomplete', name: '资料缺失鱼', waterTemperature: '' });

const compatible = evaluateSpeciesCombination([peacefulA, peacefulB]);
assert.equal(compatible.status, 'compatible');
assert.equal(compatible.metadata.scope, 'species_only');

const caution = evaluateSpeciesCombination([peacefulA, territorial]);
assert.equal(caution.status, 'caution');

const blockedForward = evaluateSpeciesCombination([predator, peacefulA]);
const blockedReverse = evaluateSpeciesCombination([peacefulA, predator]);
assert.equal(blockedForward.status, 'not_recommended');
assert.equal(blockedReverse.status, 'not_recommended', '选择顺序不得改变捕食结论');

const insufficient = evaluateSpeciesCombination([peacefulA, incomplete]);
assert.equal(insufficient.status, 'insufficient_data');

const needsMore = evaluateSpeciesCombination([peacefulA]);
assert.equal(needsMore.status, 'insufficient_data');
assert.equal(needsMore.missingData[0]?.code, 'missing_species_pair');

console.log('mini compatibility: compatible/caution/not_recommended/insufficient_data passed');
