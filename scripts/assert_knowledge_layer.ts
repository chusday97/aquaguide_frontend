import type { Aquarium, Fish } from '../src/types';
import { evaluateCompatibilityDecision } from '../src/modules/knowledge/compatibilityKnowledge';
import { buildDiagnosisPresentation, buildSpeciesDetailPresentation } from '../src/modules/knowledge/knowledgePresentation';
import { validateDiagnosisGraph, DIAGNOSIS_GRAPHS } from '../src/modules/knowledge/diagnosisGraph';
import { buildSpeciesKnowledgeProfile } from '../src/modules/knowledge/speciesKnowledge';

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const fish = (overrides: Partial<Fish>): Fish => ({
  id: 'fish-default',
  name: '测试鱼',
  scientificName: 'Test fish',
  category: '观赏鱼',
  image: '',
  difficulty: 'Easy',
  waterTemperature: '24-28°C',
  phLevel: '6.5-7.5',
  waterChangeCycle: 7,
  description: '本地验证用物种。',
  diet: '杂食',
  tankSize: '至少 40L',
  temperament: 'Peaceful',
  size: 'Small',
  housingMode: '适合混养',
  ...overrides,
});

const tank: Aquarium = {
  id: 'tank-1',
  name: '测试淡水缸',
  fishes: [],
  dimensions: { length: '60', width: '35', height: '40' },
  waterType: 'Freshwater',
  targetTemperature: '25',
  equipment: {
    filter: '瀑布过滤',
    heater: true,
    oxygen: true,
    light: '普通灯',
  },
};

const tetra = fish({
  id: 'tetra',
  name: '红绿灯',
  scientificName: 'Paracheirodon innesi',
  category: '灯科鱼',
  tankSize: '至少 40L',
});

const shrimp = fish({
  id: 'shrimp',
  name: '大和藻虾',
  scientificName: 'Caridina multidentata',
  category: '工具虾',
  tankSize: '至少 30L',
});

const coral = fish({
  id: 'coral',
  name: '脑珊瑚',
  scientificName: 'Trachyphyllia geoffroyi',
  category: '海水珊瑚',
  waterTemperature: '24-27°C',
  phLevel: '8.1-8.4',
  tankSize: '至少 120L',
  description: '海水珊瑚，需要海水缸。',
  temperament: 'Territorial',
  size: 'Medium',
  housingMode: '谨慎混养',
});

const pairDecision = evaluateCompatibilityDecision({
  tank,
  items: [
    { species: tetra, quantity: 6 },
    { species: shrimp, quantity: 3 },
    { species: coral, quantity: 1 },
  ],
});

assert(pairDecision.pairResults.length === 3, '3 个物种必须生成 3 组两两关系。');

const coralPair = pairDecision.pairResults.find(pair => (
  pair.speciesA.id === 'coral' || pair.speciesB.id === 'coral'
));

assert(coralPair, '含海水珊瑚的组合必须生成对应 pair。');
assert(coralPair?.status === 'not_recommended', '淡水缸评估海水珊瑚必须不建议。');
assert(coralPair?.primaryReason?.riskType === 'water_type', '水体硬冲突必须是主风险，不能被 pH 或空间覆盖。');
assert(coralPair?.speciesA.id && coralPair?.speciesB.id, '每条风险必须能定位到具体两个物种。');

const guppyProfile = buildSpeciesKnowledgeProfile(fish({
  id: 'guppy',
  name: '孔雀鱼',
  scientificName: 'Poecilia reticulata',
}));
const guppyPresentation = buildSpeciesDetailPresentation(guppyProfile);

assert(guppyProfile.knowledge.sexIdentification.confidence === 'unknown', '无结构化字段时不能推断公母。');
assert(guppyProfile.knowledge.sexIdentification.title === '暂无可靠的公母辨别资料', '公母判断缺失时必须显示明确空状态。');
assert(guppyPresentation.tags.length <= 3, '鱼种详情顶部标签最多 3 个。');

const diagnosisErrors = validateDiagnosisGraph();
assert(diagnosisErrors.length === 0, `诊断图引用错误：${diagnosisErrors.join(', ')}`);

Object.values(DIAGNOSIS_GRAPHS).forEach(graph => {
  const result = graph.results[0];
  const firstAnswer = `${graph.nodes[0].question}：${graph.nodes[0].options[0].label}`;
  const presentation = buildDiagnosisPresentation(result, [firstAnswer]);
  assert(presentation.title && presentation.actions.length > 0, `诊断结果 ${result.id} 必须能生成展示层。`);
});

console.log('knowledge layer assertions passed');
