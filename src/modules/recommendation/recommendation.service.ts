import { loggerService } from '../../services/logger/logger.service';
import type { Aquarium, Fish } from '../../types';
import { getLifeType, getToolFunctions, isSaltwaterSpecies } from '../species/species.service';
import {
  discoveryAdvanceInputSchema,
  discoveryDeckInputSchema,
  DiscoveryAdvanceOutput,
  DiscoveryDeckState,
  DiscoveryDeckOutput,
  recommendationInputSchema,
  RecommendationOutput,
} from './recommendation.schema';

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
  if (lifeType === 'invertebrate') return 2;
  if (lifeType === 'coral') return 8;
  if (lifeType === 'reptile') return 60;

  const base = fish.size === 'Large' ? 35 : fish.size === 'Medium' ? 12 : 4;
  const temperamentMultiplier = fish.temperament === 'Aggressive' || fish.temperament === 'Territorial' ? 1.35 : 1;
  return Math.round(base * temperamentMultiplier);
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
    const currentFishes = aquarium.fishes.map(af => speciesPool.find(f => f.id === af.fishId)).filter(Boolean) as Fish[];
    const tankIsSaltwater = aquarium.waterType === 'Saltwater' || currentFishes.some(isSaltwaterSpecies);
    const tankHasSingleOnly = currentFishes.some(fish => fish.housingMode === '建议单养' || getLifeType(fish) === 'reptile');
    const tankVolume = getTankVolumeLiters(aquarium);
    const currentBioLoad = aquarium.fishes.reduce((sum, aqFish) => {
      const fish = speciesPool.find(item => item.id === aqFish.fishId);
      return sum + (fish ? getBioLoadLiters(fish) * Math.max(1, aqFish.quantity || 1) : 0);
    }, 0);
    const tankTempRange = currentFishes.reduce<[number, number] | null>((range, fish) => {
      const next = parseRange(fish.waterTemperature, [0, 40]);
      return range ? [Math.max(range[0], next[0]), Math.min(range[1], next[1])] : next;
    }, null);
    const tankPhRange = currentFishes.reduce<[number, number] | null>((range, fish) => {
      const next = parseRange(fish.phLevel, [0, 14]);
      return range ? [Math.max(range[0], next[0]), Math.min(range[1], next[1])] : next;
    }, null);

    const baseCandidates = speciesPool.filter(candidate => {
      if (currentFishes.some(current => current.id === candidate.id)) return false;
      if (!isRecommendableSpecies(candidate)) return false;
      if (tankIsSaltwater !== isSaltwaterSpecies(candidate)) return false;
      return true;
    });

    const hasObviousConflict = (candidate: Fish, strictMode: boolean) => {
      const candidateTemp = parseRange(candidate.waterTemperature, [0, 40]);
      const candidatePh = parseRange(candidate.phLevel, [0, 14]);
      if (tankTempRange && !rangesOverlap(tankTempRange, candidateTemp)) return true;
      if (tankPhRange && !rangesOverlap(tankPhRange, candidatePh)) return true;

      return !currentFishes.every(current => {
        const currentLife = getLifeType(current);
        const candidateLife = getLifeType(candidate);
        if (current.name.includes('斗鱼') && candidate.name.includes('斗鱼')) return false;
        if (candidateLife === 'invertebrate' && (current.temperament === 'Aggressive' || current.size === 'Large')) return false;
        if (currentLife === 'invertebrate' && (candidate.temperament === 'Aggressive' || candidate.size === 'Large')) return false;

        if (!strictMode) return true;
        if (current.temperament === 'Aggressive' && candidate.size === 'Small') return false;
        if (candidate.temperament === 'Aggressive' && current.size === 'Small') return false;
        if (current.size === 'Large' && candidate.size === 'Small') return false;
        if (candidate.size === 'Large' && current.size === 'Small') return false;
        return true;
      });
    };

    const strictCandidates = baseCandidates.filter(candidate => {
      if (tankHasSingleOnly) return false;
      if (tankVolume > 0 && currentBioLoad + getBioLoadLiters(candidate) > tankVolume * 0.95) return false;
      return !hasObviousConflict(candidate, true);
    });

    const relaxedCandidates = baseCandidates.filter(candidate => {
      if (tankVolume > 0 && currentBioLoad + getBioLoadLiters(candidate) > tankVolume * 1.15) return false;
      return !hasObviousConflict(candidate, false);
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
      return score(a) - score(b);
    }).slice(0, limit);

    const items = sortedCandidates.map(species => {
      const isStrict = strictCandidates.some(candidate => candidate.id === species.id);
      const riskLevel = isStrict ? 'low' : relaxedCandidates.some(candidate => candidate.id === species.id) ? 'medium' : 'high';
      return {
        speciesId: species.id,
        reason: getRecommendationReason(species, aquarium, speciesPool),
        confidence: isStrict ? 'high' as const : 'medium' as const,
        riskLevel: riskLevel as 'low' | 'medium' | 'high',
        canAdd: riskLevel !== 'high',
      };
    });

    loggerService.info({ module: 'recommendation', action: 'recommend', message: 'Recommendation generated', details: { count: items.length } });
    return { items };
  },

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
