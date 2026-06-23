import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { fishData } from '../data/fishData';
import type { Aquarium, Fish } from '../types';
import { getCareTaxonomyPath } from '../modules/species/species.service';
import { getSpeciesDisplayImage, getSpeciesImageClass, getSpeciesImageSurfaceClass } from '../lib/speciesVisual';
import { getAquariumVolumeLiters, getCurrentLivestockForAquarium } from '../lib/speciesFitEngine';
import { evaluateTankCompatibility, type TankCompatibilityResult, type TankCompatibilityStatus } from '../lib/tankCompatibilityEngine';

const getDisplayImage = getSpeciesDisplayImage;

type CompatibilityRiskLevel = 'empty' | TankCompatibilityStatus;
type ResultModal = null | 'adjustment' | 'conflictDetail';
type SelectedCompatibilityItem = { species: Fish; quantity: number };
type SpeciesActionGroup = {
  keep: Fish[];
  remove: Fish[];
  existing: Fish[];
};

const parseNumericRange = (value: string) => {
  const normalized = value.replace(/－/g, '-').replace(/~|～|至|到/g, '-');
  const matches = normalized.match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return null;
  const numbers = matches.map(Number);
  if (numbers.length === 1) return { min: numbers[0], max: numbers[0] };
  return { min: Math.min(numbers[0], numbers[1]), max: Math.max(numbers[0], numbers[1]) };
};

const rangesOverlap = (a: ReturnType<typeof parseNumericRange>, b: ReturnType<typeof parseNumericRange>) => {
  if (!a || !b) return true;
  return Math.max(a.min, b.min) <= Math.min(a.max, b.max);
};

const getCompatibilityWaterType = (fish: Fish) => {
  const taxonomy = getCareTaxonomyPath(fish);
  const text = `${fish.category} ${taxonomy.waterType} ${taxonomy.variety}`;
  if (text.includes('海水') || text.includes('珊瑚') || text.includes('海葵')) return 'Saltwater';
  return 'Freshwater';
};

const getRiskMeta = (level: CompatibilityRiskLevel) => {
  switch (level) {
    case 'not_recommended':
      return { label: '不建议加入', tone: 'border-red-200 bg-red-50 text-red-600', iconTone: 'bg-red-500 text-white' };
    case 'caution':
      return { label: '谨慎尝试', tone: 'border-amber-200 bg-amber-50 text-amber-700', iconTone: 'bg-amber-500 text-white' };
    case 'insufficient_data':
      return { label: '信息不足', tone: 'border-sky-200 bg-sky-50 text-sky-700', iconTone: 'bg-sky-500 text-white' };
    case 'compatible':
      return { label: '适合', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', iconTone: 'bg-emerald-500 text-white' };
    default:
      return { label: '待添加', tone: 'border-border bg-white text-ink/55', iconTone: 'bg-bg text-ink/45' };
  }
};

const mapRulesToText = (rules: TankCompatibilityResult['blockingRules']) => rules.map(rule => rule.evidence || rule.title);

const getQuantity = (value?: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1;
};

const dedupeRules = (rules: TankCompatibilityResult['passedRules']) => {
  const seen = new Set<string>();
  return rules.filter(rule => {
    const key = `${rule.code}::${rule.title}::${rule.evidence}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getWorstStatus = (results: TankCompatibilityResult[]): TankCompatibilityStatus => {
  if (results.some(item => item.status === 'not_recommended')) return 'not_recommended';
  if (results.some(item => item.status === 'caution')) return 'caution';
  if (results.some(item => item.status === 'insufficient_data')) return 'insufficient_data';
  return 'compatible';
};

const mergeCompatibilityResults = (results: TankCompatibilityResult[], pairLabel: string): TankCompatibilityResult => {
  const status = getWorstStatus(results);
  const blockingRules = dedupeRules(results.flatMap(item => item.blockingRules));
  const warningRules = dedupeRules(results.flatMap(item => item.warningRules));
  const missingData = dedupeRules(results.flatMap(item => item.missingData));
  const passedRules = dedupeRules(results.flatMap(item => item.passedRules));
  const suggestions = Array.from(new Set(results.flatMap(item => item.suggestions))).slice(0, 5);
  const riskLevel = status === 'not_recommended'
    ? 'high'
    : status === 'insufficient_data'
      ? 'unknown'
      : status === 'caution'
        ? warningRules.some(rule => rule.severity === 'medium' || rule.severity === 'high') || blockingRules.length > 0 ? 'medium' : 'low'
        : 'none';
  const summary = status === 'not_recommended'
    ? blockingRules[0]?.evidence || `${pairLabel} 当前条件下不建议混养。`
    : status === 'insufficient_data'
      ? missingData[0]?.evidence || `${pairLabel} 资料不足，暂时无法可靠判断。`
      : status === 'caution'
        ? warningRules[0]?.evidence || `${pairLabel} 可以尝试，但需要先处理风险项。`
        : `${pairLabel} 当前条件下未发现明确阻断风险。`;

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
      ruleVersion: results[0]?.metadata.ruleVersion || 'tank-compatibility-v1',
      speciesDataVersion: results[0]?.metadata.speciesDataVersion || 'local-fish-data-v1',
      calculatedAt: new Date().toISOString(),
    },
  };
};

const calculateRisk = (items: SelectedCompatibilityItem[], tank?: Aquarium | null) => {
  if (items.length === 0) {
    return {
      level: 'empty' as CompatibilityRiskLevel,
      reasons: [],
      nextSteps: [],
      ruleResult: null as TankCompatibilityResult | null,
    };
  }

  if (items.length === 1) {
    return {
      level: 'empty' as CompatibilityRiskLevel,
      reasons: [],
      nextSteps: [],
      ruleResult: null as TankCompatibilityResult | null,
    };
  }

  const evaluations = items.map((item, index) => evaluateTankCompatibility({
    tank,
    existingSpecies: items
      .filter((_, itemIndex) => itemIndex !== index)
      .map(existing => ({ species: existing.species, record: { quantity: existing.quantity } })),
    candidateSpecies: item.species,
    candidateQuantity: item.quantity,
  }));
  const pairLabel = items.map(item => `${item.species.name}×${item.quantity}`).join(' × ');
  const ruleResult = mergeCompatibilityResults(evaluations, pairLabel);
  const level: CompatibilityRiskLevel = ruleResult.status;
  const reasons = [
    ...mapRulesToText(ruleResult.blockingRules),
    ...mapRulesToText(ruleResult.warningRules),
    ...mapRulesToText(ruleResult.missingData),
  ];

  return {
    level,
    reasons: level === 'compatible' ? ['当前组合未发现明显水质、体型或性情冲突。'] : reasons.slice(0, 5),
    nextSteps: ruleResult.suggestions,
    ruleResult,
  };
};

const getRiskConclusion = (level: CompatibilityRiskLevel, species: Fish[], reasons: string[]) => {
  if (species.length < 2) return '';
  if (level === 'not_recommended') return '当前条件下不建议加入，先移除阻断风险。';
  if (level === 'insufficient_data') return '信息不足，暂时无法可靠判断。';
  if (level === 'caution') return '可以尝试，但需要调整环境并观察。';
  return '可以尝试混养，入缸后继续观察。';
};

const getConflictTags = (species: Fish[], reasons: string[]) => {
  if (species.length < 2) return [];
  const tags = new Set<string>();
  if (species.some(item => item.housingMode === '建议单养')) tags.add('建议单养');
  if (new Set(species.map(getCompatibilityWaterType)).size > 1) tags.add('水体不兼容');
  reasons.forEach(reason => {
    if (reason.includes('水温')) tags.add('水温');
    if (reason.includes('pH')) tags.add('pH');
    if (reason.includes('体型') || reason.includes('大型') || reason.includes('小型')) tags.add('体型');
    if (reason.includes('性情') || reason.includes('攻击') || reason.includes('领地')) tags.add('性情');
    if (reason.includes('吞食') || reason.includes('捕食')) tags.add('捕食风险');
    if (reason.includes('空间') || reason.includes('躲避')) tags.add('空间需求');
  });
  return Array.from(tags).slice(0, 6);
};

const getMainConflicts = (result: ReturnType<typeof calculateRisk>, species: Fish[]) => {
  if (species.length < 2 || !result.ruleResult) return [];
  const ruleItems = [
    ...result.ruleResult.blockingRules,
    ...result.ruleResult.warningRules,
    ...result.ruleResult.missingData,
  ];
  const pair = species.map(item => item.name).join(' × ');
  return ruleItems.slice(0, 3).map((rule, index) => ({
    key: `${rule.code}-${index}`,
    pair,
    reason: rule.evidence || rule.title,
  }));
};

const getActionHints = (result: ReturnType<typeof calculateRisk>, species: Fish[]) => {
  const level = result.level;
  if (result.ruleResult?.suggestions.length) return result.ruleResult.suggestions.slice(0, 3);
  if (level === 'not_recommended') {
    const single = species.find(item => item.housingMode === '建议单养');
    const aggressive = species.find(item => item.temperament === 'Aggressive');
    const removeName = single?.name || aggressive?.name || species[species.length - 1]?.name;
    return [
      removeName ? `优先移除 ${removeName}，重新计算组合。` : '先移除高风险对象，重新计算组合。',
      '建议把单养或攻击性强的生物单独开缸。',
      '新生物入缸前隔离观察 7 天。',
    ];
  }
  if (level === 'caution' || level === 'insufficient_data') {
    return [
      '增加水草、沉木或石缝，降低追逐压力。',
      '确认水温和 pH 有交集后再入缸。',
      '前 48 小时观察追咬、拒食和抢食。',
    ];
  }
  return [
    '先少量加入，观察 3-7 天。',
    '保持稳定换水和过滤，不要一次加入过多生物。',
  ];
};

const getSpeciesActionGroups = (
  result: ReturnType<typeof calculateRisk>,
  species: Fish[],
  currentQuantityBySpeciesId: Record<string, number>
): SpeciesActionGroup => {
  const existing = species.filter(item => currentQuantityBySpeciesId[item.id]);
  const candidateSpecies = species.filter(item => !currentQuantityBySpeciesId[item.id]);

  if (result.level !== 'not_recommended') {
    return {
      keep: candidateSpecies,
      remove: [],
      existing,
    };
  }

  const ruleText = [
    ...(result.ruleResult?.blockingRules || []),
    ...(result.ruleResult?.warningRules || []),
  ].map(rule => `${rule.title} ${rule.evidence}`).join(' ');
  const namedRiskSpecies = candidateSpecies.filter(item => ruleText.includes(item.name));
  const remove = namedRiskSpecies.length > 0
    ? namedRiskSpecies
    : candidateSpecies.length > 0
      ? [candidateSpecies[candidateSpecies.length - 1]]
      : species.slice(-1);
  const removeIds = new Set(remove.map(item => item.id));

  return {
    keep: candidateSpecies.filter(item => !removeIds.has(item.id)),
    remove,
    existing: existing.filter(item => !removeIds.has(item.id)),
  };
};

const getConflictType = (reason: string) => {
  if (reason.includes('水体')) return '水体类型';
  if (reason.includes('pH')) return '水质差异';
  if (reason.includes('水温')) return '温度差异';
  if (reason.includes('性情') || reason.includes('追咬') || reason.includes('攻击')) return '攻击性';
  if (reason.includes('体型') || reason.includes('捕食') || reason.includes('吞食')) return '捕食风险';
  if (reason.includes('空间') || reason.includes('躲避') || reason.includes('领地')) return '空间竞争';
  return '混养条件';
};

const getRiskExplanation = (tags: string[], reasons: string[]) => {
  if (reasons.length === 0) return '当前组合未发现明显冲突，但仍建议先少量加入并观察。';
  const tagText = tags.length > 0 ? tags.slice(0, 4).join('、') : '水质、空间或性情';
  return `当前组合主要涉及${tagText}等因素。系统会综合水温、pH、体型、性情、入缸顺序和躲避空间判断风险。`;
};

function CompatibilityBottomSheet({
  activeModal,
  onClose,
  result,
  meta,
  riskConclusion,
  conflictTags,
  mainConflicts,
  actionHints,
  selectedSpecies,
  onAccept,
  onEdit,
}: {
  activeModal: ResultModal;
  onClose: () => void;
  result: ReturnType<typeof calculateRisk>;
  meta: ReturnType<typeof getRiskMeta>;
  riskConclusion: string;
  conflictTags: string[];
  mainConflicts: ReturnType<typeof getMainConflicts>;
  actionHints: string[];
  selectedSpecies: Fish[];
  onAccept: () => void;
  onEdit: () => void;
}) {
  if (!activeModal) return null;

  const isAdjustment = activeModal === 'adjustment';
  const fallbackConflict = {
    key: 'summary-conflict',
    pair: selectedSpecies.map(item => item.name).join(' × ') || '当前组合',
    reason: result.reasons[0] || '未发现明显对象冲突，仍建议少量加入并观察。',
  };
  const conflicts = mainConflicts.length > 0 ? mainConflicts : [fallbackConflict];
  const primaryConflict = conflicts[0];
  const sheetTitle = isAdjustment ? '调整建议' : '混养提醒';

  return (
    <div className="fixed inset-0 z-[230] flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
        aria-label="关闭弹窗"
        onClick={onClose}
      />
      <section
        className="relative z-10 flex max-h-[85dvh] min-h-[70dvh] w-full max-w-[430px] animate-[compatSheetUp_180ms_ease-out] flex-col overflow-hidden rounded-t-[24px] bg-bg shadow-2xl"
        onPointerDown={(event) => {
          const startY = event.clientY;
          const handleMove = (moveEvent: PointerEvent) => {
            if (moveEvent.clientY - startY > 90) {
              onClose();
              window.removeEventListener('pointermove', handleMove);
            }
          };
          const handleUp = () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
          };
          window.addEventListener('pointermove', handleMove);
          window.addEventListener('pointerup', handleUp);
        }}
      >
        <div className="shrink-0 border-b border-white bg-white px-4 pb-3 pt-2">
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-ink/12" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[18px] font-black text-ink">{sheetTitle}</h3>
              <p className="mt-0.5 text-[11px] font-bold text-ink/45">{isAdjustment ? '只看现在能做什么。' : '看清是哪组生物需要谨慎。'}</p>
            </div>
            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-bg text-ink/55">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="app-scrollbar-hidden min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 pb-24">
          {isAdjustment ? (
            <div className="grid gap-3">
              <section className={`rounded-[18px] border p-3 ${meta.tone}`}>
                <div className="text-[10px] font-black opacity-65">当前结论</div>
                <div className="mt-1 text-[15px] font-black">{meta.label}：{riskConclusion}</div>
              </section>
              <section className="rounded-[18px] bg-white p-3 shadow-sm">
                <div className="text-[13px] font-black text-ink">为什么有风险</div>
                <p className="mt-2 text-[12px] font-medium leading-relaxed text-ink/64">{getRiskExplanation(conflictTags, result.reasons)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {conflictTags.length > 0 ? conflictTags.map(tag => (
                    <span key={tag} className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">{tag}</span>
                  )) : <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">基础匹配</span>}
                </div>
              </section>
              <section className="rounded-[18px] bg-white p-3 shadow-sm">
                <div className="text-[13px] font-black text-ink">建议怎么调整</div>
                <div className="mt-2 grid gap-2">
                  {actionHints.map(step => (
                    <div key={step} className="rounded-[14px] bg-emerald-50 px-3 py-2 text-[12px] font-bold leading-relaxed text-emerald-900">{step}</div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="grid gap-3">
              {conflicts.map(conflict => (
                <section key={conflict.key} className="rounded-[18px] bg-white p-3 shadow-sm">
                  <div className="text-[10px] font-black text-ink/42">提醒对象</div>
                  <div className="mt-1 text-[15px] font-black text-ink">{conflict.pair}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-[14px] bg-bg px-3 py-2">
                      <div className="text-[10px] font-black text-ink/42">为什么提醒</div>
                      <div className="mt-1 text-[12px] font-black text-ink">{getConflictType(conflict.reason)}</div>
                    </div>
                    <div className={`rounded-[14px] border px-3 py-2 ${meta.tone}`}>
                      <div className="text-[10px] font-black opacity-60">风险等级</div>
                      <div className="mt-1 text-[12px] font-black">{meta.label}</div>
                    </div>
                  </div>
                  <p className="mt-2 rounded-[14px] bg-bg px-3 py-2 text-[12px] font-medium leading-relaxed text-ink/64">{conflict.reason}</p>
                </section>
              ))}
              <section className="rounded-[18px] bg-white p-3 shadow-sm">
                <div className="text-[13px] font-black text-ink">现在怎么做</div>
                <div className="mt-2 grid gap-2">
                  {actionHints.slice(0, 3).map(step => (
                    <div key={step} className="rounded-[14px] bg-emerald-50 px-3 py-2 text-[12px] font-bold leading-relaxed text-emerald-900">{step}</div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="modalFooter fixed bottom-0 left-1/2 z-20 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-2 gap-2 border-t border-white bg-white/95 backdrop-blur">
          <button type="button" onClick={onAccept} className="rounded-full bg-emerald-700 text-[13px] font-black text-white">
            我知道了
          </button>
          <button type="button" onClick={onEdit} className="rounded-full border border-border bg-white text-[13px] font-black text-ink/62">
            返回修改组合
          </button>
        </div>
      </section>
      <style>{`
        @keyframes compatSheetUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

type CompatibilityRiskCalculatorProps = {
  speciesIds?: string[];
  onSpeciesIdsChange?: (ids: string[]) => void;
  onBrowseAtlas?: () => void;
  preferredSpeciesIds?: string[];
  aquariums?: Aquarium[];
  activeAquariumId?: string;
};

const commonPreviewNames = ['红绿灯', '宝莲灯', '黑壳虾', '极火虾', '斑马螺', '咖啡鼠', '白云金丝', '孔雀鱼'];

const getCommonPreviewSpecies = () => (
  commonPreviewNames
    .map(name => fishData.find(fish => fish.name === name) || fishData.find(fish => fish.name.includes(name)))
    .filter((fish): fish is Fish => Boolean(fish))
);

const getAquariumLabel = (aquarium?: Aquarium | null) => {
  if (!aquarium) return '未选择鱼缸';
  const volume = getAquariumVolumeLiters(aquarium);
  return `${aquarium.name || '我的鱼缸'} · ${volume ? `${volume}L` : '容量待补充'} · ${aquarium.waterType === 'Saltwater' ? '海水' : '淡水'}`;
};

export function CompatibilityRiskCalculator({
  speciesIds,
  onSpeciesIdsChange,
  onBrowseAtlas,
  preferredSpeciesIds = [],
  aquariums = [],
  activeAquariumId = '',
}: CompatibilityRiskCalculatorProps = {}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalSpeciesIds, setInternalSpeciesIds] = useState<string[]>([]);
  const [resultFeedback, setResultFeedback] = useState('');
  const [activeModal, setActiveModal] = useState<ResultModal>(null);
  const [selectedAquariumId, setSelectedAquariumId] = useState(activeAquariumId || aquariums[0]?.id || '');
  const [showRuleDetails, setShowRuleDetails] = useState(false);
  const activeSpeciesIds = speciesIds ?? internalSpeciesIds;
  const [selectedQuantitiesById, setSelectedQuantitiesById] = useState<Record<string, number>>({});
  const selectedAquarium = useMemo(() => (
    aquariums.find(aquarium => aquarium.id === (selectedAquariumId || activeAquariumId))
    || aquariums.find(aquarium => aquarium.id === activeAquariumId)
    || aquariums[0]
    || null
  ), [activeAquariumId, aquariums, selectedAquariumId]);
  const currentLivestock = useMemo(() => getCurrentLivestockForAquarium(selectedAquarium, fishData), [selectedAquarium]);
  const currentQuantityBySpeciesId = useMemo(() => currentLivestock.reduce<Record<string, number>>((next, item) => {
    if (item.species?.id) next[item.species.id] = getQuantity(item.record?.quantity);
    return next;
  }, {}), [currentLivestock]);
  const missingLivestockCount = useMemo(() => {
    if (!selectedAquarium?.fishes?.length) return 0;
    return selectedAquarium.fishes.filter(item => !fishData.some(fish => fish.id === item.fishId)).length;
  }, [selectedAquarium]);
  const updateSpeciesIds = (updater: string[] | ((prev: string[]) => string[])) => {
    const next = typeof updater === 'function' ? updater(activeSpeciesIds) : updater;
    if (onSpeciesIdsChange) onSpeciesIdsChange(next);
    else setInternalSpeciesIds(next);
  };

  const selectedSpecies = useMemo(
    () => activeSpeciesIds.map(id => fishData.find(fish => fish.id === id)).filter(Boolean) as Fish[],
    [activeSpeciesIds]
  );
  const selectedItems = useMemo(() => selectedSpecies.map(species => ({
    species,
    quantity: selectedQuantitiesById[species.id] || currentQuantityBySpeciesId[species.id] || 1,
  })), [currentQuantityBySpeciesId, selectedQuantitiesById, selectedSpecies]);
  const result = useMemo(() => calculateRisk(selectedItems, selectedAquarium), [selectedAquarium, selectedItems]);
  const meta = getRiskMeta(result.level);
  const riskConclusion = getRiskConclusion(result.level, selectedSpecies, result.reasons);
  const conflictTags = getConflictTags(selectedSpecies, result.reasons);
  const mainConflicts = useMemo(() => getMainConflicts(result, selectedSpecies), [result, selectedSpecies]);
  const actionHints = useMemo(() => getActionHints(result, selectedSpecies), [result, selectedSpecies]);
  const speciesActionGroups = useMemo(
    () => getSpeciesActionGroups(result, selectedSpecies, currentQuantityBySpeciesId),
    [currentQuantityBySpeciesId, result, selectedSpecies]
  );
  const ruleEvidence = useMemo(() => {
    const ruleResult = result.ruleResult;
    if (!ruleResult) return null;
    return {
      passed: ruleResult.passedRules.slice(0, 3),
      risks: [...ruleResult.blockingRules, ...ruleResult.warningRules].slice(0, 3),
      missing: ruleResult.missingData.slice(0, 3),
    };
  }, [result.ruleResult]);
  const commonPreviewSpecies = useMemo(() => {
    if (selectedAquarium) {
      const ownedIds = new Set(currentLivestock.map(item => item.species?.id).filter(Boolean));
      const evaluated = fishData
        .filter(fish => !activeSpeciesIds.includes(fish.id))
        .filter(fish => !ownedIds.has(fish.id))
        .map(fish => ({
          fish,
          evaluation: evaluateTankCompatibility({
            tank: selectedAquarium,
            existingSpecies: currentLivestock.map(item => ({
              species: item.species,
              record: { quantity: item.record.quantity },
            })),
            candidateSpecies: fish,
            candidateQuantity: 1,
          }),
        }))
        .filter(item => item.evaluation.status !== 'not_recommended')
        .sort((a, b) => {
          const rank = { compatible: 0, caution: 1, insufficient_data: 2, not_recommended: 3 } as Record<TankCompatibilityStatus, number>;
          return rank[a.evaluation.status] - rank[b.evaluation.status] || a.fish.name.localeCompare(b.fish.name, 'zh-Hans-CN');
        })
        .map(item => item.fish)
        .slice(0, 8);
      if (evaluated.length > 0) return evaluated;
    }
    const preferredSpecies = Array.from(new Set(preferredSpeciesIds))
      .map(id => fishData.find(fish => fish.id === id))
      .filter((fish): fish is Fish => Boolean(fish))
      .filter(fish => !activeSpeciesIds.includes(fish.id));
    const fallbackSpecies = getCommonPreviewSpecies()
      .filter(fish => !activeSpeciesIds.includes(fish.id))
      .filter(fish => !preferredSpecies.some(item => item.id === fish.id));
    return (preferredSpecies.length > 0 ? preferredSpecies : fallbackSpecies).slice(0, 8);
  }, [activeSpeciesIds, currentLivestock, preferredSpeciesIds, selectedAquarium]);
  const selectedCount = selectedSpecies.length;
  const statusLabel = selectedCount === 0
    ? '未开始'
    : selectedCount === 1
      ? '待添加'
      : meta.label;
  const selectedTitle = selectedCount < 2 ? `已选生物 ${selectedCount}/2` : `已选生物 ${selectedCount} 种`;
  const selectedHint = selectedCount === 0
    ? '还没有添加生物。'
    : selectedCount === 1
      ? '还需 1 种生物。'
      : '已满足计算条件。';
  const searchResults = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return [];
    return fishData
      .filter(fish => !activeSpeciesIds.includes(fish.id))
      .filter(fish => (
        fish.name.toLowerCase().includes(keyword)
        || fish.scientificName.toLowerCase().includes(keyword)
        || fish.category.toLowerCase().includes(keyword)
      ))
      .slice(0, 6);
  }, [searchTerm, activeSpeciesIds]);

  const addSpecies = (fish: Fish) => {
    updateSpeciesIds(prev => prev.includes(fish.id) ? prev : [...prev, fish.id]);
    setSelectedQuantitiesById(prev => prev[fish.id] ? prev : { ...prev, [fish.id]: 1 });
    setSearchTerm('');
  };
  const importAquariumLivestock = () => {
    const livestockIds = currentLivestock.map(item => item.species?.id).filter(Boolean) as string[];
    updateSpeciesIds(prev => Array.from(new Set([...prev, ...livestockIds])));
    setSelectedQuantitiesById(prev => {
      const next = { ...prev };
      currentLivestock.forEach(item => {
        if (item.species?.id) next[item.species.id] = getQuantity(item.record?.quantity);
      });
      return next;
    });
    setResultFeedback(livestockIds.length > 0
      ? `已导入 ${getAquariumLabel(selectedAquarium)} 的 ${livestockIds.length} 种活体。`
      : '当前鱼缸暂无可导入的活体生物。');
  };
  const handlePrimaryResultAction = () => {
    if (result.level === 'not_recommended') {
      updateSpeciesIds([]);
      setSelectedQuantitiesById({});
      setResultFeedback('已返回重新选择，可以重新搜索搭配对象。');
      return;
    }
    if (result.level === 'caution' || result.level === 'insufficient_data') {
      setActiveModal('adjustment');
      return;
    }
    setResultFeedback('当前暂不支持从混养计算直接批量加入，请回到图鉴详情逐个确认添加。');
  };
  const handleSecondaryResultAction = () => {
    if (result.level === 'compatible') return;
    setActiveModal('conflictDetail');
  };

  return (
    <>
    <section className="page-frame overflow-hidden rounded-[18px] border border-border bg-white shadow-sm">
      <div className={`border-b px-4 py-4 ${meta.tone}`}>
        <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.iconTone}`}>
            {result.level === 'compatible' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[14px] font-black text-ink">混养风险计算</h2>
            <p className="text-[10px] font-medium text-ink/50">添加 2 种以上生物，系统会判断是否适合同缸。</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-current/20 bg-white/70 px-2.5 py-1 text-[11px] font-black">
          {statusLabel}
        </span>
        </div>
        {selectedCount >= 2 && (
          <div className="mt-3 rounded-[14px] bg-white/75 px-3 py-2">
            <div className="text-[10px] font-black opacity-60">结论 · 当前已选 {selectedCount} 种</div>
            <p className="mt-1 text-[14px] font-black leading-snug text-ink">{riskConclusion}</p>
          </div>
        )}
      </div>

      <div className="grid gap-3 p-3 pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)] lg:items-start">
        <section className="rounded-[16px] bg-white/75 p-3 lg:col-start-1">
          <div className="mb-3 rounded-[16px] border border-emerald-100 bg-emerald-50/45 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-black text-ink">按鱼缸计算</div>
                <div className="mt-0.5 text-[10px] font-bold text-ink/45">导入真实缸内活体，不会修改鱼缸数据。</div>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-emerald-700">
                {currentLivestock.length} 种活体
              </span>
            </div>
            {aquariums.length > 1 ? (
              <label className="mt-2 flex h-10 items-center gap-2 rounded-[13px] bg-white px-3 text-[11px] font-black text-ink/70">
                <span className="shrink-0 text-ink/42">鱼缸</span>
                <select
                  value={selectedAquarium?.id || ''}
                  onChange={(event) => setSelectedAquariumId(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-[12px] font-black outline-none"
                >
                  {aquariums.map(aquarium => (
                    <option key={aquarium.id} value={aquarium.id}>{getAquariumLabel(aquarium)}</option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-ink/35" />
              </label>
            ) : (
              <div className="mt-2 rounded-[13px] bg-white px-3 py-2 text-[11px] font-bold text-ink/58">{getAquariumLabel(selectedAquarium)}</div>
            )}
            {currentLivestock.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {currentLivestock.slice(0, 6).map(item => (
                  <span key={item.species?.id || item.record?.fishId || item.species?.name} className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-ink/62">
                    {item.species?.name || '未知生物'} × {item.record?.quantity || 1}
                  </span>
                ))}
                {currentLivestock.length > 6 && <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-ink/42">+{currentLivestock.length - 6}</span>}
              </div>
            ) : (
              <div className="mt-2 rounded-[13px] bg-white px-3 py-2 text-[11px] font-bold text-ink/45">
                当前鱼缸暂无活体，推荐会使用新手友好候选。
              </div>
            )}
            {missingLivestockCount > 0 && (
              <div className="mt-2 text-[10px] font-bold text-amber-700">
                有 {missingLivestockCount} 条旧记录缺少图鉴数据，已跳过。
              </div>
            )}
            <button
              type="button"
              onClick={importAquariumLivestock}
              disabled={currentLivestock.length === 0}
              className="mt-3 h-10 w-full rounded-full bg-emerald-700 text-[12px] font-black text-white disabled:bg-ink/10 disabled:text-ink/35"
            >
              导入该鱼缸生物计算
            </button>
          </div>
          <div className="mb-2 text-[12px] font-black text-ink">添加生物</div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/45" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索并加入要混养的生物"
              className="h-10 rounded-[14px] border-amber-200 bg-white pl-8 text-[12px] font-medium text-ink placeholder:text-ink/40"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 grid grid-cols-1 gap-1.5">
              {searchResults.map(fish => {
                const taxonomy = getCareTaxonomyPath(fish);
                return (
                  <button
                    key={fish.id}
                    type="button"
                    onClick={() => addSpecies(fish)}
                    className="grid min-h-[54px] grid-cols-[44px_1fr_auto] items-center gap-2 rounded-[14px] border border-amber-100 bg-white px-2 py-1.5 text-left transition-colors hover:border-amber-300"
                  >
                    <span className="flex h-10 w-10 items-center justify-center overflow-visible rounded-full">
                      <img src={getDisplayImage(fish)} alt={fish.name} className={`max-h-9 max-w-10 object-contain ${getSpeciesImageClass(fish)}`} referrerPolicy="no-referrer" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-black text-ink">{fish.name}</span>
                      <span className="block truncate text-[10px] font-medium text-ink/45">
                        {taxonomy.temperatureBand} · {taxonomy.size} · {fish.housingMode || '混养待评估'}
                      </span>
                    </span>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">加入</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <div className="text-[12px] font-black text-ink">推荐候选</div>
                <div className="mt-0.5 text-[10px] font-bold text-ink/42">根据当前鱼缸和缸内生物筛选，点卡片加入计算。</div>
              </div>
            </div>
            <div className="relative -mx-3 min-w-0 max-w-[calc(100vw-32px)] overflow-hidden">
              <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-white/75 to-transparent" />
              <div className="app-scrollbar-hidden flex w-full min-w-0 snap-x snap-mandatory gap-2 overflow-x-scroll overflow-y-hidden overscroll-x-contain px-3 pb-1 pr-10 touch-pan-x [-webkit-overflow-scrolling:touch] lg:grid lg:grid-cols-[repeat(auto-fit,minmax(82px,1fr))] lg:overflow-visible lg:pr-3">
              {commonPreviewSpecies.map(fish => {
                const taxonomy = getCareTaxonomyPath(fish);
                return (
                  <button
                    key={fish.id}
                    type="button"
                    onClick={() => addSpecies(fish)}
                    className="grid w-[82px] shrink-0 snap-start gap-1 rounded-[14px] border border-transparent bg-transparent p-1 text-left transition-colors hover:border-emerald-100 hover:bg-emerald-50/40"
                    aria-label={`加入${fish.name}到混养计算`}
                  >
                    <span className={`flex h-[58px] w-full items-center justify-center overflow-visible rounded-[13px] ${getSpeciesImageSurfaceClass(fish)}`}>
                      <img
                        src={getDisplayImage(fish)}
                        alt={fish.name}
                        className={`max-h-[54px] max-w-[78px] object-contain ${getSpeciesImageClass(fish)}`}
                        referrerPolicy="no-referrer"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-black text-ink">{fish.name}</span>
                      <span className="mt-0.5 block truncate text-[9px] font-bold text-ink/42">
                        {taxonomy.size} · {fish.housingMode || '可评估'}
                      </span>
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={onBrowseAtlas}
                className="flex w-[82px] shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-emerald-200 bg-emerald-50/65 p-2 text-center text-emerald-800 shadow-sm"
                aria-label="浏览更多图鉴"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/75 text-emerald-700 shadow-sm">
                  <ChevronRight className="h-5 w-5" />
                </span>
                <span className="text-[12px] font-black leading-tight">更多</span>
                <span className="text-[9px] font-bold leading-tight text-emerald-900/58">浏览图鉴</span>
              </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[16px] bg-white/75 p-3 lg:col-start-2 lg:row-start-1">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <div className="text-[12px] font-black text-ink">{selectedTitle}</div>
                <div className={`mt-0.5 text-[10px] font-bold ${selectedCount >= 2 ? 'text-emerald-700' : 'text-ink/42'}`}>{selectedHint}</div>
              </div>
              {selectedSpecies.length > 0 && (
                <button type="button" onClick={() => {
                  updateSpeciesIds([]);
                  setSelectedQuantitiesById({});
                }} className="text-[10px] font-bold text-ink/45 hover:text-ink">
                  清空
                </button>
              )}
            </div>
            {selectedSpecies.length === 0 ? (
              <div className="rounded-[14px] bg-bg px-3 py-4 text-center">
                <div className="text-[12px] font-black text-ink/55">还没有添加生物。</div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedSpecies.map(fish => (
                  <div key={fish.id} className="relative flex min-w-0 max-w-full items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/40 py-1 pl-1.5 pr-8">
                    <button
                      type="button"
                      aria-label={`移除${fish.name}`}
                      onClick={() => {
                        updateSpeciesIds(prev => prev.filter(id => id !== fish.id));
                        setSelectedQuantitiesById(prev => {
                          const next = { ...prev };
                          delete next[fish.id];
                          return next;
                        });
                      }}
                      className="absolute right-1.5 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-ink/40 shadow-sm hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="flex h-9 w-10 shrink-0 items-center justify-center overflow-visible">
                      <img src={getDisplayImage(fish)} alt={fish.name} className={`max-h-8 max-w-10 object-contain ${getSpeciesImageClass(fish)}`} referrerPolicy="no-referrer" />
                    </div>
                    <div className="truncate text-[11px] font-black text-ink/72">{fish.name}</div>
                  </div>
                ))}
              </div>
            )}
        </section>

        <section className={selectedCount >= 2 ? `rounded-[16px] border p-3 lg:col-span-2 ${meta.tone}` : 'rounded-[16px] bg-bg px-3 py-3 lg:col-span-2'}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[12px] font-black">计算结果</span>
            <span className="text-[10px] font-bold opacity-70">{selectedCount} 种生物</span>
          </div>
          {selectedCount < 2 ? (
            <div className="text-[11px] font-bold text-ink/45">添加 2 种以上生物后显示风险结果。</div>
          ) : (
            <>
              <div className="mb-3 rounded-[14px] bg-white/78 px-3 py-3">
                <div className="text-[10px] font-black opacity-60">结论卡</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-[11px] font-black ${meta.tone}`}>
                    {meta.label}
                  </span>
                  <span className="text-[13px] font-black text-ink">{riskConclusion}</span>
                </div>
                <p className="mt-2 text-[12px] font-bold leading-relaxed text-ink/64">
                  {result.level === 'not_recommended'
                    ? `当前组合有 ${Math.max(mainConflicts.length, 1)} 个明显冲突对象，建议先重新选择。`
                    : result.level === 'caution'
                      ? '先调整空间、躲避物和入缸顺序，再考虑尝试。'
                      : result.level === 'insufficient_data'
                        ? '当前资料不足，先补充鱼缸和物种信息后再判断。'
                        : '条件接近，可以少量加入并观察。'}
                </p>
              </div>

              {resultFeedback && (
                <div className="mb-3 rounded-[12px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700">
                  {resultFeedback}
                </div>
              )}

              <div className="mb-3 rounded-[16px] bg-white/78 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[12px] font-black text-ink">下一步处理</div>
                    <div className="text-[10px] font-bold text-ink/42">先处理生物组合，再看详细依据。</div>
                  </div>
                  {conflictTags.length > 0 && (
                    <div className="flex max-w-[52%] flex-wrap justify-end gap-1">
                      {conflictTags.slice(0, 3).map(item => (
                        <span key={item} className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-black text-amber-700">
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {speciesActionGroups.remove.length > 0 && (
                  <div className="mb-2 rounded-[14px] border border-red-100 bg-red-50/80 p-2.5">
                    <div className="mb-2 text-[10px] font-black text-red-600">建议先移除 / 更换</div>
                    <div className="flex flex-wrap gap-2">
                      {speciesActionGroups.remove.map(fish => (
                        <div key={fish.id} className="flex items-center gap-2 rounded-full bg-white py-1 pl-1.5 pr-2 shadow-sm">
                          <span className="flex h-8 w-8 items-center justify-center overflow-visible rounded-full bg-red-50">
                            <img src={getDisplayImage(fish)} alt={fish.name} className={`max-h-7 max-w-8 object-contain ${getSpeciesImageClass(fish)}`} referrerPolicy="no-referrer" />
                          </span>
                          <span className="max-w-[92px] truncate text-[11px] font-black text-ink">{fish.name}</span>
                          <button
                            type="button"
                            aria-label={`从混养计算移除${fish.name}`}
                            onClick={() => {
                              updateSpeciesIds(prev => prev.filter(id => id !== fish.id));
                              setSelectedQuantitiesById(prev => {
                                const next = { ...prev };
                                delete next[fish.id];
                                return next;
                              });
                              setResultFeedback(`已从组合中移除 ${fish.name}。`);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {speciesActionGroups.keep.length > 0 && (
                  <div className="mb-2 rounded-[14px] border border-emerald-100 bg-emerald-50/80 p-2.5">
                    <div className="mb-2 text-[10px] font-black text-emerald-700">可保留的新增物种</div>
                    <div className="flex flex-wrap gap-2">
                      {speciesActionGroups.keep.map(fish => (
                        <div key={fish.id} className="flex items-center gap-2 rounded-full bg-white py-1 pl-1.5 pr-3 shadow-sm">
                          <span className="flex h-8 w-8 items-center justify-center overflow-visible rounded-full bg-emerald-50">
                            <img src={getDisplayImage(fish)} alt={fish.name} className={`max-h-7 max-w-8 object-contain ${getSpeciesImageClass(fish)}`} referrerPolicy="no-referrer" />
                          </span>
                          <span className="max-w-[108px] truncate text-[11px] font-black text-ink">{fish.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {speciesActionGroups.existing.length > 0 && (
                  <div className="rounded-[14px] border border-border/70 bg-bg/70 p-2.5">
                    <div className="mb-2 text-[10px] font-black text-ink/45">缸内原有物种</div>
                    <div className="flex flex-wrap gap-2">
                      {speciesActionGroups.existing.map(fish => (
                        <div key={fish.id} className="flex items-center gap-2 rounded-full bg-white/85 py-1 pl-1.5 pr-3">
                          <span className="flex h-8 w-8 items-center justify-center overflow-visible rounded-full bg-bg">
                            <img src={getDisplayImage(fish)} alt={fish.name} className={`max-h-7 max-w-8 object-contain ${getSpeciesImageClass(fish)}`} referrerPolicy="no-referrer" />
                          </span>
                          <span className="max-w-[108px] truncate text-[11px] font-black text-ink/62">{fish.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {actionHints.length > 0 && (
                  <div className="mt-3 rounded-[12px] bg-white/70 px-3 py-2 text-[11px] font-bold leading-relaxed text-ink/62">
                    {actionHints[0]}
                  </div>
                )}
              </div>

              {ruleEvidence && (
                <div className="mb-3 overflow-hidden rounded-[14px] border border-white/70 bg-white/45 backdrop-blur">
                  <button
                    type="button"
                    onClick={() => setShowRuleDetails(prev => !prev)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                  >
                    <span>
                      <span className="block text-[11px] font-black text-ink/55">具体判定依据</span>
                      <span className="block text-[9px] font-bold text-ink/35">半透明折叠显示，AI 仅负责解释</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 text-ink/35 transition-transform ${showRuleDetails ? 'rotate-180' : ''}`} />
                  </button>

                  {showRuleDetails && (
                    <div className="grid gap-2 border-t border-white/70 px-3 pb-3 pt-2">
                      {ruleEvidence.risks.length > 0 && (
                        <div className="rounded-[12px] border border-amber-100 bg-amber-50/60 px-2.5 py-2">
                          <div className="text-[11px] font-black text-amber-700">风险 / 阻断规则</div>
                          <div className="mt-1 space-y-1">
                            {ruleEvidence.risks.map(rule => (
                              <p key={`${rule.code}-${rule.title}`} className="line-clamp-2 text-[10px] font-medium leading-relaxed text-ink/62">{rule.evidence || rule.title}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {ruleEvidence.missing.length > 0 && (
                        <div className="rounded-[12px] border border-sky-100 bg-sky-50/60 px-2.5 py-2">
                          <div className="text-[11px] font-black text-sky-700">缺失信息</div>
                          <div className="mt-1 space-y-1">
                            {ruleEvidence.missing.map(rule => (
                              <p key={`${rule.code}-${rule.title}`} className="line-clamp-2 text-[10px] font-medium leading-relaxed text-ink/62">{rule.evidence || rule.title}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {ruleEvidence.passed.length > 0 && (
                        <div className="rounded-[12px] border border-emerald-100 bg-emerald-50/60 px-2.5 py-2">
                          <div className="text-[11px] font-black text-emerald-700">已通过规则</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {ruleEvidence.passed.map(rule => (
                              <span key={`${rule.code}-${rule.title}`} className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-emerald-700">{rule.title}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(mainConflicts.length > 0 ? mainConflicts : []).map(conflict => (
                        <div key={conflict.key} className="rounded-[12px] border border-border/70 bg-white/75 px-2.5 py-2">
                          <div className="text-[11px] font-black text-ink">{conflict.pair}</div>
                          <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-relaxed text-ink/62">{conflict.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className={`mt-3 grid gap-2 ${result.level === 'compatible' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <button
                  type="button"
                  onClick={handlePrimaryResultAction}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-black transition-colors ${
                    result.level === 'not_recommended'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : result.level === 'caution' || result.level === 'insufficient_data'
                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                        : 'bg-emerald-700 text-white hover:bg-emerald-800'
                  }`}
                >
                  {result.level === 'compatible' ? '加入当前鱼缸' : result.level === 'not_recommended' ? '重新选择' : '查看调整建议'}
                </button>
                {result.level !== 'compatible' && (
                  <button
                    type="button"
                    onClick={handleSecondaryResultAction}
                    className="rounded-full bg-white/75 px-3 py-1.5 text-center text-[11px] font-black text-ink/65 transition-colors hover:bg-white"
                  >
                    查看混养提醒
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </section>
    <CompatibilityBottomSheet
      activeModal={activeModal}
      onClose={() => setActiveModal(null)}
      result={result}
      meta={meta}
      riskConclusion={riskConclusion}
      conflictTags={conflictTags}
      mainConflicts={mainConflicts}
      actionHints={actionHints}
      selectedSpecies={selectedSpecies}
      onAccept={() => {
        setActiveModal(null);
        setResultFeedback('已确认混养提醒，可以继续调整组合。');
      }}
      onEdit={() => {
        setActiveModal(null);
        setResultFeedback('已返回组合编辑，可以继续移除或添加生物。');
      }}
    />
    </>
  );
}
