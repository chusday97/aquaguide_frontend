import { fishData } from '../../data/fishData';
import { isAquaticPlantSpecies, isHardscapeSpecies } from '../../lib/speciesClassification';
import { loggerService } from '../../services/logger/logger.service';
import { Fish } from '../../types';
import { speciesDetailInputSchema, speciesListInputSchema, SpeciesDetailOutput, SpeciesListOutput } from './species.schema';

const secondaryCategoryOrder: Record<string, string[]> = {
  freshwaterFish: [
    '灯科鱼',
    '白云金丝',
    '斑马鱼',
    '孔雀/月光/玛丽/剑尾',
    '鳉鱼',
    '斗鱼',
    '曼龙/马甲',
    '神仙鱼',
    '七彩神仙',
    '短鲷',
    '慈鲷',
    '鼠鱼',
    '异型鱼',
    '清道夫/青苔鼠',
    '鳅类/吸鳅',
    '金鱼',
    '锦鲤',
    '雷龙鱼',
    '龙鱼/古代鱼',
    '美人鱼',
    '淡水特色鱼',
  ],
  saltwaterFish: ['小丑鱼', '倒吊鱼', '雀鲷', '海水神仙/蝶鱼', '虾虎/青蛙鱼', '狮子鱼/炮弹鱼', '海水特色鱼'],
  fish: [
    '灯科鱼',
    '白云金丝',
    '斑马鱼',
    '孔雀/月光/玛丽/剑尾',
    '鳉鱼',
    '斗鱼',
    '曼龙/马甲',
    '神仙鱼',
    '七彩神仙',
    '短鲷',
    '慈鲷',
    '鼠鱼',
    '异型鱼',
    '清道夫/青苔鼠',
    '鳅类/吸鳅',
    '金鱼',
    '锦鲤',
    '雷龙鱼',
    '龙鱼/古代鱼',
    '美人鱼',
    '特色观赏鱼',
  ],
  invertebrate: ['除藻生物', '清残饵生物', '翻砂生物', '控螺生物', '观赏虾', '观赏螺', '观赏蟹', '海水清洁生物'],
  reptile: ['六角恐龙/蝾螈', '蛙类', '龟类'],
  coral: ['海葵', '软体珊瑚', 'LPS硬骨珊瑚', 'SPS硬骨珊瑚', '纽扣/菇类珊瑚', '水母', '海水滤食生物'],
  plant: [],
  hardscape: [],
};

const isMarineFishText = (text: string) => (
  /小丑|倒吊|蓝魔鬼|雀鲷|蝶鱼|炮弹|狮子鱼|红利|泗水玫瑰|五彩青蛙|虾虎|Pseudochromis|Amphiprion|Zebrasoma|Paracanthurus|Chaetodon|Chrysiptera|Pterois|Lutjanus|Pterapogon|Xanthichthys|Centropyge|Pomacanthus|Synchiropus|Gobiodon/i.test(text)
);

const parseTemperatureRange = (temperature?: string) => {
  const matches = temperature?.match(/(\d+(?:\.\d+)?)/g);
  if (!matches || matches.length === 0) return null;
  const values = matches.map(Number).filter(Number.isFinite);
  if (values.length === 0) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
};

export const getTemperatureBand = (fish: Fish) => {
  const range = parseTemperatureRange(fish.waterTemperature);
  if (!range) return '广温';
  if (range.max <= 24 && range.min <= 20) return '冷水';
  if (range.min >= 22) return '热带';
  return '广温';
};

export const getSizeLabel = (fish: Fish) => {
  if (fish.size === 'Large') return '大型';
  if (fish.size === 'Medium') return '中型';
  return '小型';
};

export const getTemperamentLabel = (fish: Fish) => {
  if (fish.temperament === 'Aggressive') return '凶猛';
  if (fish.temperament === 'Territorial') return '领地';
  return '温和';
};

export const getDifficultyLabel = (fish: Fish) => {
  if (fish.difficulty === 'Hard') return '困难';
  if (fish.difficulty === 'Medium') return '中等';
  return '极易';
};

export const getLifeType = (fish: Fish) => {
  const text = `${fish.name} ${fish.scientificName} ${fish.category}`;

  if (fish.category === '水草' && isHardscapeSpecies(fish)) return 'hardscape';
  if (fish.category === '水草' && isAquaticPlantSpecies(fish)) return 'plant';
  if (isAquaticPlantSpecies(fish)) return 'plant';
  if (isHardscapeSpecies(fish)) return 'hardscape';
  if (/水母|海月|海刺水母|Cassiopea|Aurelia|Chrysaora|Phyllorhiza|Cotylorhiza|Sanderia/i.test(text)) return 'coral';
  if (fish.category === '珊瑚/海水无脊椎' || /珊瑚|海葵|coral|anemone|管虫|海绵|海星|海参|sponge|starfish|Sabellastarte|Protula|Haliclona|Astropecten/i.test(text)) return 'coral';
  if (fish.category === '虾螺蟹' || fish.category === '虾类' || fish.category === '螺类' || /虾|螺|蟹|shrimp|snail|crab|Lysmata|Thor|Paguristes|Pomacea|Neritina|Clithon|Anentome|Caridina|Neocaridina|Geosesarma/i.test(text)) return 'invertebrate';
  if (fish.category === '海水鱼' || isMarineFishText(text)) return 'fish';
  if (fish.category === '龟类' || fish.category === '两栖/爬宠' || /龟|蛙|蝾螈|六角恐龙|axolotl|turtle|frog|newt/i.test(text)) return 'reptile';
  return 'fish';
};

export const getSecondaryCategory = (fish: Fish) => {
  const text = `${fish.name} ${fish.scientificName} ${fish.description}`;
  const lifeType = getLifeType(fish);

  if (lifeType === 'fish') {
    if (isSaltwaterSpecies(fish)) {
      if (/小丑|Amphiprion/i.test(text)) return '小丑鱼';
      if (/倒吊|Zebrasoma|Paracanthurus/i.test(text)) return '倒吊鱼';
      if (/雀鲷|蓝魔鬼|Chrysiptera/i.test(text)) return '雀鲷';
      if (/神仙|蝶|Centropyge|Pomacanthus|Chaetodon/i.test(text)) return '海水神仙/蝶鱼';
      if (/青蛙|虾虎|Synchiropus|Gobiodon/i.test(text)) return '虾虎/青蛙鱼';
      if (/狮子鱼|炮弹|Pterois|Xanthichthys/i.test(text)) return '狮子鱼/炮弹鱼';
      return '海水特色鱼';
    }
    if (/红绿灯|宝莲灯|红鼻|剪刀|黑裙|红裙|樱桃灯|柠檬灯|红莲灯|琥珀灯|蓝眼灯|血心灯|帝王灯|红眼灯|金灯|黄金灯|霓虹灯|红十字灯|玻璃灯|刚果美人|Hyphessobrycon|Paracheirodon|Hemigrammus|Gymnocorymbus|Moenkhausia|Nematobrycon|Phenacogrammus|Boehlkea|Prionobrama|Aphyocharax/i.test(text)) return '灯科鱼';
    if (/白云金丝|唐鱼|Tanichthys/i.test(text)) return '白云金丝';
    if (/斑马鱼|Danio/i.test(text)) return '斑马鱼';
    if (/孔雀|月光鱼|玛丽|剑尾|红剑|皮球|Poecilia|Xiphophorus/i.test(text)) return '孔雀/月光/玛丽/剑尾';
    if (/鳉|Epiplatys|Sawbwa|Dario|Badis|Poropanchax/i.test(text)) return '鳉鱼';
    if (/斗鱼|Betta/i.test(text)) return '斗鱼';
    if (/曼龙|马甲|战舰|天堂鱼|接吻鱼|Trichopodus|Sphaerichthys|Macropodus|Osphronemus|Helostoma/i.test(text)) return '曼龙/马甲';
    if (/七彩神仙|Symphysodon/i.test(text)) return '七彩神仙';
    if (/神仙|Pterophyllum/i.test(text)) return '神仙鱼';
    if (/短鲷|波子|荷兰凤凰|阿卡西|Apistogramma|Mikrogeophagus/i.test(text)) return '短鲷';
    if (/慈鲷|鹦鹉鱼|蓝王子|地图鱼|菠萝鱼|火口|地魔|关刀|凤凰|Hemichromis|Andinoacara|Chindongo|Cichlasoma|Amatitlania|Heros|Astronotus|Thorichthys|Pelvicachromis|Geophagus|Labidochromis|Maylandia|Sciaenochromis|Nimbochromis|Neolamprologus|Altolamprologus/i.test(text)) return '慈鲷';
    if (/鼠鱼|咖啡鼠|熊猫鼠|月光鼠|精灵鼠|Corydoras/i.test(text)) return '鼠鱼';
    if (/异型|胡子|L\\d+|Otocinclus|Ancistrus|Panaque|Peckoltia|Hypancistrus|Pterygoplichthys|Leporacanthicus|Scobinancistrus|Parancistrus/i.test(text)) return '异型鱼';
    if (/清道夫|青苔鼠|金苔鼠|Gyrinocheilus|Hypostomus/i.test(text)) return '清道夫/青苔鼠';
    if (/鳅|蛇鱼|Pangio|Botia|Cobitis|Sewellia|Beaufortia|Pseudogastromyzon|Mastacembelus|Chromobotia/i.test(text)) return '鳅类/吸鳅';
    if (/金鱼|龙睛|兰寿|泰狮|蝶尾|狮头|虎头|Carassius auratus/i.test(text)) return '金鱼';
    if (/锦鲤|蝴蝶鲤|Cyprinus carpio/i.test(text)) return '锦鲤';
    if (/雷龙|Channa/i.test(text)) return '雷龙鱼';
    if (/龙鱼|恐龙鱼|古代蝴蝶鱼|电鳗|魟|Scleropages|Osteoglossum|Polypterus|Erpetoichthys|Pantodon|Gymnotus|Potamotrygon/i.test(text)) return '龙鱼/古代鱼';
    if (/美人|彩虹|燕子|Melanotaenia|Glossolepis|Iriatherina|Pseudomugil/i.test(text)) return '美人鱼';
    return '淡水特色鱼';
  }

  if (lifeType === 'invertebrate') {
    if (/海水|清洁虾|医生虾|性感虾|薄荷虾|寄居蟹|Lysmata|Thor|Paguristes/i.test(text)) return '海水清洁生物';
    if (/杀手螺|控螺|Anentome/i.test(text)) return '控螺生物';
    if (/翻砂|海星|海参|Astropecten/i.test(text)) return '翻砂生物';
    if (/除藻|藻虾|大和|角螺|斑马螺|洋葱螺|鲍螺|Neritina|Clithon|Vittina|Caridina multidentata/i.test(text)) return '除藻生物';
    if (/残饵|米虾|水晶虾|黑壳虾|Neocaridina|Caridina|虾/i.test(text)) return '清残饵生物';
    if (/蟹|crab|Geosesarma/i.test(text)) return '观赏蟹';
    if (/螺|snail|Pomacea|Tylomelania|Neritina|Clithon|Vittina/i.test(text)) return '观赏螺';
    return '观赏虾';
  }

  if (lifeType === 'reptile') {
    if (/六角恐龙|蝾螈|axolotl|newt|Ambystoma|Cynops/i.test(text)) return '六角恐龙/蝾螈';
    if (/蛙|frog|Ceratophrys/i.test(text)) return '蛙类';
    return '龟类';
  }

  if (lifeType === 'coral') {
    if (/水母|Aurelia|Chrysaora|Phyllorhiza|Cassiopea|Cotylorhiza|Sanderia/i.test(text)) return '水母';
    if (/海葵|anemone|Entacmaea|Stichodactyla|Heteractis/i.test(text)) return '海葵';
    if (/纽扣|菇|Zoanthus|Palythoa|Actinodiscus/i.test(text)) return '纽扣/菇类珊瑚';
    if (/鹿角|SPS|Acropora/i.test(text)) return 'SPS硬骨珊瑚';
    if (/气泡|火炬|蛙卵|尼罗河|八字脑|糖果脑|炮仗花|太阳花|LPS|Plerogyra|Euphyllia|Catalaphyllia|Trachyphyllia|Micromussa|Tubastraea/i.test(text)) return 'LPS硬骨珊瑚';
    if (/皮革|草皮|丁香|千手|Sarcophyton|Pachyclavularia|Clavularia|Xenia/i.test(text)) return '软体珊瑚';
    return '海水滤食生物';
  }

  if (lifeType === 'plant') {
    if (/矮珍珠|趴地珍珠|牛毛毡|挖耳草|Glossostigma|Hemianthus|Eleocharis|Utricularia|Sagittaria/i.test(text)) return '前景草';
    if (/莫斯|鹿角苔|凤尾藓|Fissidens|Vesicularia|Riccia/i.test(text)) return '莫斯/苔藓';
    if (/水榕|辣椒榕|铁皇冠|黑木蕨|Anubias|Bucephalandra|Microsorum|Bolbitis/i.test(text)) return '阴性附生草';
    if (/椒草|Cryptocoryne/i.test(text)) return '椒草';
    if (/宫廷|红丁香|小对叶|水罗兰|红雨伞|红蝴蝶|蜈蚣草|Rotala|Ludwigia|Bacopa|Hygrophila|Proserpinaca|Egeria|Myriophyllum/i.test(text)) return '有茎草';
    if (/皇冠|水兰|睡莲|红荷根|大浪草|Echinodorus|Vallisneria|Nymphaea|Aponogeton/i.test(text)) return '中后景莲座草';
    if (/浮萍|圆心萍|红根浮萍|Lemna|Limnobium|Phyllanthus/i.test(text)) return '浮草';
    return '其他水草';
  }

  return '';
};

export const isSaltwaterSpecies = (fish: Fish) => {
  const lifeType = getLifeType(fish);
  const text = `${fish.name} ${fish.scientificName} ${fish.category} ${fish.description}`;
  return fish.category === '海水鱼' || lifeType === 'coral' || /海水/.test(fish.name) || (lifeType === 'fish' && isMarineFishText(text));
};

export const getCareTaxonomyPath = (fish: Fish) => ({
  waterType: isSaltwaterSpecies(fish) ? '海水' : '淡水',
  temperatureBand: getTemperatureBand(fish),
  size: getSizeLabel(fish),
  temperament: getTemperamentLabel(fish),
  difficulty: getDifficultyLabel(fish),
  variety: getSecondaryCategory(fish),
});

export const getEncyclopediaLifeType = (fish: Fish) => {
  const lifeType = getLifeType(fish);
  if (lifeType === 'fish') return isSaltwaterSpecies(fish) ? 'saltwaterFish' : 'freshwaterFish';
  return lifeType;
};

export const matchesWaterTypeFilter = (fish: Fish, waterTypeFilter: string) => {
  if (waterTypeFilter === 'Freshwater') return !isSaltwaterSpecies(fish);
  if (waterTypeFilter === 'Saltwater') return isSaltwaterSpecies(fish);
  if (waterTypeFilter === 'Coldwater') {
    return getTemperatureBand(fish) === '冷水';
  }
  if (waterTypeFilter === 'Tropical') return getTemperatureBand(fish) === '热带';
  if (waterTypeFilter === 'BroadRange') return getTemperatureBand(fish) === '广温';
  return true;
};

export const matchesSizeFilter = (fish: Fish, sizeFilter: string) => (
  sizeFilter === 'All' || fish.size === sizeFilter
);

export const matchesTemperamentFilter = (fish: Fish, temperamentFilter: string) => (
  temperamentFilter === 'All' || fish.temperament === temperamentFilter
);

export const getToolFunctions = (fish: Fish) => {
  const text = `${fish.name} ${fish.scientificName} ${fish.category} ${fish.description} ${fish.diet} ${fish.feedingProfile?.recommendedFoods || ''} ${fish.feedingProfile?.specialNotes || ''}`;
  if (getLifeType(fish) === 'coral') return [];
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

export const getDisplayableSpecies = () => fishData.filter((fish) => getLifeType(fish) !== 'hardscape');

export const getSecondaryCategories = (fishes: Fish[], lifeTypeFilter: string) => {
  if (lifeTypeFilter === 'All') return [];
  const order = secondaryCategoryOrder[lifeTypeFilter] || [];
  const cats = Array.from(
    new Set(
      fishes
        .filter((fish) => getEncyclopediaLifeType(fish) === lifeTypeFilter)
        .map((fish) => getSecondaryCategory(fish))
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
  acc[item] = fishes.filter((fish) => getEncyclopediaLifeType(fish) === item).length;
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
      .filter((fish) => lifeType === 'All' || getLifeType(fish) === lifeType || getEncyclopediaLifeType(fish) === lifeType)
      .filter((fish) => category === '全部' || getSecondaryCategory(fish) === category)
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
