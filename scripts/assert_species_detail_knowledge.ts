import assert from 'node:assert/strict';
import { buildSpeciesCarePresentation } from '../src/modules/knowledge/speciesCarePresentation';
import type { Fish } from '../src/types';

const baseFish: Fish = {
  id: 'test-species',
  name: '测试鱼',
  scientificName: 'Testus species',
  category: '淡水鱼',
  image: '',
  difficulty: 'Easy',
  waterTemperature: '24-28°C',
  phLevel: '6.5-7.5',
  waterChangeCycle: 7,
  description: '这段描述不能被当成常见风险。',
  diet: '基础杂食资料',
  tankSize: '至少 30 升',
  temperament: 'Peaceful',
  size: 'Small',
  housingReason: '这段混养说明不能被当成躲藏与造景资料。',
};

const basic = buildSpeciesCarePresentation(baseFish);
assert.equal(basic.sourceStatus, 'pending');
assert.equal(basic.sourceLabel, '资料待核验');
assert.deepEqual(basic.feedingItems, [{ label: '基础资料', value: '基础杂食资料' }]);
assert.equal(basic.feedingItems.some(item => item.value.includes('混养说明')), false);
assert.equal(basic.feedingItems.some(item => item.value.includes('常见风险')), false);

const reviewed = buildSpeciesCarePresentation({
  ...baseFish,
  feedingProfile: {
    feedingType: '杂食性',
    recommendedFoods: '微颗粒饲料',
    feedingFrequency: '每天 1 次',
    portionRule: '2 分钟内吃完',
    avoidFoods: '变质饲料',
    needsReview: true,
    reviewReason: '缺少物种专属来源',
    sourceName: 'rule_fallback',
  },
});
assert.equal(reviewed.sourceStatus, 'pending');
assert.equal(reviewed.sourceDetail, '缺少物种专属来源');
assert.equal(reviewed.feedingItems.some(item => item.label === '推荐食物'), true);

const generic = buildSpeciesCarePresentation({
  ...baseFish,
  feedingProfile: {
    feedingType: '杂食性',
    recommendedFoods: '通用饲料',
    feedingFrequency: '每天 1 次',
    portionRule: '少量',
    avoidFoods: '过量',
    needsReview: false,
    sourceName: 'rule_fallback',
  },
});
assert.equal(generic.sourceStatus, 'generic');
assert.equal(generic.sourceLabel, '通用参考');

console.log('species detail knowledge assertions passed');
