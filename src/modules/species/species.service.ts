import { fishData } from '../../data/fishData';
import { isAquaticPlantSpecies, isHardscapeSpecies } from '../../lib/speciesClassification';
import { loggerService } from '../../services/logger/logger.service';
import { Fish } from '../../types';
import { speciesDetailInputSchema, speciesListInputSchema, SpeciesDetailOutput, SpeciesListOutput } from './species.schema';

const secondaryCategoryOrder: Record<string, string[]> = {
  fish: ['灯科鱼', '慈鲷科', '鲤科鱼', '迷鳃鱼', '鳉鱼科', '鲶鱼/异型', '鲀科', '海水鱼'],
  invertebrate: ['虾类', '螺类', '虾螺蟹'],
  reptile: ['龟类', '两栖/爬宠'],
  plant: ['水草'],
  hardscape: ['硬景/底床'],
  coral: ['珊瑚/海水无脊椎'],
};

const hiddenSecondaryCategories: Record<string, string[]> = {
  fish: ['鱼类'],
  invertebrate: ['虾螺蟹'],
  plant: ['水草'],
  hardscape: ['硬景/底床'],
  coral: ['珊瑚/海水无脊椎'],
};

export const getLifeType = (fish: Fish) => {
  const text = `${fish.name} ${fish.scientificName} ${fish.category}`;

  if (fish.category === '水草') return isHardscapeSpecies(fish) ? 'hardscape' : 'plant';
  if (fish.category === '硬景/底床') return 'hardscape';
  if (isAquaticPlantSpecies(fish)) return 'plant';
  if (isHardscapeSpecies(fish)) return 'hardscape';
  if (fish.category === '珊瑚/海水无脊椎' || /珊瑚|海葵|coral|anemone/i.test(text)) return 'coral';
  if (fish.category === '虾螺蟹' || fish.category === '虾类' || fish.category === '螺类' || /虾|螺|蟹|shrimp|snail|crab/i.test(text)) return 'invertebrate';
  if (fish.category === '龟类' || fish.category === '两栖/爬宠' || /龟|蛙|蝾螈|六角恐龙|axolotl|turtle|frog|newt/i.test(text)) return 'reptile';
  return 'fish';
};

export const isSaltwaterSpecies = (fish: Fish) => {
  const lifeType = getLifeType(fish);
  return fish.category === '海水鱼' || lifeType === 'coral' || /海水/.test(fish.name);
};

export const matchesWaterTypeFilter = (fish: Fish, waterTypeFilter: string) => {
  if (waterTypeFilter === 'Freshwater') return !isSaltwaterSpecies(fish);
  if (waterTypeFilter === 'Saltwater') return isSaltwaterSpecies(fish);
  if (waterTypeFilter === 'Coldwater') {
    const tempMatch = fish.waterTemperature?.match(/(\d+)-/);
    if (tempMatch) return parseInt(tempMatch[1]) <= 18;
    return false;
  }
  return true;
};

export const getToolFunctions = (fish: Fish) => {
  const text = `${fish.name} ${fish.scientificName} ${fish.category} ${fish.description} ${fish.diet} ${fish.feedingProfile?.recommendedFoods || ''} ${fish.feedingProfile?.specialNotes || ''}`;
  const tags: string[] = [];

  if (/除藻|藻膜|褐藻|黑毛藻|飞狐|小精灵|胡子|异型|Otocinclus|Ancistrus|Crossocheilus|Amano|大和藻虾|角螺|鲍螺|海藻/i.test(text)) {
    tags.push('除藻');
  }
  if (/残饵|清理|底层|沉底|鼠鱼|Corydoras|虾|螺|蟹/i.test(text)) {
    tags.push('清残饵');
  }
  if (/控螺|杀手螺|食螺|Anentome|泛滥的杂螺/i.test(text)) {
    tags.push('控螺');
  }
  if (/翻砂|底砂|沙地|海参|钻沙|砂/i.test(text)) {
    tags.push('翻砂');
  }
  if (getLifeType(fish) === 'plant' || getLifeType(fish) === 'hardscape' || /水草|莫斯|榕|蕨|椒草|沉木|石|造景|根肥|液肥/i.test(text)) {
    tags.push('造景维护');
  }

  return Array.from(new Set(tags));
};

export const getDisplayableSpecies = () => fishData.filter((fish) => !['plant', 'hardscape'].includes(getLifeType(fish)));

export const getSecondaryCategories = (fishes: Fish[], lifeTypeFilter: string) => {
  if (lifeTypeFilter === 'All') return [];
  const order = secondaryCategoryOrder[lifeTypeFilter] || [];
  const hidden = hiddenSecondaryCategories[lifeTypeFilter] || [];
  const cats = Array.from(
    new Set(
      fishes
        .filter((fish) => getLifeType(fish) === lifeTypeFilter)
        .map((fish) => fish.category)
        .filter((category) => !hidden.includes(category))
        .filter(Boolean),
    ),
  );

  return cats.sort((a, b) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);
    if (aIndex !== -1 || bIndex !== -1) {
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    }
    return a.localeCompare(b, 'zh-Hans-CN');
  });
};

export const getLifeTypeCounts = (fishes: Fish[], lifeTypeIds: string[]) => lifeTypeIds.reduce<Record<string, number>>((acc, item) => {
  acc[item] = fishes.filter((fish) => getLifeType(fish) === item).length;
  return acc;
}, {});

export const speciesService = {
  list: (input: unknown): SpeciesListOutput => {
    const parsed = speciesListInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({
        module: 'species',
        action: 'list',
        message: 'Species list input failed schema validation',
        details: parsed.error.flatten(),
      });
      return { items: [], total: 0 };
    }

    const { searchTerm, lifeType, category, includeScenery, limit } = parsed.data;
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const source = includeScenery ? fishData : getDisplayableSpecies();
    const items = source
      .filter((fish) => lifeType === 'All' || getLifeType(fish) === lifeType)
      .filter((fish) => category === '全部' || fish.category === category)
      .filter((fish) => {
        if (!normalizedSearch) return true;
        return fish.name.toLowerCase().includes(normalizedSearch) || fish.scientificName.toLowerCase().includes(normalizedSearch);
      })
      .slice(0, limit);

    loggerService.info({ module: 'species', action: 'list', message: 'Species list generated', details: { total: items.length } });
    return { items, total: items.length };
  },

  detail: (input: unknown): SpeciesDetailOutput => {
    const parsed = speciesDetailInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({
        module: 'species',
        action: 'detail',
        message: 'Species detail input failed schema validation',
        details: parsed.error.flatten(),
      });
      return { item: null };
    }

    const item = fishData.find((fish) => fish.id === parsed.data.speciesId) || null;
    loggerService.info({ module: 'species', action: 'detail', message: 'Species detail read', details: { speciesId: parsed.data.speciesId } });
    return { item };
  },
};
