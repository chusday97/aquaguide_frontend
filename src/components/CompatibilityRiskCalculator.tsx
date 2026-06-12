import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { fishData } from '../data/fishData';
import type { Fish } from '../types';
import { getCareTaxonomyPath } from '../modules/species/species.service';
import { getSpeciesDisplayImage, getSpeciesImageClass, getSpeciesImageSurfaceClass } from '../lib/speciesVisual';

const getDisplayImage = getSpeciesDisplayImage;

type CompatibilityRiskLevel = 'empty' | 'low' | 'medium' | 'high';
type ResultModal = null | 'adjustment' | 'conflictDetail';

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
    case 'high':
      return { label: '高风险', tone: 'border-red-200 bg-red-50 text-red-600', iconTone: 'bg-red-500 text-white' };
    case 'medium':
      return { label: '中风险', tone: 'border-amber-200 bg-amber-50 text-amber-700', iconTone: 'bg-amber-500 text-white' };
    case 'low':
      return { label: '低风险', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', iconTone: 'bg-emerald-500 text-white' };
    default:
      return { label: '待添加', tone: 'border-border bg-white text-ink/55', iconTone: 'bg-bg text-ink/45' };
  }
};

const calculateRisk = (species: Fish[]) => {
  if (species.length === 0) {
    return {
      level: 'empty' as CompatibilityRiskLevel,
      reasons: [],
      nextSteps: [],
    };
  }

  if (species.length === 1) {
    return {
      level: 'empty' as CompatibilityRiskLevel,
      reasons: [],
      nextSteps: [],
    };
  }

  const highReasons: string[] = [];
  const mediumReasons: string[] = [];
  const waterTypes = new Set(species.map(getCompatibilityWaterType));
  const hasSmall = species.some(item => item.size === 'Small');
  const hasLarge = species.some(item => item.size === 'Large');
  const aggressiveSpecies = species.filter(item => item.temperament === 'Aggressive');
  const territorialSpecies = species.filter(item => item.temperament === 'Territorial');
  const singleHousingSpecies = species.filter(item => item.housingMode === '建议单养');
  const cautiousHousingSpecies = species.filter(item => item.housingMode === '谨慎混养');
  const hardSpecies = species.filter(item => item.difficulty === 'Hard');

  if (waterTypes.size > 1) highReasons.push('存在淡水与海水/珊瑚类生物混养，水体类型不兼容。');
  if (singleHousingSpecies.length > 0) highReasons.push(`${singleHousingSpecies.map(item => item.name).join('、')} 标记为建议单养，不适合作为默认混养对象。`);
  if (aggressiveSpecies.length > 0 && species.length > aggressiveSpecies.length) highReasons.push(`${aggressiveSpecies.map(item => item.name).join('、')} 性情偏凶，和温和或小型生物同缸有攻击风险。`);
  if (hasSmall && hasLarge) highReasons.push('小型和大型生物同缸，存在被追逐、吞食或抢食风险。');

  for (let i = 0; i < species.length; i += 1) {
    for (let j = i + 1; j < species.length; j += 1) {
      const current = species[i];
      const next = species[j];
      if (!rangesOverlap(parseNumericRange(current.waterTemperature), parseNumericRange(next.waterTemperature))) {
        highReasons.push(`${current.name} 与 ${next.name} 的适宜水温没有明显重叠。`);
      }
      if (!rangesOverlap(parseNumericRange(current.phLevel), parseNumericRange(next.phLevel))) {
        mediumReasons.push(`${current.name} 与 ${next.name} 的 pH 区间差异较大，需要先稳定水质。`);
      }
    }
  }

  if (territorialSpecies.length > 0) mediumReasons.push(`${territorialSpecies.map(item => item.name).join('、')} 有领地意识，需要更多躲避物和空间。`);
  if (cautiousHousingSpecies.length > 0) mediumReasons.push(`${cautiousHousingSpecies.map(item => item.name).join('、')} 标记为谨慎混养，建议先少量试养观察。`);
  if (hardSpecies.length > 0) mediumReasons.push(`${hardSpecies.map(item => item.name).join('、')} 饲养难度较高，对水质波动更敏感。`);

  const dedupedHigh = Array.from(new Set(highReasons));
  const dedupedMedium = Array.from(new Set(mediumReasons));
  const level: CompatibilityRiskLevel = dedupedHigh.length > 0 ? 'high' : dedupedMedium.length > 0 ? 'medium' : 'low';
  const nextSteps = level === 'high'
    ? ['建议先分缸或更换搭配对象。', '如果一定要尝试，先确认成体体长、缸体尺寸、躲避物和投喂层位。', '新鱼入缸后至少隔离观察 7 天。']
    : level === 'medium'
      ? ['先把水温、pH 和过滤能力调到交集区间。', '增加水草、沉木、石缝等躲避空间。', '前 48 小时重点观察追逐、夹鳍、拒食和抢食。']
      : ['基础条件匹配，可以进入下一步配置数量、缸体尺寸和入缸顺序。', '仍建议先少量加入，稳定后再补充群体数量。'];

  return {
    level,
    reasons: level === 'low' ? ['当前组合未发现明显水质、体型或性情冲突。'] : [...dedupedHigh, ...dedupedMedium].slice(0, 5),
    nextSteps,
  };
};

const getRiskConclusion = (level: CompatibilityRiskLevel, species: Fish[], reasons: string[]) => {
  if (species.length < 2) return '';
  if (level === 'high') return '不建议直接混养，先移除高风险对象。';
  if (level === 'medium') return '可以尝试，但需要调整环境并观察。';
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

const getMainConflicts = (species: Fish[]) => {
  if (species.length < 2) return [];
  const conflicts: { key: string; pair: string; reason: string }[] = [];
  const addConflict = (a: Fish, b: Fish, reason: string) => {
    const key = [a.id, b.id].sort().join('-');
    if (!conflicts.some(item => item.key === `${key}:${reason}`)) {
      conflicts.push({ key: `${key}:${reason}`, pair: `${a.name} × ${b.name}`, reason });
    }
  };

  for (let i = 0; i < species.length; i += 1) {
    for (let j = i + 1; j < species.length; j += 1) {
      const current = species[i];
      const next = species[j];
      const currentSingle = current.housingMode === '建议单养';
      const nextSingle = next.housingMode === '建议单养';
      const currentAggressive = current.temperament === 'Aggressive';
      const nextAggressive = next.temperament === 'Aggressive';
      const currentLarge = current.size === 'Large';
      const nextLarge = next.size === 'Large';
      const currentSmall = current.size === 'Small';
      const nextSmall = next.size === 'Small';

      if (getCompatibilityWaterType(current) !== getCompatibilityWaterType(next)) {
        addConflict(current, next, '水体类型不同，不能作为默认同缸组合。');
      } else if (currentSingle || nextSingle) {
        addConflict(current, next, `${currentSingle && nextSingle ? '两者' : currentSingle ? current.name : next.name}更适合单独饲养。`);
      } else if ((currentAggressive && !nextAggressive) || (nextAggressive && !currentAggressive)) {
        addConflict(current, next, `${currentAggressive ? current.name : next.name}性情偏凶，可能追咬或压制同缸生物。`);
      } else if ((currentLarge && nextSmall) || (nextLarge && currentSmall)) {
        addConflict(current, next, '体型差异大，可能出现追咬或捕食。');
      } else if (!rangesOverlap(parseNumericRange(current.waterTemperature), parseNumericRange(next.waterTemperature))) {
        addConflict(current, next, '适宜水温没有明显重叠。');
      } else if (!rangesOverlap(parseNumericRange(current.phLevel), parseNumericRange(next.phLevel))) {
        addConflict(current, next, 'pH 区间差异较大，需要先稳定水质。');
      } else if (current.temperament === 'Territorial' || next.temperament === 'Territorial') {
        addConflict(current, next, '存在领地意识，需要更大空间和躲避物。');
      } else if (current.housingMode === '谨慎混养' || next.housingMode === '谨慎混养') {
        addConflict(current, next, '属于谨慎混养组合，建议先少量试养观察。');
      }
    }
  }

  return conflicts.slice(0, 3);
};

const getActionHints = (level: CompatibilityRiskLevel, species: Fish[]) => {
  if (level === 'high') {
    const single = species.find(item => item.housingMode === '建议单养');
    const aggressive = species.find(item => item.temperament === 'Aggressive');
    const removeName = single?.name || aggressive?.name || species[species.length - 1]?.name;
    return [
      removeName ? `优先移除 ${removeName}，重新计算组合。` : '先移除高风险对象，重新计算组合。',
      '建议把单养或攻击性强的生物单独开缸。',
      '新生物入缸前隔离观察 7 天。',
    ];
  }
  if (level === 'medium') {
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
  const sheetTitle = isAdjustment ? '混养调整建议' : '冲突详情';

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
              <p className="mt-0.5 text-[11px] font-bold text-ink/45">根据当前已选 {selectedSpecies.length} 种生物生成。</p>
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
                  <div className="text-[10px] font-black text-ink/42">主要冲突</div>
                  <div className="mt-1 text-[15px] font-black text-ink">{conflict.pair}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-[14px] bg-bg px-3 py-2">
                      <div className="text-[10px] font-black text-ink/42">冲突类型</div>
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
                <div className="text-[13px] font-black text-ink">解决方案</div>
                <div className="mt-2 grid gap-2">
                  {actionHints.slice(0, 4).map(step => (
                    <div key={step} className="rounded-[14px] bg-emerald-50 px-3 py-2 text-[12px] font-bold leading-relaxed text-emerald-900">{step}</div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-1/2 z-20 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-2 gap-2 border-t border-white bg-white/95 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur">
          <button type="button" onClick={onAccept} className="h-10 rounded-full bg-emerald-700 text-[13px] font-black text-white">
            采纳调整建议
          </button>
          <button type="button" onClick={onEdit} className="h-10 rounded-full border border-border bg-white text-[13px] font-black text-ink/62">
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
};

const commonPreviewNames = ['红绿灯', '宝莲灯', '黑壳虾', '极火虾', '斑马螺', '咖啡鼠', '白云金丝', '孔雀鱼'];

const getCommonPreviewSpecies = () => (
  commonPreviewNames
    .map(name => fishData.find(fish => fish.name === name) || fishData.find(fish => fish.name.includes(name)))
    .filter((fish): fish is Fish => Boolean(fish))
);

export function CompatibilityRiskCalculator({ speciesIds, onSpeciesIdsChange, onBrowseAtlas, preferredSpeciesIds = [] }: CompatibilityRiskCalculatorProps = {}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalSpeciesIds, setInternalSpeciesIds] = useState<string[]>([]);
  const [resultFeedback, setResultFeedback] = useState('');
  const [activeModal, setActiveModal] = useState<ResultModal>(null);
  const activeSpeciesIds = speciesIds ?? internalSpeciesIds;
  const updateSpeciesIds = (updater: string[] | ((prev: string[]) => string[])) => {
    const next = typeof updater === 'function' ? updater(activeSpeciesIds) : updater;
    if (onSpeciesIdsChange) onSpeciesIdsChange(next);
    else setInternalSpeciesIds(next);
  };

  const selectedSpecies = useMemo(
    () => activeSpeciesIds.map(id => fishData.find(fish => fish.id === id)).filter(Boolean) as Fish[],
    [activeSpeciesIds]
  );
  const result = useMemo(() => calculateRisk(selectedSpecies), [selectedSpecies]);
  const meta = getRiskMeta(result.level);
  const riskConclusion = getRiskConclusion(result.level, selectedSpecies, result.reasons);
  const conflictTags = getConflictTags(selectedSpecies, result.reasons);
  const mainConflicts = useMemo(() => getMainConflicts(selectedSpecies), [selectedSpecies]);
  const actionHints = useMemo(() => getActionHints(result.level, selectedSpecies), [result.level, selectedSpecies]);
  const commonPreviewSpecies = useMemo(() => {
    const preferredSpecies = Array.from(new Set(preferredSpeciesIds))
      .map(id => fishData.find(fish => fish.id === id))
      .filter((fish): fish is Fish => Boolean(fish))
      .filter(fish => !activeSpeciesIds.includes(fish.id));
    const fallbackSpecies = getCommonPreviewSpecies()
      .filter(fish => !activeSpeciesIds.includes(fish.id))
      .filter(fish => !preferredSpecies.some(item => item.id === fish.id));
    return (preferredSpecies.length > 0 ? preferredSpecies : fallbackSpecies).slice(0, 8);
  }, [activeSpeciesIds, preferredSpeciesIds]);
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
    setSearchTerm('');
  };
  const handlePrimaryResultAction = () => {
    if (result.level === 'high') {
      updateSpeciesIds([]);
      setResultFeedback('已返回重新选择，可以重新搜索搭配对象。');
      return;
    }
    if (result.level === 'medium') {
      setActiveModal('adjustment');
      return;
    }
    setResultFeedback('当前暂不支持从混养计算直接批量加入，请回到图鉴详情逐个确认添加。');
  };
  const handleSecondaryResultAction = () => {
    if (result.level === 'low') return;
    setActiveModal('conflictDetail');
  };

  return (
    <>
    <section className="page-frame overflow-hidden rounded-[18px] border border-border bg-white shadow-sm">
      <div className={`border-b px-4 py-4 ${meta.tone}`}>
        <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.iconTone}`}>
            {result.level === 'low' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
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
                <div className="text-[12px] font-black text-ink">常用生物预览</div>
                <div className="mt-0.5 text-[10px] font-bold text-ink/42">左右滑动，点卡片直接加入计算。</div>
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
                <button type="button" onClick={() => updateSpeciesIds([])} className="text-[10px] font-bold text-ink/45 hover:text-ink">
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
                      onClick={() => updateSpeciesIds(prev => prev.filter(id => id !== fish.id))}
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
                  {result.level === 'high'
                    ? `当前组合有 ${Math.max(mainConflicts.length, 1)} 个明显冲突对象，建议先重新选择。`
                    : result.level === 'medium'
                      ? '先调整空间、躲避物和入缸顺序，再考虑尝试。'
                      : '条件接近，可以少量加入并观察。'}
                </p>
              </div>

              {resultFeedback && (
                <div className="mb-3 rounded-[12px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700">
                  {resultFeedback}
                </div>
              )}

              <div id="compat-main-conflicts" className="mb-3 rounded-[14px] bg-white/65 p-3">
                <div className="mb-2 text-[10px] font-black text-ink/45">主要冲突</div>
                <div className="space-y-2">
                  {(mainConflicts.length > 0 ? mainConflicts : [{ key: 'low-fit', pair: selectedSpecies.map(item => item.name).join(' × '), reason: '未发现明显对象冲突，仍建议少量加入并观察。' }]).map(conflict => (
                    <div key={conflict.key} className="rounded-[12px] border border-border/70 bg-white px-2.5 py-2">
                      <div className="text-[12px] font-black text-ink">{conflict.pair}</div>
                      <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-ink/62">{conflict.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              {conflictTags.length > 0 && (
                <div className="mb-3 rounded-[14px] bg-white/60 p-2">
                  <div className="mb-1.5 text-[10px] font-black text-ink/42">涉及风险</div>
                  <div className="flex flex-wrap gap-1.5">
                    {conflictTags.map(item => (
                      <span key={item} className="rounded-full border border-border/70 bg-white px-2 py-1 text-[10px] font-black text-ink/58">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div id="compat-next-steps" className="mt-3 rounded-[12px] bg-white/65 p-2">
                <div className="mb-1 text-[10px] font-black text-ink/45">下一步建议</div>
                <div className="space-y-1">
                  {actionHints.slice(0, 3).map(step => (
                    <div key={step} className="flex gap-1.5 text-[11px] font-medium leading-relaxed text-ink/70">
                      <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-current" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`mt-3 grid gap-2 ${result.level === 'low' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <button
                  type="button"
                  onClick={handlePrimaryResultAction}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-black transition-colors ${
                    result.level === 'high'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : result.level === 'medium'
                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                        : 'bg-emerald-700 text-white hover:bg-emerald-800'
                  }`}
                >
                  {result.level === 'low' ? '加入当前鱼缸' : result.level === 'medium' ? '查看调整建议' : '重新选择'}
                </button>
                {result.level !== 'low' && (
                  <button
                    type="button"
                    onClick={handleSecondaryResultAction}
                    className="rounded-full bg-white/75 px-3 py-1.5 text-center text-[11px] font-black text-ink/65 transition-colors hover:bg-white"
                  >
                    {result.level === 'medium' ? '查看冲突详情' : '查看冲突详情'}
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
        setResultFeedback('已采纳调整建议，请按建议完善环境并观察。');
      }}
      onEdit={() => {
        setActiveModal(null);
        setResultFeedback('已返回组合编辑，可以继续移除或添加生物。');
      }}
    />
    </>
  );
}
