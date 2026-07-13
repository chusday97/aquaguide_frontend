import type { Aquarium, Fish } from '../types';
import { isSaltwaterSpecies } from '../modules/species/species.service';
import { evaluateSpeciesForAquarium, getAquariumVolumeLiters } from './speciesFitEngine';

export type TankCompatibilityStatus = 'compatible' | 'caution' | 'not_recommended' | 'insufficient_data';
export type TankCompatibilityRiskLevel = 'none' | 'low' | 'medium' | 'high' | 'unknown';
export type TankCompatibilityAddPolicy = 'allow' | 'confirm' | 'complete_information' | 'block';
export type TankCompatibilityScope = 'tank' | 'species_only';

export type TankCompatibilityRule = {
  code: string;
  title: string;
  evidence: string;
  severity: 'info' | 'low' | 'medium' | 'high';
};

export type TankCompatibilityResult = {
  status: TankCompatibilityStatus;
  riskLevel: TankCompatibilityRiskLevel;
  summary: string;
  passedRules: TankCompatibilityRule[];
  warningRules: TankCompatibilityRule[];
  blockingRules: TankCompatibilityRule[];
  missingData: TankCompatibilityRule[];
  suggestions: string[];
  metadata: {
    ruleVersion: string;
    speciesDataVersion: string;
    calculatedAt: string;
    scope: TankCompatibilityScope;
  };
};

export type EvaluateTankCompatibilityInput = {
  tank?: Aquarium | null;
  existingSpecies?: Array<Fish | { species?: Fish | null; record?: { quantity?: number } | null }>;
  candidateSpecies?: Fish | null;
  candidateQuantity?: number;
  scope?: TankCompatibilityScope;
};

const RULE_VERSION = 'tank-compatibility-v1';
const SPECIES_DATA_VERSION = 'local-fish-data-v1';

const asRule = (
  code: string,
  title: string,
  evidence: string,
  severity: TankCompatibilityRule['severity'] = 'info',
): TankCompatibilityRule => ({ code, title, evidence, severity });

const normalizeExistingSpecies = (
  existingSpecies: EvaluateTankCompatibilityInput['existingSpecies'] = [],
) => existingSpecies
  .map(item => {
    if (!item || typeof item !== 'object') return null;
    if ('species' in item) {
      const species = (item as { species?: Fish | null }).species || null;
      if (!species?.id) return null;
      return {
        species,
        quantity: getQuantity((item as { record?: { quantity?: number } | null }).record?.quantity),
      };
    }
    const species = item as Fish;
    return species?.id ? { species, quantity: 1 } : null;
  })
  .filter((item): item is { species: Fish; quantity: number } => Boolean(item?.species?.id));

const parseRange = (value?: string) => {
  const matches = value?.match(/(\d+(?:\.\d+)?)/g);
  if (!matches?.length) return null;
  const values = matches.map(Number).filter(Number.isFinite);
  if (!values.length) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
};

const rangesOverlap = (a: ReturnType<typeof parseRange>, b: ReturnType<typeof parseRange>) => {
  if (!a || !b) return true;
  return Math.max(a.min, b.min) <= Math.min(a.max, b.max);
};

const getQuantity = (value?: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1;
};

const estimateBioload = (fish: Fish, quantity = 1) => {
  const base = fish.size === 'Large' ? 8 : fish.size === 'Medium' ? 4 : 1.5;
  const temperament = fish.temperament === 'Aggressive' || fish.temperament === 'Territorial' ? 1.35 : 1;
  return base * temperament * getQuantity(quantity);
};

const isSchoolingSpecies = (fish: Fish) => /群游|灯|红鼻|斑马|白云|鼠鱼|宝莲|红绿|tetra|rasbora|cory/i.test(
  `${fish.name} ${fish.category} ${fish.description} ${fish.housingMode || ''}`,
);

const convertFitItem = (
  item: { type: string; title: string; detail: string; severity?: 'low' | 'medium' | 'high' },
  fallbackSeverity: TankCompatibilityRule['severity'],
): TankCompatibilityRule => asRule(
  item.type,
  item.title,
  item.detail,
  item.severity || fallbackSeverity,
);

const buildSummary = (
  status: TankCompatibilityStatus,
  candidate: Fish,
  blockingRules: TankCompatibilityRule[],
  warningRules: TankCompatibilityRule[],
  missingData: TankCompatibilityRule[],
) => {
  if (status === 'not_recommended') return blockingRules[0]?.evidence || `当前条件下不建议加入 ${candidate.name}。`;
  if (status === 'insufficient_data') return missingData[0]?.evidence || '关键资料不足，暂时无法可靠判断。';
  if (status === 'caution') return warningRules[0]?.evidence || `可以尝试加入 ${candidate.name}，但需要先处理风险项。`;
  return `${candidate.name} 当前条件下适合加入，但仍建议少量加入并继续观察。`;
};

const dedupeRules = (rules: TankCompatibilityRule[]) => {
  const seen = new Set<string>();
  return rules.filter(rule => {
    const key = `${rule.code}::${rule.title}::${rule.evidence}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const evaluateTankCompatibility = ({
  tank,
  existingSpecies = [],
  candidateSpecies,
  candidateQuantity = 1,
  scope = 'tank',
}: EvaluateTankCompatibilityInput): TankCompatibilityResult => {
  const metadata = {
    ruleVersion: RULE_VERSION,
    speciesDataVersion: SPECIES_DATA_VERSION,
    calculatedAt: new Date().toISOString(),
    scope,
  };
  const passedRules: TankCompatibilityRule[] = [];
  const warningRules: TankCompatibilityRule[] = [];
  const blockingRules: TankCompatibilityRule[] = [];
  const missingData: TankCompatibilityRule[] = [];
  const suggestions: string[] = [];

  if (!candidateSpecies) {
    missingData.push(asRule('missing_candidate_species', '缺少候选生物', '请先选择要评估的生物。', 'high'));
    return {
      status: 'insufficient_data',
      riskLevel: 'unknown',
      summary: '缺少候选生物，无法判断。',
      passedRules,
      warningRules,
      blockingRules,
      missingData,
      suggestions: ['先选择一个候选生物。'],
      metadata,
    };
  }

  const currentLivestock = normalizeExistingSpecies(existingSpecies);
  const currentSpecies = currentLivestock
    .map(item => item.species)
    .filter(species => species.id !== candidateSpecies.id);

  if (scope === 'species_only') {
    if (currentSpecies.length === 0) {
      missingData.push(asRule('missing_species_pair', '还需选择生物', '至少选择两种生物，才能判断它们之间的混养关系。', 'high'));
    }

    currentSpecies.forEach(existing => {
      const pairName = `${existing.name} 与 ${candidateSpecies.name}`;
      if (isSaltwaterSpecies(existing) !== isSaltwaterSpecies(candidateSpecies)) {
        blockingRules.push(asRule('species_water_type_conflict', '水体类型冲突', `${pairName} 分属淡水与海水环境，不能混养。`, 'high'));
      } else {
        passedRules.push(asRule('species_water_type_match', '水体类型一致', `${pairName} 的水体类型一致。`, 'info'));
      }

      const existingTemperature = parseRange(existing.waterTemperature);
      const candidateTemperature = parseRange(candidateSpecies.waterTemperature);
      if (!existingTemperature || !candidateTemperature) {
        missingData.push(asRule('species_temperature_missing', '温度资料不足', `${pairName} 缺少可比较的温度区间。`, 'medium'));
      } else if (!rangesOverlap(existingTemperature, candidateTemperature)) {
        blockingRules.push(asRule('temperature_no_overlap', '温度区间不重合', `${pairName} 的适宜温度没有交集。`, 'high'));
      } else {
        passedRules.push(asRule('temperature_overlap', '温度区间有交集', `${pairName} 可以找到共同温度区间。`, 'info'));
      }

      const existingPh = parseRange(existing.phLevel);
      const candidatePh = parseRange(candidateSpecies.phLevel);
      if (!existingPh || !candidatePh) {
        missingData.push(asRule('species_ph_missing', 'pH 资料不足', `${pairName} 缺少可比较的 pH 区间。`, 'medium'));
      } else if (!rangesOverlap(existingPh, candidatePh)) {
        warningRules.push(asRule('ph_range_gap', 'pH 区间差异较大', `${pairName} 的 pH 区间没有明确交集。`, 'medium'));
      } else {
        passedRules.push(asRule('ph_range_overlap', 'pH 区间有交集', `${pairName} 可以找到共同 pH 区间。`, 'info'));
      }

      if (existing.housingMode === '建议单养' || candidateSpecies.housingMode === '建议单养') {
        const singleSpecies = existing.housingMode === '建议单养' ? existing : candidateSpecies;
        blockingRules.push(asRule('single_housing_required', '存在单养倾向', `${singleSpecies.name} 更适合单养，不建议作为普通混养组合。`, 'high'));
      }

      const predator = [existing, candidateSpecies].find(item => (
        item.size === 'Large'
        || item.temperament === 'Aggressive'
        || /掠食|捕食|吞食|龙鱼|雷龙|地图|雀鳝|大型/i.test(`${item.name} ${item.description}`)
      ));
      const smaller = predator?.id === existing.id ? candidateSpecies : existing;
      if (predator && smaller.size === 'Small' && predator.id !== smaller.id) {
        blockingRules.push(asRule('predation_risk', '捕食或吞食风险', `${predator.name} 可能捕食或吞食 ${smaller.name}。`, 'high'));
      }

      const territorialCount = [existing, candidateSpecies].filter(item => item.temperament === 'Territorial').length;
      if (territorialCount >= 2) {
        blockingRules.push(asRule('territorial_conflict', '领地冲突', `${pairName} 都有明显领地倾向。`, 'high'));
      } else if ([existing, candidateSpecies].some(item => item.temperament === 'Aggressive' || item.temperament === 'Territorial')) {
        warningRules.push(asRule('temperament_caution', '性情需要观察', `${pairName} 中存在攻击性或领地倾向，需要准备躲避空间。`, 'medium'));
      } else {
        passedRules.push(asRule('temperament_match', '性情未见明显冲突', `${pairName} 暂未发现明确性情阻断。`, 'info'));
      }
    });

    const finalPassedRules = dedupeRules(passedRules);
    const finalWarningRules = dedupeRules(warningRules);
    const finalBlockingRules = dedupeRules(blockingRules);
    const finalMissingData = dedupeRules(missingData);
    const hasBlockingMissingData = finalMissingData.some(item => item.severity === 'high' || item.severity === 'medium');
    const status: TankCompatibilityStatus = finalBlockingRules.length > 0
      ? 'not_recommended'
      : hasBlockingMissingData
        ? 'insufficient_data'
        : finalWarningRules.length > 0
          ? 'caution'
          : 'compatible';
    const riskLevel: TankCompatibilityRiskLevel = status === 'not_recommended'
      ? 'high'
      : status === 'insufficient_data'
        ? 'unknown'
        : status === 'caution' ? 'medium' : 'none';
    const names = [candidateSpecies, ...currentSpecies].map(item => item.name).join('、');
    const summary = status === 'not_recommended'
      ? finalBlockingRules[0]?.evidence || '所选组合存在明确阻断。'
      : status === 'insufficient_data'
        ? finalMissingData[0]?.evidence || '所选组合资料不足。'
        : status === 'caution'
          ? finalWarningRules[0]?.evidence || '所选组合需要谨慎观察。'
          : `${names} 暂未发现明确混养冲突。`;

    return {
      status,
      riskLevel,
      summary,
      passedRules: finalPassedRules,
      warningRules: finalWarningRules,
      blockingRules: finalBlockingRules,
      missingData: finalMissingData,
      suggestions: status === 'compatible'
        ? ['进入完整计算，结合鱼缸环境确认容量、设备和负载。']
        : ['进入完整计算查看详细依据与鱼缸环境影响。'],
      metadata,
    };
  }

  if (!tank) {
    missingData.push(asRule('missing_tank', '缺少当前鱼缸', '请先选择一个鱼缸，再判断混养适配。', 'high'));
    return {
      status: 'insufficient_data',
      riskLevel: 'unknown',
      summary: '缺少当前鱼缸，无法判断。',
      passedRules,
      warningRules,
      blockingRules,
      missingData,
      suggestions: ['先选择或创建一个鱼缸。'],
      metadata,
    };
  }

  const livestock = currentLivestock.map(item => ({ species: item.species, record: { quantity: item.quantity } }));
  const fit = evaluateSpeciesForAquarium(candidateSpecies, tank, livestock);

  fit.matchedItems.forEach(item => passedRules.push(convertFitItem(item, 'info')));
  fit.warnings.forEach(item => warningRules.push(convertFitItem(item, item.severity || 'medium')));
  fit.hardBlocks.forEach(item => blockingRules.push(convertFitItem(item, item.severity || 'high')));
  fit.confirmations.forEach(item => missingData.push(convertFitItem(item, 'low')));

  const tankVolume = getAquariumVolumeLiters(tank);
  if (!tankVolume) {
    missingData.push(asRule('missing_tank_volume', '缺少鱼缸容量', '当前鱼缸尺寸不完整，无法确认容量和负载。', 'medium'));
  }
  if (!tank.targetTemperature) {
    missingData.push(asRule('missing_tank_temperature', '缺少水温', '当前鱼缸未填写目标温度。', 'medium'));
  }

  currentSpecies.forEach(existing => {
    if (existing.housingMode === '建议单养') {
      warningRules.push(asRule(
        'existing_single_housing',
        '已有生物建议单养',
        `${existing.name} 更适合单独饲养，新增 ${candidateSpecies.name} 前需要确认空间和隔离条件。`,
        'medium',
      ));
    }
    if (!rangesOverlap(parseRange(existing.waterTemperature), parseRange(candidateSpecies.waterTemperature))) {
      blockingRules.push(asRule(
        'temperature_no_overlap',
        '温度区间不重合',
        `${existing.name} 与 ${candidateSpecies.name} 的适宜温度没有交集。`,
        'high',
      ));
    }
    if (!rangesOverlap(parseRange(existing.phLevel), parseRange(candidateSpecies.phLevel))) {
      warningRules.push(asRule(
        'ph_range_gap',
        'pH 区间差异较大',
        `${existing.name} 与 ${candidateSpecies.name} 的 pH 区间差异较大，建议先确认水质。`,
        'medium',
      ));
    }
  });

  const hasPredator = currentSpecies.find(item => (
    item.size === 'Large'
    || item.temperament === 'Aggressive'
    || /掠食|捕食|吞食|龙鱼|雷龙|地图|雀鳝|大型/i.test(`${item.name} ${item.description}`)
  ));
  if (hasPredator && candidateSpecies.size === 'Small') {
    blockingRules.push(asRule(
      'predation_risk',
      '捕食或吞食风险',
      `当前已有 ${hasPredator.name}，不建议加入明显更小的 ${candidateSpecies.name}。`,
      'high',
    ));
  }

  const territorialConflict = currentSpecies.find(item => (
    item.temperament === 'Territorial'
    || item.housingMode === '建议单养'
  ));
  if (territorialConflict && (candidateSpecies.temperament === 'Territorial' || candidateSpecies.housingMode === '建议单养')) {
    blockingRules.push(asRule(
      'territorial_conflict',
      '领地冲突',
      `${territorialConflict.name} 与 ${candidateSpecies.name} 都存在领地或单养倾向。`,
      'high',
    ));
  }

  if (tankVolume) {
    const currentLoad = currentLivestock.reduce((sum, item) => sum + estimateBioload(item.species, item.quantity), 0);
    const nextLoad = currentLoad + estimateBioload(candidateSpecies, candidateQuantity);
    const loadRate = Math.round((nextLoad / Math.max(1, tankVolume)) * 100);
    if (loadRate >= 90) {
      blockingRules.push(asRule('bioload_over_limit', '生物负荷接近上限', `模拟加入后负载约 ${loadRate}%，不建议继续增加。`, 'high'));
    } else if (loadRate >= 70) {
      warningRules.push(asRule('bioload_near_limit', '生物负荷偏高', `模拟加入后负载约 ${loadRate}%，建议减少数量或加强过滤。`, 'medium'));
    } else {
      passedRules.push(asRule('bioload_ok', '生物负荷可接受', `模拟加入后负载约 ${loadRate}%。`, 'info'));
    }
  }

  const sameSpeciesExistingQuantity = currentLivestock
    .filter(item => item.species.id === candidateSpecies.id)
    .reduce((sum, item) => sum + item.quantity, 0);
  const totalCandidateSpeciesQuantity = sameSpeciesExistingQuantity + getQuantity(candidateQuantity);
  if (isSchoolingSpecies(candidateSpecies) && totalCandidateSpeciesQuantity < 6) {
    warningRules.push(asRule(
      'schooling_quantity_low',
      '群游数量不足',
      `${candidateSpecies.name} 可能需要 6 只/条左右成群更稳定，当前模拟合计 ${totalCandidateSpeciesQuantity}。`,
      'low',
    ));
  }

  if (candidateSpecies.housingMode === '建议单养' && currentSpecies.length > 0) {
    blockingRules.push(asRule(
      'single_housing_required',
      '更适合单养',
      `${candidateSpecies.name} 标记为建议单养，不应作为普通混养候选。`,
      'high',
    ));
  }

  if (blockingRules.length > 0) {
    suggestions.push('先移除阻断风险或更换候选生物。');
  }
  if (warningRules.length > 0) {
    suggestions.push('如需尝试，请先补充躲避空间、确认水质，并少量加入观察。');
  }
  if (missingData.length > 0) {
    suggestions.push('补充鱼缸尺寸、水温、pH、硬度和设备信息后再评估。');
  }
  if (blockingRules.length === 0 && warningRules.length === 0 && missingData.length === 0) {
    suggestions.push('可以少量加入，并在 3-7 天内观察追咬、拒食和水质波动。');
  }

  const finalPassedRules = dedupeRules(passedRules);
  const finalWarningRules = dedupeRules(warningRules);
  const finalBlockingRules = dedupeRules(blockingRules);
  const finalMissingData = dedupeRules(missingData);

  const missingIsBlockingJudgement = finalMissingData.some(item => item.severity === 'high' || item.severity === 'medium');
  const status: TankCompatibilityStatus = finalBlockingRules.length > 0
    ? 'not_recommended'
    : missingIsBlockingJudgement
      ? 'insufficient_data'
      : finalWarningRules.length > 0 || finalMissingData.length > 0
        ? 'caution'
        : 'compatible';

  const riskLevel: TankCompatibilityRiskLevel = status === 'not_recommended'
    ? 'high'
    : status === 'insufficient_data'
      ? 'unknown'
      : status === 'caution'
        ? finalWarningRules.some(rule => rule.severity === 'medium' || rule.severity === 'high') ? 'medium' : 'low'
        : 'none';

  return {
    status,
    riskLevel,
    summary: buildSummary(status, candidateSpecies, finalBlockingRules, finalWarningRules, finalMissingData),
    passedRules: finalPassedRules,
    warningRules: finalWarningRules,
    blockingRules: finalBlockingRules,
    missingData: finalMissingData,
    suggestions: Array.from(new Set(suggestions)).slice(0, 5),
    metadata,
  };
};

export const getTankCompatibilityStatusLabel = (status: TankCompatibilityStatus) => {
  switch (status) {
    case 'compatible':
      return '当前条件下适合';
    case 'caution':
      return '可以尝试，需谨慎';
    case 'not_recommended':
      return '当前条件下不建议加入';
    case 'insufficient_data':
      return '信息不足';
    default:
      return '信息不足';
  }
};

export const evaluateSpeciesCombination = (species: Fish[]): TankCompatibilityResult => {
  const uniqueSpecies = Array.from(new Map(species.filter(item => item?.id).map(item => [item.id, item])).values());
  if (uniqueSpecies.length < 2) {
    return evaluateTankCompatibility({
      scope: 'species_only',
      candidateSpecies: uniqueSpecies[0] || null,
      existingSpecies: [],
    });
  }

  const results = uniqueSpecies.slice(1).map((candidateSpecies, index) => evaluateTankCompatibility({
    scope: 'species_only',
    candidateSpecies,
    existingSpecies: uniqueSpecies.slice(0, index + 1),
  }));
  const rank: Record<TankCompatibilityStatus, number> = {
    compatible: 0,
    caution: 1,
    insufficient_data: 2,
    not_recommended: 3,
  };
  const primary = [...results].sort((a, b) => rank[b.status] - rank[a.status])[0];
  const passedRules = dedupeRules(results.flatMap(result => result.passedRules));
  const warningRules = dedupeRules(results.flatMap(result => result.warningRules));
  const blockingRules = dedupeRules(results.flatMap(result => result.blockingRules));
  const missingData = dedupeRules(results.flatMap(result => result.missingData));

  return {
    ...primary,
    summary: primary.status === 'compatible'
      ? `${uniqueSpecies.map(item => item.name).join('、')} 暂未发现明确混养冲突。`
      : primary.summary,
    passedRules,
    warningRules,
    blockingRules,
    missingData,
    suggestions: Array.from(new Set(results.flatMap(result => result.suggestions))).slice(0, 5),
  };
};

export const getTankCompatibilityAddPolicy = (
  status: TankCompatibilityStatus,
): TankCompatibilityAddPolicy => {
  if (status === 'compatible') return 'allow';
  if (status === 'caution') return 'confirm';
  if (status === 'insufficient_data') return 'complete_information';
  return 'block';
};
