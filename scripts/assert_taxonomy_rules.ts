import { fishData } from '../src/data/fishData';
import {
  getDisplayableSpecies,
  getEncyclopediaLifeType,
  getLifeType,
  getSpeciesFilterTags,
  getToolFunctions,
  getSecondaryCategory,
  isSpeciesCompatibleWithWaterType,
  speciesService,
} from '../src/modules/species/species.service';

type AssertionFailure = {
  rule: string;
  speciesId?: string;
  name?: string;
  details?: string;
};

const failures: AssertionFailure[] = [];
const fail = (failure: AssertionFailure) => failures.push(failure);
const displayableIds = new Set(getDisplayableSpecies().map(fish => fish.id));
const encyclopediaItems = speciesService.list({ includeScenery: false, limit: 500 }).items;

for (const fish of fishData) {
  const lifeType = getLifeType(fish);
  const encyclopediaLifeType = getEncyclopediaLifeType(fish);
  const secondaryCategory = getSecondaryCategory(fish);

  if ((lifeType === 'plant' || lifeType === 'hardscape') && displayableIds.has(fish.id)) {
    fail({
      rule: '水草/硬景不能进入图鉴展示列表',
      speciesId: fish.id,
      name: fish.name,
      details: `lifeType=${lifeType}`,
    });
  }

  if (['freshwaterFish', 'saltwaterFish', 'invertebrate', 'reptile', 'coral'].includes(encyclopediaLifeType) && !secondaryCategory) {
    fail({
      rule: '图鉴展示物种必须有用户可见二级分类',
      speciesId: fish.id,
      name: fish.name,
      details: `encyclopediaLifeType=${encyclopediaLifeType}`,
    });
  }
}

for (const item of encyclopediaItems) {
  const lifeType = getLifeType(item);
  if (lifeType === 'plant' || lifeType === 'hardscape') {
    fail({
      rule: 'speciesService.list 默认结果不能包含水草/硬景',
      speciesId: item.id,
      name: item.name,
      details: `lifeType=${lifeType}`,
    });
  }
}

const frogfishItems = fishData.filter(fish => /五彩青蛙|Synchiropus/i.test(`${fish.name} ${fish.scientificName}`));
if (frogfishItems.length === 0) {
  fail({ rule: '必须存在五彩青蛙/青蛙鱼数据' });
}

for (const fish of frogfishItems) {
  const lifeType = getEncyclopediaLifeType(fish);
  const secondaryCategory = getSecondaryCategory(fish);
  if (lifeType !== 'saltwaterFish' || secondaryCategory !== '虾虎/青蛙鱼') {
    fail({
      rule: '五彩青蛙必须归为海水鱼/虾虎青蛙鱼，不得归为两栖',
      speciesId: fish.id,
      name: fish.name,
      details: `lifeType=${lifeType}, secondaryCategory=${secondaryCategory}`,
    });
  }
}

const turtleItems = fishData.filter(fish => /龟|turtle|Sternotherus|Trachemys|Mauremys|Carettochelys|Staurotypus/i.test(`${fish.name} ${fish.scientificName}`));
for (const fish of turtleItems) {
  const lifeType = getEncyclopediaLifeType(fish);
  const secondaryCategory = getSecondaryCategory(fish);
  if (lifeType !== 'reptile' || secondaryCategory !== '龟类') {
    fail({
      rule: '龟类必须归为龟/两栖下的龟类',
      speciesId: fish.id,
      name: fish.name,
      details: `lifeType=${lifeType}, secondaryCategory=${secondaryCategory}`,
    });
  }
}

const knownOverrides = [
  { id: 'sp_0141', water: '淡水', ornamental: true, tool: false },
  { id: 'sp_0186', water: '海水', ornamental: true, tool: false },
  { id: 'sp_0460', water: '淡水', ornamental: false, tool: false },
];
for (const expected of knownOverrides) {
  const fish = fishData.find(item => item.id === expected.id);
  if (!fish) {
    fail({ rule: '人工分类覆盖物种必须存在', speciesId: expected.id });
    continue;
  }
  const tags = getSpeciesFilterTags(fish);
  if (!tags.environmentTags.includes(expected.water)) {
    fail({ rule: '人工分类覆盖的水体标签必须正确', speciesId: fish.id, name: fish.name, details: tags.environmentTags.join(',') });
  }
  if (tags.functionTags.includes('观赏鱼') !== expected.ornamental) {
    fail({ rule: '人工分类覆盖的观赏鱼标签必须正确', speciesId: fish.id, name: fish.name, details: tags.functionTags.join(',') });
  }
  if ((getToolFunctions(fish).length > 0) !== expected.tool) {
    fail({ rule: '人工分类覆盖的工具属性必须正确', speciesId: fish.id, name: fish.name, details: getToolFunctions(fish).join(',') });
  }
}

for (const fish of fishData) {
  const tags = getSpeciesFilterTags(fish);
  if (tags.functionTags.includes('观赏鱼') && getLifeType(fish) !== 'fish') {
    fail({ rule: '观赏鱼标签只能分配给鱼类', speciesId: fish.id, name: fish.name, details: `lifeType=${getLifeType(fish)}` });
  }
  if (tags.environmentTags.includes('淡水') && !isSpeciesCompatibleWithWaterType(fish, 'Freshwater')) {
    fail({ rule: '淡水标签不能分配给海水对象', speciesId: fish.id, name: fish.name });
  }
  if (tags.environmentTags.includes('海水') && !isSpeciesCompatibleWithWaterType(fish, 'Saltwater')) {
    fail({ rule: '海水标签不能分配给淡水对象', speciesId: fish.id, name: fish.name });
  }
  if (tags.functionTags.includes('工具生物') && !['fish', 'invertebrate'].includes(getLifeType(fish))) {
    fail({ rule: '工具生物只能来自鱼类或无脊椎动物', speciesId: fish.id, name: fish.name, details: `lifeType=${getLifeType(fish)}` });
  }
}

const freshwaterOrnamentalCount = fishData.filter(fish => {
  const tags = getSpeciesFilterTags(fish);
  return tags.functionTags.includes('观赏鱼') && tags.environmentTags.includes('淡水');
}).length;
if (freshwaterOrnamentalCount === 0) {
  fail({ rule: '观赏鱼 + 淡水组合筛选必须有结果' });
}

if (failures.length > 0) {
  console.error(`Taxonomy assertions failed: ${failures.length}`);
  console.error(JSON.stringify(failures.slice(0, 50), null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  totalSpecies: fishData.length,
  displayableSpecies: displayableIds.size,
  checkedRules: [
    '水草/硬景不进图鉴',
    '图鉴物种必须有二级分类',
    '五彩青蛙归海水鱼/虾虎青蛙鱼',
    '龟类归龟/两栖/龟类',
    '人工覆盖物种标签正确',
    '观赏鱼和水体标签边界正确',
    '工具生物边界和组合筛选有效',
  ],
}, null, 2));
