import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Plus, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { fishData } from '../data/fishData';
import type { Fish } from '../types';
import { getCareTaxonomyPath } from '../modules/species/species.service';

const DISPLAY_IMAGE_OVERRIDES: Record<string, string> = {
  sp_0019: '/species-display/sp_0019_埃及神仙_display_white.png?v=displayfix_20260510',
  sp_0175: '/species-display/sp_0175_血钻神仙_display_white.png?v=displayfix_20260510',
  sp_0176: '/species-display/sp_0176_黑白大理石神仙_display_white.png?v=displayfix_20260510',
  sp_0177: '/species-display/sp_0177_红眼蓝钻神仙_display_white.png?v=displayfix_20260510',
  sp_0178: '/species-display/sp_0178_熊猫神仙_display_white.png?v=displayfix_20260510',
  sp_0240: '/species-display/sp_0240_白金神仙_长鳍_display_white.png?v=displayfix_20260510',
  sp_0241: '/species-display/sp_0241_大理石神仙_球形_display_white.png?v=displayfix_20260510',
  sp_0247: '/species-display/sp_0247_蓝钻神仙_球形_display_white.png?v=displayfix_20260510',
  sp_0272: '/species-display/sp_0272_长鳍神仙_黑_display_white.png?v=displayfix_20260510',
  sp_0388: '/species-display/sp_0388_血钻神仙_改良_display_white.png?v=displayfix_20260510',
  sp_0446: '/species-display/sp_0446_神仙鱼_display_white.png?v=displayfix_20260510',
};

const getDisplayImage = (fish: Fish) => DISPLAY_IMAGE_OVERRIDES[fish.id] || fish.image;

type CompatibilityRiskLevel = 'empty' | 'low' | 'medium' | 'high';

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
      reasons: ['先加入 2 种以上生物，系统会按水质、性情、体型和混养模式计算。'],
      nextSteps: ['从下方搜索你想同缸饲养的鱼、虾螺或其他生物。'],
    };
  }

  if (species.length === 1) {
    return {
      level: 'empty' as CompatibilityRiskLevel,
      reasons: ['还需要再加入至少 1 种生物，才能判断混养风险。'],
      nextSteps: ['继续添加一个计划同缸的物种。'],
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

export function CompatibilityRiskCalculator() {
  const [searchTerm, setSearchTerm] = useState('');
  const [speciesIds, setSpeciesIds] = useState<string[]>([]);

  const selectedSpecies = useMemo(
    () => speciesIds.map(id => fishData.find(fish => fish.id === id)).filter(Boolean) as Fish[],
    [speciesIds]
  );
  const result = useMemo(() => calculateRisk(selectedSpecies), [selectedSpecies]);
  const meta = getRiskMeta(result.level);
  const searchResults = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return [];
    return fishData
      .filter(fish => !speciesIds.includes(fish.id))
      .filter(fish => (
        fish.name.toLowerCase().includes(keyword)
        || fish.scientificName.toLowerCase().includes(keyword)
        || fish.category.toLowerCase().includes(keyword)
      ))
      .slice(0, 6);
  }, [searchTerm, speciesIds]);

  const addSpecies = (fish: Fish) => {
    setSpeciesIds(prev => prev.includes(fish.id) ? prev : [...prev, fish.id]);
    setSearchTerm('');
  };

  return (
    <section className="overflow-hidden rounded-sm border border-amber-100 bg-[#FFF8EA] shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-amber-100 bg-white/55 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.iconTone}`}>
            {result.level === 'low' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[14px] font-black text-ink">混养风险计算</h2>
            <p className="text-[10px] font-medium text-ink/50">添加计划同缸的生物，先看风险再决定下一步。</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black ${meta.tone}`}>
          {meta.label}
        </span>
      </div>

      <div className="grid gap-3 p-3 md:grid-cols-[1fr_1.05fr]">
        <div className="min-w-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/45" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索并加入生物..."
              className="h-9 rounded-sm border-amber-200 bg-white pl-8 text-[12px] font-medium text-ink placeholder:text-ink/40"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 gap-1.5">
              {searchResults.map(fish => {
                const taxonomy = getCareTaxonomyPath(fish);
                return (
                  <button
                    key={fish.id}
                    type="button"
                    onClick={() => addSpecies(fish)}
                    className="grid min-h-[52px] grid-cols-[44px_1fr_auto] items-center gap-2 rounded-sm border border-amber-100 bg-white px-2 py-1.5 text-left transition-colors hover:border-amber-300"
                  >
                    <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-amber-50">
                      <img src={getDisplayImage(fish)} alt={fish.name} className="h-full w-full object-contain p-1" referrerPolicy="no-referrer" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-black text-ink">{fish.name}</span>
                      <span className="block truncate text-[10px] font-medium text-ink/45">
                        {taxonomy.temperatureBand} · {taxonomy.size} · {fish.housingMode || '混养待评估'}
                      </span>
                    </span>
                    <Plus className="h-4 w-4 text-amber-600" />
                  </button>
                );
              })}
            </div>
          )}

          <div className="rounded-sm border border-amber-100 bg-white/75 p-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black text-ink/45">已加入计算</span>
              {selectedSpecies.length > 0 && (
                <button type="button" onClick={() => setSpeciesIds([])} className="text-[10px] font-bold text-ink/45 hover:text-ink">
                  清空
                </button>
              )}
            </div>
            {selectedSpecies.length === 0 ? (
              <div className="rounded-sm border border-dashed border-amber-200 bg-amber-50/50 px-3 py-5 text-center text-[11px] font-medium text-ink/45">
                还没有加入生物。
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-x-1.5 gap-y-3">
                {selectedSpecies.map(fish => (
                  <div key={fish.id} className="group relative min-w-0 text-center">
                    <button
                      type="button"
                      aria-label={`移除${fish.name}`}
                      onClick={() => setSpeciesIds(prev => prev.filter(id => id !== fish.id))}
                      className="absolute right-0 top-0 z-10 rounded-full bg-white/95 p-0.5 text-ink/40 shadow-sm hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="mx-auto flex h-[42px] items-end justify-center">
                      <img src={getDisplayImage(fish)} alt={fish.name} className="max-h-[40px] max-w-full object-contain drop-shadow-[0_8px_10px_rgba(90,68,38,0.12)]" referrerPolicy="no-referrer" />
                    </div>
                    <div className="mt-1 truncate text-[9px] font-bold text-ink/70">{fish.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`rounded-sm border p-3 ${meta.tone}`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[12px] font-black">计算结果</span>
            <span className="text-[10px] font-bold opacity-70">{selectedSpecies.length} 种生物</span>
          </div>
          <div className="space-y-2">
            {result.reasons.map(reason => (
              <div key={reason} className="rounded-sm bg-white/65 px-2 py-2 text-[11px] font-medium leading-relaxed text-ink/72">
                {reason}
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-sm bg-white/65 p-2">
            <div className="mb-1 text-[10px] font-black text-ink/45">下一步</div>
            <div className="space-y-1">
              {result.nextSteps.map(step => (
                <div key={step} className="flex gap-1.5 text-[11px] font-medium leading-relaxed text-ink/70">
                  <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-current" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
