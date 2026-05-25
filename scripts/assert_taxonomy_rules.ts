import { fishData } from '../src/data/fishData';
import {
  getDisplayableSpecies,
  getEncyclopediaLifeType,
  getLifeType,
  getSecondaryCategory,
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
  ],
}, null, 2));

