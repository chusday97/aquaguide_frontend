import type { Fish } from '../../types';
import type { DiagnosisAnswerMap, DiagnosisOutput } from '../../modules/diagnosis/diagnosis.types';
import type { CompatibilityDecision, CompatibilityRiskType, PairCompatibilityResult } from '../../modules/knowledge/knowledge.types';
import { getSpeciesDisplayImage } from '../../lib/speciesVisual';
import type { TankCompatibilityStatus } from '../../lib/tankCompatibilityEngine';
import type { VisualResultStatus, VisualResultSubject, VisualResultViewModel } from './visual-result.types';

const riskTypeLabels: Record<CompatibilityRiskType, string> = {
  water_type: '水体冲突',
  temperature: '温度差异',
  ph: '水质差异',
  space: '空间压力',
  predation: '捕食风险',
  aggression: '追咬风险',
  territory: '领地冲突',
  bioload: '负载压力',
  group_size: '群体数量',
  equipment: '设备不足',
  unknown: '需要补充',
};

const compatibilityStatusLabels: Record<TankCompatibilityStatus, string> = {
  compatible: '暂未发现冲突',
  caution: '需要观察',
  not_recommended: '存在阻断风险',
  insufficient_data: '资料不足',
};

const riskKeywords: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /追咬|咬鳍|攻击/, label: '追咬风险' },
  { pattern: /捕食|吞食|体型/, label: '捕食风险' },
  { pattern: /淡水|海水|水体/, label: '水体冲突' },
  { pattern: /温度|水温/, label: '温度差异' },
  { pattern: /pH|酸性|碱性/, label: '水质差异' },
  { pattern: /空间|躲避|领地/, label: '空间压力' },
  { pattern: /缺氧|浮头|呼吸/, label: '供氧异常' },
];

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

export const getVisualEmphasis = (text: string) => unique(
  riskKeywords.filter(item => item.pattern.test(text)).map(item => item.label)
    .concat(riskKeywords.flatMap(item => text.match(item.pattern)?.[0] || [])),
).slice(0, 3);

const findPairForFocus = (pairs: PairCompatibilityResult[], focusId: string, otherId: string) => pairs.find(pair => (
  (pair.speciesA.id === focusId && pair.speciesB.id === otherId)
  || (pair.speciesB.id === focusId && pair.speciesA.id === otherId)
));

const getPairReason = (pair?: PairCompatibilityResult) => (
  pair?.primaryReason?.evidence || pair?.rawResult.summary || '当前组合暂未发现明确冲突。'
);

const getPairBadge = (pair?: PairCompatibilityResult) => (
  pair?.primaryReason?.riskType
    ? riskTypeLabels[pair.primaryReason.riskType]
    : compatibilityStatusLabels[pair?.status || 'compatible']
);

export function buildCompatibilityVisualResult({
  decision,
  species,
  primaryActionLabel,
  primaryActionType = 'mutation',
  focusSpeciesId,
}: {
  decision: CompatibilityDecision;
  species: Fish[];
  primaryActionLabel: string;
  primaryActionType?: VisualResultViewModel['primaryAction']['actionType'];
  focusSpeciesId?: string;
}): VisualResultViewModel {
  const primaryPair = decision.primaryConflict || decision.pairResults[0];
  const focus = species.find(item => item.id === focusSpeciesId)
    || primaryPair?.speciesB
    || species[species.length - 1];
  const focusReason = primaryPair ? getPairReason(primaryPair) : decision.summary;
  const related = species.filter(item => item.id !== focus?.id).map<VisualResultSubject>(item => {
    const pair = focus ? findPairForFocus(decision.pairResults, focus.id, item.id) : undefined;
    const reason = getPairReason(pair);
    return {
      id: item.id,
      name: item.name,
      image: getSpeciesDisplayImage(item),
      role: 'related',
      status: pair?.status || decision.status,
      shortReason: reason,
      badgeLabel: getPairBadge(pair),
      emphasis: getVisualEmphasis(reason),
    };
  });
  const subjects: VisualResultSubject[] = focus ? [{
    id: focus.id,
    name: focus.name,
    image: getSpeciesDisplayImage(focus),
    role: 'focus',
    status: decision.status,
    shortReason: focusReason,
    badgeLabel: '当前关注',
    emphasis: getVisualEmphasis(focusReason),
  }, ...related] : [];

  const riskRules = [...decision.blockingRules, ...decision.warningRules];
  const detailSections = [
    { id: 'risks', title: '风险与阻断', items: riskRules.map(rule => rule.evidence || rule.title) },
    { id: 'missing', title: '缺失信息', items: decision.missingData.map(rule => rule.evidence || rule.title) },
    { id: 'passed', title: '已通过规则', items: decision.passedRules.map(rule => rule.title) },
  ].filter(section => section.items.length > 0);

  return {
    status: decision.status,
    title: '混养判断',
    conclusion: focusReason || decision.summary,
    emphasis: getVisualEmphasis(focusReason || decision.summary),
    subjects,
    currentAction: decision.suggestions[0] || (
      decision.status === 'not_recommended' ? '先移除阻断对象，再重新计算组合。'
        : decision.status === 'insufficient_data' ? '先补充鱼缸信息，再决定是否加入。'
          : decision.status === 'caution' ? '少量加入，并持续观察追咬和进食。'
            : '可以少量加入，入缸后继续观察。'
    ),
    primaryAction: { label: primaryActionLabel, actionType: primaryActionType },
    detailSections,
  };
}

const diagnosisStatus = (riskLevel: DiagnosisOutput['riskLevel']): VisualResultStatus => {
  if (riskLevel === 'high') return 'urgent';
  if (riskLevel === 'medium') return 'watch';
  if (riskLevel === 'unknown') return 'insufficient_data';
  return 'routine';
};

const normalDiagnosisAnswers = new Set(['正常', '清澈', '没有泡沫或油膜', '没有异味', '正常游动和进食', '无', '没有']);
const diagnosisAnswerLabels: Record<string, string> = {
  breathing: '呼吸状态',
  waterLook: '水体外观',
  surfaceLook: '水面状态',
  odor: '气味变化',
  behavior: '鱼只行为',
  recentActions: '近期操作',
};

export function buildDiagnosisVisualResult({
  result,
  answers,
  aquariumName,
  livestock,
  primaryActionLabel,
  primaryActionType = 'mutation',
}: {
  result: DiagnosisOutput;
  answers: DiagnosisAnswerMap;
  aquariumName: string;
  livestock: Fish[];
  primaryActionLabel: string;
  primaryActionType?: VisualResultViewModel['primaryAction']['actionType'];
}): VisualResultViewModel {
  const status = diagnosisStatus(result.riskLevel);
  const abnormalAnswers = Object.entries(answers)
    .filter(([key, value]) => diagnosisAnswerLabels[key] && value && value !== '跳过' && !normalDiagnosisAnswers.has(value))
    .slice(0, 5);
  const focusFish = livestock[0];
  const subjects: VisualResultSubject[] = [{
    id: focusFish?.id || 'aquarium',
    name: focusFish?.name || aquariumName,
    image: focusFish ? getSpeciesDisplayImage(focusFish) : undefined,
    role: 'focus',
    status,
    shortReason: result.summary,
    badgeLabel: focusFish ? '重点观察' : '当前鱼缸',
    emphasis: getVisualEmphasis(result.summary),
  }, ...abnormalAnswers.map<VisualResultSubject>(([key, value]) => ({
    id: `answer-${key}`,
    name: diagnosisAnswerLabels[key],
    role: 'affected',
    status,
    shortReason: value,
    badgeLabel: value.length > 8 ? `${value.slice(0, 8)}…` : value,
    emphasis: getVisualEmphasis(value),
  }))];

  if (subjects.length === 1) {
    result.keyMetrics.slice(0, 3).forEach((metric, index) => subjects.push({
      id: `metric-${index}`,
      name: metric.label,
      role: 'affected',
      status,
      shortReason: metric.value,
      badgeLabel: metric.value,
    }));
  }

  return {
    status,
    title: '检查结果',
    conclusion: result.summary,
    emphasis: getVisualEmphasis(`${result.summary} ${result.currentAction}`),
    subjects,
    currentAction: result.currentAction || result.actions[0] || '保持环境稳定并继续观察。',
    primaryAction: { label: primaryActionLabel, actionType: primaryActionType },
    detailSections: [
      { id: 'actions', title: '立即处理', items: result.actions },
      { id: 'avoid', title: '暂时避免', items: result.avoidActions },
      { id: 'evidence', title: '判断依据', items: result.evidence },
      { id: 'causes', title: '可能原因', items: result.possibleCauses },
      { id: 'observe', title: '继续观察', items: result.observeItems },
      { id: 'missing', title: '缺失信息', items: result.missingInfo },
    ].filter(section => section.items.length > 0),
  };
}

export function mapFitStatus(status: string): VisualResultStatus {
  if (status === 'suitable' || status === 'alreadyInTank' || status === 'ok') return 'compatible';
  if (status === 'unknown' || status === 'needConfirmation' || status === 'info') return 'insufficient_data';
  if (status === 'unsuitable' || status === 'conflictRisk' || status === 'danger') return 'not_recommended';
  return 'caution';
}
