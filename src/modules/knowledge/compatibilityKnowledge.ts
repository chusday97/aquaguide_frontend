import type { Aquarium, Fish } from '../../types';
import { evaluateTankCompatibility, type TankCompatibilityResult, type TankCompatibilityRule, type TankCompatibilityStatus } from '../../lib/tankCompatibilityEngine';
import type { CompatibilityDecision, CompatibilityRelationship, CompatibilityRiskType, PairCompatibilityResult } from './knowledge.types';

export type CompatibilityItem = {
  species: Fish;
  quantity?: number;
  origin?: 'candidate' | 'existing';
};

export type EvaluateCompatibilityDecisionInput = {
  tank?: Aquarium | null;
  items: CompatibilityItem[];
};

const getQuantity = (value?: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1;
};

const uniqueRules = (rules: TankCompatibilityRule[]) => {
  const seen = new Set<string>();
  return rules.filter(rule => {
    const key = `${rule.code}::${rule.title}::${rule.evidence}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const statusRank: Record<TankCompatibilityStatus, number> = {
  compatible: 0,
  caution: 1,
  insufficient_data: 2,
  not_recommended: 3,
};

const riskPriority: CompatibilityRiskType[] = [
  'water_type',
  'predation',
  'aggression',
  'territory',
  'equipment',
  'space',
  'temperature',
  'ph',
  'group_size',
  'bioload',
  'unknown',
];

const inferRiskType = (rule: TankCompatibilityRule): CompatibilityRiskType => {
  const text = `${rule.code} ${rule.title} ${rule.evidence}`;
  if (/water|水体|海水|淡水/.test(text)) return 'water_type';
  if (/predation|捕食|吞食|体型/.test(text)) return 'predation';
  if (/attack|攻击|追咬|性情/.test(text)) return 'aggression';
  if (/territor|领地|单养/.test(text)) return 'territory';
  if (/equipment|过滤|加热|设备/.test(text)) return 'equipment';
  if (/space|volume|tank|容量|空间|躲避|缸/.test(text)) return 'space';
  if (/temperature|温度|水温/.test(text)) return 'temperature';
  if (/ph|pH/.test(text)) return 'ph';
  if (/school|群游|数量/.test(text)) return 'group_size';
  if (/bioload|负荷|负载/.test(text)) return 'bioload';
  return 'unknown';
};

const severityRank = (relationship: CompatibilityRelationship) => {
  const relationScore = relationship.relationship === 'not_recommended' ? 100 : relationship.relationship === 'conditional' ? 60 : relationship.relationship === 'unknown' ? 40 : 0;
  const severityScore = relationship.severity === 'high' ? 30 : relationship.severity === 'medium' ? 20 : relationship.severity === 'low' ? 10 : 0;
  const priorityScore = riskPriority.length - riskPriority.indexOf(relationship.riskType);
  return relationScore + severityScore + priorityScore;
};

const toRelationship = (
  rule: TankCompatibilityRule,
  relationship: CompatibilityRelationship['relationship'],
  suggestions: string[],
): CompatibilityRelationship => ({
  relationship,
  riskType: inferRiskType(rule),
  title: rule.title,
  evidence: rule.evidence || rule.title,
  severity: rule.severity === 'info' ? 'none' : rule.severity,
  conditions: relationship === 'conditional' || relationship === 'unknown' ? suggestions.slice(0, 2) : [],
  mitigation: relationship === 'not_recommended' ? suggestions.slice(0, 3) : suggestions.slice(0, 2),
  sourceRule: rule,
});

const mergeDirectionalResults = (results: TankCompatibilityResult[]): TankCompatibilityResult => {
  const status = results.reduce<TankCompatibilityStatus>((current, result) => (
    statusRank[result.status] > statusRank[current] ? result.status : current
  ), 'compatible');
  const blockingRules = uniqueRules(results.flatMap(result => result.blockingRules));
  const warningRules = uniqueRules(results.flatMap(result => result.warningRules));
  const missingData = uniqueRules(results.flatMap(result => result.missingData));
  const passedRules = uniqueRules(results.flatMap(result => result.passedRules));
  const summary = results.find(result => result.status === status)?.summary || results[0]?.summary || '暂时无法判断。';
  return {
    status,
    riskLevel: status === 'not_recommended'
      ? 'high'
      : status === 'insufficient_data'
        ? 'unknown'
        : status === 'caution'
          ? 'medium'
          : 'none',
    summary,
    passedRules,
    warningRules,
    blockingRules,
    missingData,
    suggestions: Array.from(new Set(results.flatMap(result => result.suggestions))).slice(0, 5),
    metadata: {
      ruleVersion: results[0]?.metadata.ruleVersion || 'tank-compatibility-v1',
      speciesDataVersion: results[0]?.metadata.speciesDataVersion || 'local-fish-data-v1',
      calculatedAt: new Date().toISOString(),
      scope: results[0]?.metadata.scope || 'tank',
    },
  };
};

const buildPairResult = (
  tank: Aquarium | null | undefined,
  itemA: CompatibilityItem,
  itemB: CompatibilityItem,
): PairCompatibilityResult => {
  const quantityA = getQuantity(itemA.quantity);
  const quantityB = getQuantity(itemB.quantity);
  const forwardResult = evaluateTankCompatibility({
    tank,
    existingSpecies: [{ species: itemA.species, record: { quantity: quantityA } }],
    candidateSpecies: itemB.species,
    candidateQuantity: quantityB,
  });
  const reverseResult = evaluateTankCompatibility({
    tank,
    existingSpecies: [{ species: itemB.species, record: { quantity: quantityB } }],
    candidateSpecies: itemA.species,
    candidateQuantity: quantityA,
  });
  const rawResult = mergeDirectionalResults([forwardResult, reverseResult]);

  const blocking = rawResult.blockingRules.map(rule => toRelationship(rule, 'not_recommended', rawResult.suggestions));
  const warnings = rawResult.warningRules.map(rule => toRelationship(rule, 'conditional', rawResult.suggestions));
  const missing = rawResult.missingData.map(rule => toRelationship(rule, 'unknown', rawResult.suggestions));
  const passed = rawResult.passedRules.map(rule => toRelationship(rule, 'compatible', rawResult.suggestions));
  const riskReasons = [...blocking, ...warnings, ...missing].sort((a, b) => severityRank(b) - severityRank(a));

  return {
    pairId: `${itemA.species.id}__${itemB.species.id}`,
    speciesA: itemA.species,
    speciesB: itemB.species,
    quantityA,
    quantityB,
    status: rawResult.status,
    primaryReason: riskReasons[0],
    secondaryReasons: riskReasons.slice(1),
    passedRelationships: passed,
    rawResult,
    adjustable: rawResult.status === 'caution' || rawResult.status === 'insufficient_data',
    actions: rawResult.suggestions,
  };
};

const buildAggregateResult = (pairResults: PairCompatibilityResult[]): TankCompatibilityResult => {
  const status = pairResults.reduce<TankCompatibilityStatus>((current, pair) => (
    statusRank[pair.status] > statusRank[current] ? pair.status : current
  ), 'compatible');
  const blockingRules = uniqueRules(pairResults.flatMap(pair => pair.rawResult.blockingRules));
  const warningRules = uniqueRules(pairResults.flatMap(pair => pair.rawResult.warningRules));
  const missingData = uniqueRules(pairResults.flatMap(pair => pair.rawResult.missingData));
  const passedRules = uniqueRules(pairResults.flatMap(pair => pair.rawResult.passedRules));
  const suggestions = Array.from(new Set(pairResults.flatMap(pair => pair.rawResult.suggestions))).slice(0, 5);
  const riskLevel: TankCompatibilityResult['riskLevel'] = status === 'not_recommended'
    ? 'high'
    : status === 'caution'
      ? 'medium'
      : status === 'insufficient_data'
        ? 'unknown'
        : 'none';
  const summary = status === 'not_recommended'
    ? blockingRules[0]?.evidence || '当前组合存在阻断风险。'
    : status === 'caution'
      ? warningRules[0]?.evidence || '当前组合可以尝试，但需要谨慎观察。'
      : status === 'insufficient_data'
        ? missingData[0]?.evidence || '当前组合缺少关键资料。'
        : '当前组合未发现明确阻断风险。';

  return {
    status,
    riskLevel,
    summary,
    passedRules,
    warningRules,
    blockingRules,
    missingData,
    suggestions,
    metadata: {
      ruleVersion: pairResults[0]?.rawResult.metadata.ruleVersion || 'tank-compatibility-v1',
      speciesDataVersion: pairResults[0]?.rawResult.metadata.speciesDataVersion || 'local-fish-data-v1',
      calculatedAt: new Date().toISOString(),
      scope: pairResults[0]?.rawResult.metadata.scope || 'tank',
    },
  };
};

export const evaluateCompatibilityDecision = ({
  tank,
  items,
}: EvaluateCompatibilityDecisionInput): CompatibilityDecision => {
  const normalized = items.filter(item => item.species?.id);
  const pairResults: PairCompatibilityResult[] = [];

  for (let indexA = 0; indexA < normalized.length; indexA += 1) {
    for (let indexB = indexA + 1; indexB < normalized.length; indexB += 1) {
      pairResults.push(buildPairResult(tank, normalized[indexA], normalized[indexB]));
    }
  }

  const aggregateResult = pairResults.length > 0
    ? buildAggregateResult(pairResults)
    : evaluateTankCompatibility({ tank, candidateSpecies: normalized[0]?.species || null, candidateQuantity: normalized[0]?.quantity });
  const primaryConflict = pairResults
    .filter(pair => pair.primaryReason)
    .sort((a, b) => severityRank(b.primaryReason!) - severityRank(a.primaryReason!))[0];
  const blockedReasons = pairResults.flatMap(pair => [pair.primaryReason, ...pair.secondaryReasons])
    .filter((item): item is CompatibilityRelationship => Boolean(item && item.relationship === 'not_recommended'));
  const adjustableReasons = pairResults.flatMap(pair => [pair.primaryReason, ...pair.secondaryReasons])
    .filter((item): item is CompatibilityRelationship => Boolean(item && item.relationship === 'conditional'));
  const missingInformation = pairResults.flatMap(pair => [pair.primaryReason, ...pair.secondaryReasons])
    .filter((item): item is CompatibilityRelationship => Boolean(item && item.relationship === 'unknown'));

  return {
    status: aggregateResult.status,
    riskLevel: aggregateResult.riskLevel,
    summary: aggregateResult.summary,
    pairResults,
    primaryConflict,
    blockedReasons,
    adjustableReasons,
    missingInformation,
    passedRules: aggregateResult.passedRules,
    warningRules: aggregateResult.warningRules,
    blockingRules: aggregateResult.blockingRules,
    missingData: aggregateResult.missingData,
    suggestions: aggregateResult.suggestions,
    aggregateResult,
    metadata: aggregateResult.metadata,
  };
};
