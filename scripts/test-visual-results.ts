import assert from 'node:assert/strict';
import { buildCompatibilityVisualResult, buildDiagnosisVisualResult, mapFitStatus } from '../src/components/visual-results/visual-result.adapters';
import { evaluateCompatibilityDecision } from '../src/modules/knowledge/compatibilityKnowledge';
import type { DiagnosisOutput } from '../src/modules/diagnosis/diagnosis.types';
import type { Aquarium, Fish } from '../src/types';

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

const focus = makeFish({ id: 'focus', name: '孔雀鱼' });
const peaceful = makeFish({ id: 'peaceful', name: '红绿灯' });
const cautious = makeFish({ id: 'cautious', name: '领地鱼', temperament: 'Territorial', housingMode: '谨慎混养' });
const predator = makeFish({ id: 'predator', name: '大型捕食鱼', size: 'Large', temperament: 'Aggressive', description: '会吞食小鱼' });
const extra = makeFish({ id: 'extra', name: '斑马鱼' });
const species = [peaceful, cautious, predator, extra, focus];
const aquarium: Aquarium = {
  id: 'tank-visual',
  name: '视觉测试缸',
  fishes: [],
  dimensions: { length: '120', width: '50', height: '50' },
  waterType: 'Freshwater',
  targetTemperature: '25',
  equipment: { filter: '桶滤', heater: true, oxygen: true, light: '普通灯' },
};
const decision = evaluateCompatibilityDecision({
  tank: aquarium,
  items: species.map(item => ({ species: item, quantity: 1 })),
});
const originalDecision = JSON.stringify(decision);
const compatibilityModel = buildCompatibilityVisualResult({
  decision,
  species,
  focusSpeciesId: focus.id,
  primaryActionLabel: '调整组合',
});

assert.equal(compatibilityModel.status, 'not_recommended');
assert.equal(compatibilityModel.subjects[0]?.id, focus.id, '明确指定的关注物种必须保持为视觉中心');
assert.equal(compatibilityModel.subjects.length, species.length, '关联对象不能被适配器丢失');
assert.ok(compatibilityModel.subjects.some(item => item.id === predator.id && item.status === 'not_recommended'));
assert.ok(compatibilityModel.detailSections.length > 0, '完整依据应进入折叠层');
assert.equal(JSON.stringify(decision), originalDecision, '展示适配不能修改规则结果');

const diagnosis: DiagnosisOutput = {
  riskLevel: 'high',
  riskLabel: '高风险',
  summary: '鱼只频繁浮头，优先处理缺氧。',
  currentAction: '立即增氧并停止喂食。',
  actions: ['立即增氧'],
  avoidActions: ['不要盲目下药'],
  possibleCauses: ['缺氧或水质恶化'],
  observeItems: ['呼吸是否恢复'],
  missingInfo: ['氨氮'],
  evidence: ['用户选择了频繁浮头'],
  keyMetrics: [],
  matchedRules: ['frequent-breathing-warning'],
  matchedArticles: [],
};
const diagnosisModel = buildDiagnosisVisualResult({
  result: diagnosis,
  answers: { breathing: '频繁浮头', odor: '明显异味' },
  aquariumName: '客厅缸',
  livestock: [focus],
  primaryActionLabel: '查看补救步骤',
  primaryActionType: 'dialog',
});

assert.equal(diagnosisModel.status, 'urgent');
assert.equal(diagnosisModel.subjects[0]?.role, 'focus');
assert.ok(diagnosisModel.subjects.some(item => item.name === '呼吸状态'));
assert.ok(diagnosisModel.detailSections.some(section => section.id === 'avoid'));
assert.equal(diagnosisModel.primaryAction.actionType, 'dialog');
assert.equal(mapFitStatus('suitable'), 'compatible');
assert.equal(mapFitStatus('conflictRisk'), 'not_recommended');
assert.equal(mapFitStatus('unknown'), 'insufficient_data');

console.log('visual results: compatibility focus, diagnosis mapping, evidence folding passed');
