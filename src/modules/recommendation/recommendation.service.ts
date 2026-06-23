import { loggerService } from '../../services/logger/logger.service';
import type { Aquarium, Fish } from '../../types';
import { getLifeType, getToolFunctions } from '../species/species.service';
import {
  AquariumProfile,
  CandidateStatus,
  discoveryAdvanceInputSchema,
  discoveryDeckInputSchema,
  DiscoveryAdvanceOutput,
  DiscoveryDeckState,
  DiscoveryDeckOutput,
  EmptyTankPlan,
  recommendationInputSchema,
  RecommendationCandidate,
  RecommendationMode,
  RecommendationOutput,
  SimulationResult,
  SmartRecommendationOutput,
  UserPreference,
} from './recommendation.schema';
import { evaluateSpeciesForAquarium } from '../../lib/speciesFitEngine';
import { evaluateTankCompatibility } from '../../lib/tankCompatibilityEngine';
import { RECOMMENDATION_LIMITS, TANK_CAPACITY_MULTIPLIER, TANK_LOAD_THRESHOLDS } from './recommendation.config';

export const DISCOVERY_DAILY_LIMIT = 10;
export const DISCOVERY_HISTORY_DAYS = 7;
export const DISCOVERY_STORAGE_KEY = 'aquapediaDiscoveryDeck';

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dayNumber = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.floor(new Date(year, month - 1, day).getTime() / 86400000);
};

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededRandom = (seed: number) => {
  let value = seed || 1;
  return () => {
    value |= 0;
    value = value + 0x6D2B79F5 | 0;
    let t = Math.imul(value ^ value >>> 15, 1 | value);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

const shuffleWithSeed = <T,>(items: T[], seed: string) => {
  const random = seededRandom(hashString(seed));
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const parseRange = (str: string, fallback: [number, number]) => {
  const match = str.match(/([\d.]+)-([\d.]+)/);
  if (match) return [parseFloat(match[1]), parseFloat(match[2])] as [number, number];
  const single = parseFloat(str);
  if (!Number.isNaN(single)) return [single, single] as [number, number];
  return fallback;
};

const rangesOverlap = (a: [number, number], b: [number, number]) => Math.max(a[0], b[0]) <= Math.min(a[1], b[1]);

const getTankVolumeLiters = (aquarium: Aquarium) => {
  const length = parseFloat(aquarium.dimensions?.length || '60');
  const width = parseFloat(aquarium.dimensions?.width || '40');
  const height = parseFloat(aquarium.dimensions?.height || '40');
  if ([length, width, height].some(value => Number.isNaN(value) || value <= 0)) return 0;
  return Math.round((length * width * height) / 1000 * 0.85);
};

const getBioLoadLiters = (fish: Fish) => {
  const lifeType = getLifeType(fish);
  if (lifeType === 'plant' || lifeType === 'hardscape') return 0;
  if (lifeType === 'invertebrate') {
    if (/螺|snail|Neritina|Pomacea|Clithon|Anentome/i.test(`${fish.name} ${fish.scientificName}`)) return 1.5;
    return 0.5;
  }
  if (lifeType === 'coral') return 8;
  if (lifeType === 'reptile') return 60;

  const base = fish.size === 'Large' ? 35 : fish.size === 'Medium' ? 9 : 2.5;
  const temperamentMultiplier = fish.temperament === 'Aggressive' || fish.temperament === 'Territorial' ? 1.35 : 1;
  return base * temperamentMultiplier;
};

const isRecommendableSpecies = (fish: Fish) => {
  const lifeType = getLifeType(fish);
  return !['plant', 'hardscape', 'reptile'].includes(lifeType) && fish.housingMode !== '建议单养';
};

const getRecommendationReason = (candidate: Fish, aquarium: Aquarium, speciesPool: Fish[]) => {
  const currentFishes = aquarium.fishes.map(af => speciesPool.find(f => f.id === af.fishId)).filter(Boolean) as Fish[];
  const reasons: string[] = [];
  const toolFunctions = getToolFunctions(candidate);

  if (toolFunctions.length > 0) reasons.push(`功能: ${toolFunctions.slice(0, 2).join('/')}`);

  if (currentFishes.length === 0) {
    if (candidate.difficulty === 'Easy') reasons.push('新手友好');
    if (candidate.housingMode === '适合混养') reasons.push('后续好搭配');
    return reasons.slice(0, 3).join(' · ') || '适合作为空缸起步生物';
  }

  const candidateTemp = parseRange(candidate.waterTemperature, [0, 40]);
  const candidatePh = parseRange(candidate.phLevel, [0, 14]);
  const tempOk = currentFishes.every(fish => rangesOverlap(parseRange(fish.waterTemperature, [0, 40]), candidateTemp));
  const phOk = currentFishes.every(fish => rangesOverlap(parseRange(fish.phLevel, [0, 14]), candidatePh));
  const currentHasLarge = currentFishes.some(fish => fish.size === 'Large');
  const currentHasAggressive = currentFishes.some(fish => fish.temperament === 'Aggressive' || fish.temperament === 'Territorial');

  if (tempOk) reasons.push('水温匹配');
  if (phOk) reasons.push('pH匹配');
  if (candidate.housingMode === '适合混养') reasons.push('适合混养');
  if (!currentHasLarge && !currentHasAggressive && candidate.size !== 'Large') reasons.push('体型风险低');

  return reasons.slice(0, 3).join(' · ') || '与当前鱼缸参数兼容';
};

const isLivestockSpecies = (fish: Fish) => {
  const lifeType = getLifeType(fish);
  return !['plant', 'hardscape'].includes(lifeType);
};

const getWaterLayer = (fish: Fish) => {
  const text = `${fish.category} ${fish.role || ''} ${fish.habitat || ''} ${fish.description || ''}`;
  if (/底层|底栖|鼠|鳅|清残|底砂/.test(text)) return 'bottom';
  if (/上层|鳉|孔雀|玛丽|浮水/.test(text)) return 'top';
  if (/水草|草/.test(text)) return 'plant';
  if (/珊瑚|海葵/.test(text)) return 'reef';
  return 'middle';
};

const getMinimumGroupQuantity = (fish: Fish) => {
  const text = `${fish.name} ${fish.category} ${fish.housingMode} ${fish.description}`;
  if (/灯|群游|斑马|红鼻|宝莲|红绿|鼠/.test(text)) return 6;
  if (/虾/.test(text)) return 5;
  if (/螺|斗鱼|短鲷|鳌虾/.test(text)) return 1;
  return fish.housingMode === '建议群养' ? 6 : 1;
};

const getRecommendedQuantity = (fish: Fish, remainingCapacity: number) => {
  const minGroup = getMinimumGroupQuantity(fish);
  const singleLoad = Math.max(0.4, getBioLoadLiters(fish));
  const byCapacity = Math.max(1, Math.floor(remainingCapacity / singleLoad));
  return Math.max(1, Math.min(minGroup, byCapacity));
};

const getLoadStatus = (loadRate: number) => {
  if (loadRate >= TANK_LOAD_THRESHOLDS.nearLimit) return 'over_limit' as const;
  if (loadRate >= TANK_LOAD_THRESHOLDS.moderate) return 'near_limit' as const;
  if (loadRate >= TANK_LOAD_THRESHOLDS.relaxed) return 'moderate' as const;
  return 'relaxed' as const;
};

const getFilterCapacityMultiplier = (filter?: string) => {
  if (!filter || filter === '无') return TANK_CAPACITY_MULTIPLIER.filter.none;
  if (/海绵/.test(filter)) return TANK_CAPACITY_MULTIPLIER.filter.sponge;
  if (/瀑布/.test(filter)) return TANK_CAPACITY_MULTIPLIER.filter.waterfall;
  if (/桶/.test(filter)) return TANK_CAPACITY_MULTIPLIER.filter.canister;
  if (/上滤/.test(filter)) return TANK_CAPACITY_MULTIPLIER.filter.top;
  return TANK_CAPACITY_MULTIPLIER.filter.default;
};

const getWaterChangeMultiplier = (aquarium: Aquarium) => {
  const history = aquarium.waterChangeHistory || [];
  if (history.length === 0) return TANK_CAPACITY_MULTIPLIER.waterChange.unknown;
  const latest = history[history.length - 1];
  const days = Math.max(0, Math.floor((Date.now() - new Date(latest).getTime()) / 86400000));
  if (days > 14) return TANK_CAPACITY_MULTIPLIER.waterChange.overdue;
  if (days <= 7) return TANK_CAPACITY_MULTIPLIER.waterChange.weekly;
  return 1;
};

const calculateTankCapacity = (aquarium: Aquarium, volumeLiters: number) => {
  const filterMultiplier = getFilterCapacityMultiplier(aquarium.equipment?.filter);
  const changeMultiplier = getWaterChangeMultiplier(aquarium);
  const oxygenMultiplier = aquarium.equipment?.oxygen ? TANK_CAPACITY_MULTIPLIER.oxygen.enabled : TANK_CAPACITY_MULTIPLIER.oxygen.disabled;
  const hardscapeCount = (aquarium.hardscape || []).length + (aquarium.plants || []).length;
  const hardscapeMultiplier = hardscapeCount >= 6
    ? TANK_CAPACITY_MULTIPLIER.hardscapeOccupancy.dense
    : hardscapeCount >= 3
      ? TANK_CAPACITY_MULTIPLIER.hardscapeOccupancy.light
      : 1;
  return Math.max(1, Math.round(volumeLiters * filterMultiplier * changeMultiplier * oxygenMultiplier * hardscapeMultiplier));
};

const buildAquariumProfile = (
  aquarium: Aquarium,
  speciesPool: Fish[],
  mode: RecommendationMode,
): AquariumProfile => {
  const volumeLiters = getTankVolumeLiters(aquarium);
  const lengthCm = parseFloat(aquarium.dimensions?.length || '0') || 0;
  const widthCm = parseFloat(aquarium.dimensions?.width || '0') || 0;
  const heightCm = parseFloat(aquarium.dimensions?.height || '0') || 0;
  const livestock = aquarium.fishes
    .map(item => {
      const fish = speciesPool.find(species => species.id === item.fishId);
      if (!fish || !isLivestockSpecies(fish)) return null;
      return {
        speciesId: fish.id,
        name: fish.name,
        quantity: Math.max(1, item.quantity || 1),
        category: fish.category,
        size: fish.size,
        temperament: fish.temperament,
      };
    })
    .filter(Boolean) as AquariumProfile['livestock'];

  const currentLoad = aquarium.fishes.reduce((sum, item) => {
    const fish = speciesPool.find(species => species.id === item.fishId);
    if (!fish) return sum;
    return sum + getBioLoadLiters(fish) * Math.max(1, item.quantity || 1);
  }, 0);
  const capacity = calculateTankCapacity(aquarium, volumeLiters);
  const loadRate = Math.round((currentLoad / capacity) * 100);
  const waterLayers = aquarium.fishes.reduce<Record<string, number>>((acc, item) => {
    const fish = speciesPool.find(species => species.id === item.fishId);
    if (!fish) return acc;
    const layer = getWaterLayer(fish);
    acc[layer] = (acc[layer] || 0) + Math.max(1, item.quantity || 1);
    return acc;
  }, {});
  const missingData = [
    !volumeLiters && '鱼缸容量',
    !lengthCm && '鱼缸长度',
    !aquarium.waterType && '水体类型',
    !aquarium.targetTemperature && '目标温度',
    !aquarium.equipment?.filter && '过滤设备',
    typeof aquarium.equipment?.heater !== 'boolean' && '加热配置',
  ].filter(Boolean) as string[];
  const availableNiches = ['top', 'middle', 'bottom'].filter(layer => (waterLayers[layer] || 0) <= 2);

  return {
    id: aquarium.id,
    name: aquarium.name,
    mode,
    volumeLiters,
    effectiveVolumeLiters: capacity,
    lengthCm,
    widthCm,
    heightCm,
    waterType: aquarium.waterType || 'Freshwater',
    temperature: aquarium.targetTemperature ? Number(aquarium.targetTemperature) : null,
    equipment: [
      aquarium.equipment?.filter && `过滤：${aquarium.equipment.filter}`,
      aquarium.equipment?.light && `灯光：${aquarium.equipment.light}`,
      aquarium.equipment?.heater ? '加热棒' : '',
      aquarium.equipment?.oxygen ? '增氧' : '',
    ].filter(Boolean) as string[],
    substrate: aquarium.substrate || '未设置',
    plants: aquarium.plants || [],
    hardscape: aquarium.hardscape || [],
    livestock,
    load: {
      currentLoad: Math.round(currentLoad * 10) / 10,
      capacity,
      loadRate: Number.isFinite(loadRate) ? Math.max(0, loadRate) : 0,
      status: getLoadStatus(loadRate),
      remainingCapacity: Math.max(0, Math.round((capacity - currentLoad) * 10) / 10),
    },
    waterLayers,
    missingData,
    availableNiches,
  };
};

const buildCandidate = (
  fish: Fish,
  aquarium: Aquarium,
  profile: AquariumProfile,
  speciesPool: Fish[],
): RecommendationCandidate => {
  const currentLivestock = aquarium.fishes
    .map(item => {
      const species = speciesPool.find(candidate => candidate.id === item.fishId);
      return species ? { species, record: item } : null;
    })
    .filter((item): item is { species: Fish; record: Aquarium['fishes'][number] } => Boolean(item));
  const evaluation = evaluateSpeciesForAquarium(fish, aquarium, currentLivestock);
  const compatibility = evaluateTankCompatibility({
    tank: aquarium,
    existingSpecies: currentLivestock,
    candidateSpecies: fish,
    candidateQuantity: getRecommendedQuantity(fish, profile.load.remainingCapacity),
  });
  const singleLoad = Math.max(0.4, getBioLoadLiters(fish));
  const recommendedQuantity = getRecommendedQuantity(fish, profile.load.remainingCapacity);
  const loadAfterAdd = Math.round(((profile.load.currentLoad + singleLoad * recommendedQuantity) / profile.load.capacity) * 100);
  const minGroup = getMinimumGroupQuantity(fish);
  const minGroupLoadRate = Math.round(((profile.load.currentLoad + singleLoad * minGroup) / profile.load.capacity) * 100);
  const risks = [
    ...evaluation.warnings.map(item => item.title),
    loadAfterAdd >= TANK_LOAD_THRESHOLDS.nearLimit && '添加后负载接近上限',
    minGroup > 1 && minGroupLoadRate >= TANK_LOAD_THRESHOLDS.nearLimit && '群游最低数量会推高负载',
  ].filter(Boolean) as string[];
  const requiredAdjustments = [
    ...evaluation.confirmations.map(item => item.title),
    minGroup > recommendedQuantity && `剩余承载不足以满足建议群游数量 ${minGroup}`,
  ].filter(Boolean) as string[];

  let status: CandidateStatus = 'blocked';
  if (compatibility.status === 'compatible' && risks.length === 0 && requiredAdjustments.length === 0) status = 'direct';
  if (compatibility.status === 'caution' || compatibility.status === 'insufficient_data' || (compatibility.status === 'compatible' && (risks.length > 0 || requiredAdjustments.length > 0))) status = 'adjustable';
  if (compatibility.status === 'not_recommended') status = 'blocked';
  if (profile.load.loadRate >= TANK_LOAD_THRESHOLDS.nearLimit) status = 'blocked';
  if (minGroup > recommendedQuantity && minGroup > 1) status = 'blocked';

  const currentFishes = aquarium.fishes.map(item => speciesPool.find(species => species.id === item.fishId)).filter(Boolean) as Fish[];
  return {
    speciesId: fish.id,
    name: fish.name,
    status,
    recommendedQuantity,
    fitScore: Math.max(0, Math.min(100, evaluation.score - (loadAfterAdd > 75 ? 12 : 0))),
    reason: getRecommendationReason(fish, aquarium, speciesPool),
    risks: Array.from(new Set([...risks, ...compatibility.warningRules.map(item => item.title), ...compatibility.blockingRules.map(item => item.title)])).slice(0, 5),
    requiredAdjustments: Array.from(new Set([...requiredAdjustments, ...compatibility.missingData.map(item => item.title)])).slice(0, 5),
    confidence: compatibility.status === 'insufficient_data' || evaluation.status === 'unknown' || currentFishes.length > 0 && requiredAdjustments.length > 0 ? 'medium' : 'high',
    loadAfterAdd: Number.isFinite(loadAfterAdd) ? loadAfterAdd : profile.load.loadRate,
  };
};

const sortCandidates = (items: RecommendationCandidate[]) => [...items].sort((a, b) => (
  b.fitScore - a.fitScore
  || a.loadAfterAdd - b.loadAfterAdd
  || b.recommendedQuantity - a.recommendedQuantity
));

const buildEmptyTankPlans = (
  candidates: RecommendationCandidate[],
  speciesPool: Fish[],
  profile: AquariumProfile,
): EmptyTankPlan[] => {
  const direct = sortCandidates(candidates.filter(item => item.status === 'direct'));
  const getSpecies = (candidate: RecommendationCandidate) => speciesPool.find(fish => fish.id === candidate.speciesId);
  const smallPeaceful = direct.filter(item => {
    const species = getSpecies(item);
    return species && species.size !== 'Large' && species.temperament !== 'Aggressive';
  });
  const cleaners = direct.filter(item => {
    const species = getSpecies(item);
    return species && getToolFunctions(species).length > 0;
  });
  const easy = direct.filter(item => {
    const species = getSpecies(item);
    return species?.difficulty === 'Easy';
  });
  const makePlan = (
    id: string,
    name: string,
    audience: string,
    source: RecommendationCandidate[],
    maintenanceLevel: EmptyTankPlan['maintenanceLevel'],
    strengths: string[],
    cautions: string[],
  ): EmptyTankPlan | null => {
    const species = source.slice(0, 3).map(item => ({
      speciesId: item.speciesId,
      name: item.name,
      quantity: item.recommendedQuantity,
    }));
    if (species.length === 0) return null;
    const totalLoad = species.reduce((sum, item) => {
      const fish = speciesPool.find(candidate => candidate.id === item.speciesId);
      return sum + (fish ? getBioLoadLiters(fish) * item.quantity : 0);
    }, 0);
    return {
      id,
      name,
      audience,
      species,
      maintenanceLevel,
      estimatedLoadRate: Math.round((totalLoad / profile.load.capacity) * 100),
      strengths,
      cautions,
    };
  };

  return [
    makePlan('safe-start', '稳妥入门方案', '第一次搭配或希望先稳住水体', easy.length ? easy : smallPeaceful, '低', ['低风险起步', '生物负载较轻'], ['分批加入，先观察 3-7 天']),
    makePlan('visual-balance', '观赏效果方案', '希望有群游和层次感', smallPeaceful, '中', ['中上层观赏更明显', '适合后续扩展'], ['注意群游数量和水层压力']),
    makePlan('low-maintenance', '低维护方案', '希望减少残饵和藻类压力', cleaners.length ? cleaners : easy, '低', ['兼顾清洁功能', '维护压力较低'], ['工具生物不能替代换水和过滤']),
  ].filter(Boolean).slice(0, RECOMMENDATION_LIMITS.emptyPlans) as EmptyTankPlan[];
};

const buildSimulation = (
  candidate: RecommendationCandidate,
  quantity: number,
  profile: AquariumProfile,
  speciesPool: Fish[],
): SimulationResult => {
  const species = speciesPool.find(item => item.id === candidate.speciesId);
  const layer = species ? getWaterLayer(species) : 'middle';
  const load = species ? getBioLoadLiters(species) * quantity : 0;
  const afterLoadRate = Math.round(((profile.load.currentLoad + load) / profile.load.capacity) * 100);
  const risks = [
    ...candidate.risks,
    afterLoadRate >= TANK_LOAD_THRESHOLDS.nearLimit && '添加后鱼缸接近建议承载上限',
  ].filter(Boolean) as string[];

  return {
    candidate,
    quantity,
    beforeLoadRate: profile.load.loadRate,
    afterLoadRate,
    waterLayerChange: { [layer]: (profile.waterLayers[layer] || 0) + quantity },
    compatibilityChange: candidate.status === 'direct' ? ['未发现明确新增冲突'] : candidate.requiredAdjustments,
    equipmentStillFits: !candidate.requiredAdjustments.some(item => /过滤|加热|设备/.test(item)),
    newRisks: risks,
    conclusion: afterLoadRate >= TANK_LOAD_THRESHOLDS.nearLimit
      ? '添加后负载偏高，建议先减少数量或加强过滤后再考虑。'
      : candidate.status === 'direct'
        ? '可以作为候选加入，但仍建议分批加入并观察。'
        : '需要先确认调整项，再决定是否加入。',
  };
};

export const normalizeDiscoveryState = (
  state?: Partial<DiscoveryDeckState>,
  dailyLimit = DISCOVERY_DAILY_LIMIT,
  historyDays = DISCOVERY_HISTORY_DAYS,
): DiscoveryDeckState => {
  const today = getLocalDateKey();
  const history = (state?.history || []).filter(item => today && dayNumber(today) - dayNumber(item.dateKey) < historyDays);

  if (!state || state.dateKey !== today) {
    return {
      dateKey: today,
      queueIds: [],
      consumedIds: [],
      history,
    };
  }

  return {
    dateKey: today,
    queueIds: Array.isArray(state.queueIds) ? state.queueIds : [],
    consumedIds: Array.isArray(state.consumedIds) ? state.consumedIds.slice(0, dailyLimit) : [],
    history,
  };
};

const createDiscoveryQueue = (fishes: Fish[], state: DiscoveryDeckState, wishlistIds: Set<string>, dailyLimit = DISCOVERY_DAILY_LIMIT) => {
  const remaining = dailyLimit - state.consumedIds.length;
  if (remaining <= 0) return [];

  const blockedIds = new Set([
    ...state.history.map(item => item.id),
    ...state.consumedIds,
    ...state.queueIds,
    ...wishlistIds,
  ]);
  const source = fishes.filter(fish => getLifeType(fish) !== 'hardscape');
  const strictCandidates = source.filter(fish => !blockedIds.has(fish.id));
  const fallbackCandidates = source.filter(fish => (
    !wishlistIds.has(fish.id) &&
    !state.consumedIds.includes(fish.id) &&
    !state.queueIds.includes(fish.id)
  ));
  const candidates = strictCandidates.length >= remaining ? strictCandidates : fallbackCandidates;

  return shuffleWithSeed(candidates, `${state.dateKey}-${state.consumedIds.length}-${state.history.length}`)
    .slice(0, remaining)
    .map(fish => fish.id);
};

const buildDiscoveryDeck = (speciesPool: Fish[], state: DiscoveryDeckState, wishlistIds: Set<string>, dailyLimit: number): DiscoveryDeckOutput => {
  const shouldFillQueue = state.queueIds.length === 0 && state.consumedIds.length < dailyLimit;
  const nextState = shouldFillQueue
    ? { ...state, queueIds: createDiscoveryQueue(speciesPool, state, wishlistIds, dailyLimit) }
    : state;

  return {
    state: nextState,
    queueIds: nextState.queueIds,
    remainingToday: Math.max(0, dailyLimit - nextState.consumedIds.length),
    currentSpeciesId: nextState.queueIds[0] || null,
    nextSpeciesId: nextState.queueIds[1] || null,
  };
};

export const recommendationService = {
  recommend: (input: unknown): RecommendationOutput => {
    const parsed = recommendationInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({
        module: 'recommendation',
        action: 'recommend',
        message: 'Recommendation input failed schema validation',
        details: parsed.error.flatten(),
      });
      return { items: [] };
    }

    return recommendationService.recommendForAquarium(parsed.data.aquarium as Aquarium, parsed.data.speciesPool as Fish[], parsed.data.limit);
  },

  recommendForAquarium: (aquarium: Aquarium, speciesPool: Fish[], limit = 8): RecommendationOutput => {
    const currentLivestock = aquarium.fishes
      .map(af => {
        const species = speciesPool.find(f => f.id === af.fishId);
        return species ? { species, record: af } : null;
      })
      .filter((item): item is { species: Fish; record: Aquarium['fishes'][number] } => Boolean(item));
    const currentFishes = currentLivestock.map(item => item.species);
    const baseCandidates = speciesPool.filter(candidate => {
      if (currentFishes.some(current => current.id === candidate.id)) return false;
      if (!isRecommendableSpecies(candidate)) return false;
      return true;
    }).map(candidate => ({
      candidate,
      compatibility: evaluateTankCompatibility({
        tank: aquarium,
        existingSpecies: currentLivestock,
        candidateSpecies: candidate,
        candidateQuantity: 1,
      }),
    })).filter(item => item.compatibility.status !== 'not_recommended');

    const strictCandidates = baseCandidates.filter(({ candidate, compatibility }) => {
      if (compatibility.status !== 'compatible') return false;
      return compatibility.blockingRules.length === 0 && compatibility.warningRules.length === 0;
    });

    const relaxedCandidates = baseCandidates.filter(({ candidate, compatibility }) => {
      if (compatibility.status !== 'caution' && compatibility.status !== 'insufficient_data' && compatibility.status !== 'compatible') return false;
      return !strictCandidates.some(item => item.candidate.id === candidate.id);
    });

    const candidates = strictCandidates.length > 0
      ? strictCandidates
      : relaxedCandidates.length > 0
        ? relaxedCandidates
        : baseCandidates;

    const sortedCandidates = candidates.sort((a, b) => {
      const diffScore = { Easy: 0, Medium: 1, Hard: 2 } as Record<string, number>;
      const housingScore = (fish: Fish) => fish.housingMode === '适合混养' ? -1 : fish.housingMode === '谨慎混养' ? 0.5 : 2;
      const toolBonus = (fish: Fish) => getToolFunctions(fish).length > 0 ? -1.2 : 0;
      const loadScore = (fish: Fish) => getBioLoadLiters(fish) / 25;
      const score = (fish: Fish) => (diffScore[fish.difficulty] ?? 1) + housingScore(fish) + toolBonus(fish) + loadScore(fish);
      return score(a.candidate) - score(b.candidate);
    }).slice(0, limit);

    const items = sortedCandidates.map(({ candidate: species, compatibility }) => {
      const isStrict = strictCandidates.some(item => item.candidate.id === species.id);
      const riskLevel = compatibility.status === 'compatible' && isStrict ? 'low' : 'medium';
      return {
        speciesId: species.id,
        reason: compatibility.summary || getRecommendationReason(species, aquarium, speciesPool),
        confidence: isStrict ? 'high' as const : 'medium' as const,
        riskLevel: riskLevel as 'low' | 'medium' | 'high',
        canAdd: compatibility.status === 'compatible' || compatibility.status === 'caution',
        compatibilityStatus: compatibility.status,
        ruleSummary: compatibility.summary,
        passedRules: compatibility.passedRules.slice(0, 4),
        warningRules: compatibility.warningRules.slice(0, 4),
        blockingRules: compatibility.blockingRules.slice(0, 4),
        missingData: compatibility.missingData.slice(0, 4),
      };
    });

    loggerService.info({ module: 'recommendation', action: 'recommend', message: 'Recommendation generated', details: { count: items.length } });
    return { items };
  },

  buildAquariumProfile: (aquarium: Aquarium, speciesPool: Fish[], mode: RecommendationMode = 'existing_livestock') => (
    buildAquariumProfile(aquarium, speciesPool, mode)
  ),

  recommendSmartForAquarium: (input: {
    aquarium: Aquarium;
    speciesPool: Fish[];
    mode?: RecommendationMode;
    preference?: UserPreference;
  }): SmartRecommendationOutput => {
    const mode = input.mode || (input.aquarium.fishes.length > 0 ? 'existing_livestock' : 'empty_tank');
    const profile = buildAquariumProfile(input.aquarium, input.speciesPool, mode);
    const infoRequests = mode === 'empty_tank'
      ? profile.missingData.slice(0, 5)
      : profile.missingData.filter(item => /容量|水体|温度|过滤/.test(item)).slice(0, 4);
    const basePool = input.speciesPool.filter(fish => {
      if (!isLivestockSpecies(fish)) return false;
      if (input.aquarium.fishes.some(item => item.fishId === fish.id)) return false;
      if (fish.housingMode === '建议单养' && input.aquarium.fishes.length > 0) return false;
      return true;
    });
    const rawCandidates = basePool.map(fish => buildCandidate(fish, input.aquarium, profile, input.speciesPool));
    const direct = sortCandidates(rawCandidates.filter(item => item.status === 'direct')).slice(0, RECOMMENDATION_LIMITS.direct);
    const adjustable = sortCandidates(rawCandidates.filter(item => item.status === 'adjustable')).slice(0, RECOMMENDATION_LIMITS.adjustable);
    const blocked = sortCandidates(rawCandidates.filter(item => item.status === 'blocked')).slice(0, RECOMMENDATION_LIMITS.blocked);
    const loadBlocked = profile.load.loadRate >= TANK_LOAD_THRESHOLDS.nearLimit;
    const blockedSummary = [
      loadBlocked && '当前鱼缸已接近建议承载上限，暂不建议继续增加生物。',
      ...blocked.slice(0, 4).map(item => `${item.name}：${item.risks[0] || item.requiredAdjustments[0] || '不满足当前鱼缸条件'}`),
    ].filter(Boolean) as string[];
    const safeDirect = loadBlocked ? [] : direct;

    return {
      mode,
      profile,
      direct: safeDirect,
      adjustable: loadBlocked ? [] : adjustable,
      blocked,
      emptyPlans: mode === 'empty_tank' && infoRequests.length === 0
        ? buildEmptyTankPlans(safeDirect.length ? safeDirect : adjustable, input.speciesPool, profile)
        : [],
      blockedSummary,
      needsMoreInfo: infoRequests.length > 0,
      infoRequests,
      localSummary: loadBlocked
        ? '当前鱼缸负载偏高，系统暂不建议继续增加生物。'
        : safeDirect.length > 0
          ? `找到 ${safeDirect.length} 个可直接加入候选，建议先少量分批添加。`
          : adjustable.length > 0
            ? '当前没有完全直加候选，但有一些调整后可考虑的生物。'
            : '当前信息或条件不足，暂未找到合适候选。',
    };
  },

  simulateSmartAdd: (input: {
    candidate: RecommendationCandidate;
    quantity?: number;
    profile: AquariumProfile;
    speciesPool: Fish[];
  }): SimulationResult => (
    buildSimulation(input.candidate, Math.max(1, input.quantity || input.candidate.recommendedQuantity), input.profile, input.speciesPool)
  ),

  createDiscoveryDeck: (input: unknown): DiscoveryDeckOutput => {
    const parsed = discoveryDeckInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({
        module: 'recommendation',
        action: 'createDiscoveryDeck',
        message: 'Discovery deck input failed schema validation',
        details: parsed.error.flatten(),
      });
      const state = normalizeDiscoveryState();
      return { state, queueIds: [], remainingToday: DISCOVERY_DAILY_LIMIT, currentSpeciesId: null, nextSpeciesId: null };
    }

    const state = normalizeDiscoveryState(parsed.data.state as Partial<DiscoveryDeckState> | undefined, parsed.data.dailyLimit, parsed.data.historyDays);
    const output = buildDiscoveryDeck(parsed.data.speciesPool as Fish[], state, new Set(parsed.data.wishlistIds), parsed.data.dailyLimit);
    loggerService.info({ module: 'recommendation', action: 'createDiscoveryDeck', message: 'Discovery deck generated', details: { remainingToday: output.remainingToday } });
    return output;
  },

  advanceDiscoveryDeck: (input: unknown): DiscoveryAdvanceOutput => {
    const parsed = discoveryAdvanceInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({
        module: 'recommendation',
        action: 'advanceDiscoveryDeck',
        message: 'Discovery advance input failed schema validation',
        details: parsed.error.flatten(),
      });
      const state = normalizeDiscoveryState();
      return { state, addedWishlistId: null, message: '推荐卡片状态异常，请稍后重试。', remainingToday: DISCOVERY_DAILY_LIMIT };
    }

    const speciesPool = parsed.data.speciesPool as Fish[];
    const normalized = normalizeDiscoveryState(parsed.data.state as Partial<DiscoveryDeckState> | undefined, parsed.data.dailyLimit, parsed.data.historyDays);
    const species = speciesPool.find(item => item.id === parsed.data.speciesId);
    const consumedIds = Array.from(new Set([...normalized.consumedIds, parsed.data.speciesId])).slice(0, parsed.data.dailyLimit);
    const history = [
      ...normalized.history.filter(item => item.id !== parsed.data.speciesId),
      { id: parsed.data.speciesId, dateKey: normalized.dateKey },
    ].filter(item => dayNumber(normalized.dateKey) - dayNumber(item.dateKey) < parsed.data.historyDays);
    const baseState = {
      ...normalized,
      consumedIds,
      history,
      queueIds: normalized.queueIds.filter(id => id !== parsed.data.speciesId),
    };
    const wishlistIds = new Set(parsed.data.wishlistIds);
    if (parsed.data.action === 'interest') wishlistIds.add(parsed.data.speciesId);

    const state = consumedIds.length >= parsed.data.dailyLimit
      ? { ...baseState, queueIds: [] }
      : baseState.queueIds.length === 0
        ? { ...baseState, queueIds: createDiscoveryQueue(speciesPool, baseState, wishlistIds, parsed.data.dailyLimit) }
        : baseState;

    const message = parsed.data.action === 'interest'
      ? `已把 ${species?.name || '这个生物'} 加入种草清单`
      : `已跳过 ${species?.name || '这个生物'}`;

    loggerService.info({ module: 'recommendation', action: 'advanceDiscoveryDeck', message: 'Discovery deck advanced', details: { speciesId: parsed.data.speciesId, action: parsed.data.action } });
    return {
      state,
      addedWishlistId: parsed.data.action === 'interest' ? parsed.data.speciesId : null,
      message,
      remainingToday: Math.max(0, parsed.data.dailyLimit - state.consumedIds.length),
    };
  },
};
