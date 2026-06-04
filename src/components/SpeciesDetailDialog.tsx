import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Heart, HeartOff, Info, MoreHorizontal, Plus, Skull } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Aquarium, Fish } from '../types';
import { fishData } from '../data/fishData';
import { getCareTaxonomyPath, getLifeType, getToolFunctions } from '../modules/species/species.service';
import { ImagePreviewModal, type PreviewImage } from './common/ImagePreviewModal';

type FitStatus = 'ok' | 'warning' | 'danger' | 'info';
type DetailSource = 'atlas' | 'aquarium';
type FitDimension = {
  label: string;
  current: string;
  requirement: string;
  status: FitStatus;
  advice: string;
};
type FitAssessmentStatus = 'suitable' | 'setupNeeded' | 'unsuitable' | 'conflictRisk' | 'unknown';

type SpeciesDetailDialogProps = {
  fish: Fish | null;
  open: boolean;
  source: DetailSource;
  aquariumContext?: Aquarium | null;
  imageSrc: string;
  owned: boolean;
  inCalculator: boolean;
  inWishlist: boolean;
  detailFeedback?: string;
  onOpenChange: (open: boolean) => void;
  onAddToTank?: (fish: Fish) => void;
  onAddToCalculator: (fish: Fish) => void;
  onToggleWishlist: (fishId: string) => void;
  onGoCalculator?: () => void;
  onRecordDeath?: (fish: Fish) => void;
};

const parseRange = (value: string) => {
  const match = value.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return { min: Number(match[1]), max: Number(match[2]) };
};

const getTankVolumeLiters = (aquarium?: Aquarium | null) => {
  if (!aquarium?.dimensions) return null;
  const length = Number(aquarium.dimensions.length);
  const width = Number(aquarium.dimensions.width);
  const height = Number(aquarium.dimensions.height);
  if (!length || !width || !height) return null;
  return Math.round((length * width * height * 0.85) / 1000);
};

const getMinimumTankLiters = (fish: Fish) => {
  const match = fish.tankSize.match(/(\d+)/);
  return match ? Number(match[1]) : null;
};

const getExistingLivestock = (aquarium?: Aquarium | null) => (
  (aquarium?.fishes || [])
    .map(item => ({ aqFish: item, fish: fishData.find(fish => fish.id === item.fishId) }))
    .filter((item): item is { aqFish: Aquarium['fishes'][number]; fish: Fish } => {
      if (!item.fish) return false;
      const lifeType = getLifeType(item.fish);
      return lifeType !== 'plant' && lifeType !== 'hardscape';
    })
);

const getDifficultyLabel = (difficulty: Fish['difficulty']) => {
  if (difficulty === 'Easy') return '极易';
  if (difficulty === 'Medium') return '中等';
  return '困难';
};

const getDifficultyBadgeClass = (difficulty: Fish['difficulty']) => {
  if (difficulty === 'Easy') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (difficulty === 'Medium') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-600 border-red-200';
};

const getTemperamentLabel = (temperament: Fish['temperament']) => (
  temperament === 'Peaceful' ? '温和' : temperament === 'Aggressive' ? '凶猛' : '领地意识强'
);

const getFishTemperatureTheme = (tempString: string) => {
  const match = tempString.match(/(\d+)-(\d+)/);
  if (!match) return { needsHeater: false };
  return { needsHeater: parseInt(match[1], 10) >= 20 };
};

const getFitStatusClass = (status: FitStatus) => {
  if (status === 'ok') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (status === 'warning') return 'border-amber-100 bg-amber-50 text-amber-700';
  if (status === 'danger') return 'border-red-100 bg-red-50 text-red-600';
  return 'border-sky-100 bg-sky-50 text-sky-700';
};

const getFitStatusLabel = (status: FitStatus) => {
  if (status === 'ok') return '匹配';
  if (status === 'warning') return '需调整';
  if (status === 'danger') return '风险';
  return '信息不足';
};

const getAssessmentTone = (status: FitAssessmentStatus) => {
  if (status === 'suitable') return 'suitable';
  if (status === 'unsuitable' || status === 'conflictRisk') return 'risk';
  if (status === 'setupNeeded') return 'warning';
  return 'unknown';
};

const getSpeciesRole = (fish: Fish) => {
  const tools = getToolFunctions(fish);
  const taxonomy = getCareTaxonomyPath(fish);
  if (getSecondaryCareType(fish) === '水母') return '观赏生物 / 特殊缸体';
  if (getSecondaryCareType(fish) === '海葵') return '观赏生物 / 海水特殊养护';
  if (taxonomy.waterType.includes('水草') || fish.category.includes('水草')) return '水草造景 / 环境植物';
  if (tools.includes('除藻')) return getLifeType(fish) === 'invertebrate' ? '工具虾螺 / 除藻生物' : '工具生物 / 除藻辅助';
  if (tools.includes('清残饵')) return '底层生物 / 清残饵';
  if (fish.size === 'Small' && fish.temperament === 'Peaceful') return '小型观赏鱼 / 群游搭配';
  if (fish.housingMode === '建议单养') return '主题生物 / 单独饲养';
  return getLifeType(fish) === 'invertebrate' ? '工具生物 / 生态搭配' : '观赏生物 / 鱼缸搭配';
};

const getSecondaryCareType = (fish: Fish) => {
  const text = `${fish.name} ${fish.scientificName} ${fish.category}`;
  if (/水母|Aurelia|Chrysaora|Phyllorhiza|Cassiopea|Cotylorhiza|Sanderia/i.test(text)) return '水母';
  if (/海葵|anemone|Entacmaea|Stichodactyla|Heteractis/i.test(text)) return '海葵';
  return '';
};

const getSpeciesFitAssessment = (fish: Fish, aquarium?: Aquarium | null) => {
  const tempRange = parseRange(fish.waterTemperature);
  const phRange = parseRange(fish.phLevel);
  const tankLiters = getTankVolumeLiters(aquarium);
  const minLiters = getMinimumTankLiters(fish);
  const currentTemperature = aquarium?.targetTemperature ? Number(aquarium.targetTemperature) : null;
  const taxonomy = getCareTaxonomyPath(fish);
  const isSaltwaterSpecies = taxonomy.waterType.includes('海水');
  const waterTypeMismatch = !!aquarium && ((aquarium.waterType === 'Saltwater') !== isSaltwaterSpecies);
  const needsHeater = getFishTemperatureTheme(fish.waterTemperature).needsHeater;
  const heaterMissing = needsHeater && aquarium?.equipment?.heater === false;
  const existingLivestock = getExistingLivestock(aquarium);
  const isEmptyTank = existingLivestock.length === 0;
  const specialCareType = getSecondaryCareType(fish);

  const environmentFit: FitDimension[] = [
    ...(waterTypeMismatch ? [{
      label: '水体类型',
      current: aquarium?.waterType === 'Saltwater' ? '海水' : '淡水',
      requirement: isSaltwaterSpecies ? '海水' : '淡水',
      status: 'danger' as FitStatus,
      advice: '当前鱼缸水体类型与该物种需求不一致，不建议直接加入。',
    }] : []),
    {
      label: '温度',
      current: currentTemperature ? `${currentTemperature}℃` : '未设置',
      requirement: fish.waterTemperature,
      status: !aquarium || !currentTemperature || !tempRange
        ? 'info'
        : currentTemperature >= tempRange.min && currentTemperature <= tempRange.max ? 'ok' : 'warning',
      advice: !aquarium || !currentTemperature
        ? '先在鱼缸设置中补充目标温度。'
        : currentTemperature >= (tempRange?.min || 0) && currentTemperature <= (tempRange?.max || 99) ? '当前温度在需求范围内。' : `建议调整到 ${fish.waterTemperature} 并保持稳定。`,
    },
    {
      label: 'pH',
      current: '未记录',
      requirement: phRange ? fish.phLevel : '资料不足',
      status: 'info',
      advice: phRange ? '当前未记录 pH，建议测试后再判断。' : '该物种缺少明确 pH 范围，可先按稳定水质管理。',
    },
  ];

  const spaceFit: FitDimension[] = [
    {
      label: '缸体大小',
      current: tankLiters ? `约 ${tankLiters}L` : '未设置',
      requirement: fish.tankSize,
      status: !tankLiters || !minLiters ? 'info' : tankLiters >= minLiters ? 'ok' : tankLiters < minLiters * 0.65 ? 'danger' : 'warning',
      advice: !tankLiters || !minLiters ? '先完善鱼缸尺寸，才能判断空间是否足够。' : tankLiters >= minLiters ? '空间基本满足最低建议。' : `当前鱼缸为空也暂无混养冲突，但该生物需要至少 ${minLiters}L 水体，当前约 ${tankLiters}L。`,
    },
  ];

  const equipmentFit: FitDimension[] = [
    {
      label: '养护难度',
      current: '新手参考',
      requirement: getDifficultyLabel(fish.difficulty),
      status: fish.difficulty === 'Hard' ? 'danger' : fish.difficulty === 'Medium' ? 'warning' : 'ok',
      advice: fish.difficulty === 'Easy' ? '适合作为入门选择。' : fish.difficulty === 'Medium' ? '需要稳定水质和观察。' : '不建议新手直接尝试。',
    },
    {
      label: '设备需求',
      current: [
        aquarium?.equipment?.filter ? `过滤：${aquarium.equipment.filter}` : '过滤未设置',
        aquarium?.equipment?.heater ? '已配置加热棒' : '加热棒未确认',
      ].join(' / '),
      requirement: specialCareType === '水母' ? '圆形水母缸 / 柔和循环水流' : needsHeater ? '建议加热棒' : '常规过滤',
      status: specialCareType === '水母' ? 'warning' : !needsHeater ? 'ok' : heaterMissing ? 'warning' : aquarium?.equipment?.heater ? 'ok' : 'info',
      advice: specialCareType === '水母' ? '水母不是鱼类，需要专用水母缸或避免强吸力过滤。' : needsHeater ? '建议使用加热棒和温度计维持稳定水温。' : '按常规过滤、换水和观察即可。',
    },
  ];

  const compatibilityFit: FitDimension[] = isEmptyTank ? [] : [{
    label: '混养',
    current: `已有 ${existingLivestock.length} 种活体`,
    requirement: fish.housingMode || '需观察',
    status: fish.housingMode === '建议单养' ? 'danger' : fish.housingMode === '谨慎混养' ? 'warning' : 'ok',
    advice: fish.housingReason || '建议加入混养计算后再确认组合风险。',
  }];
  const items = [...environmentFit, ...spaceFit, ...equipmentFit, ...compatibilityFit];

  const dangerCount = items.filter(item => item.status === 'danger').length;
  const warningCount = items.filter(item => item.status === 'warning').length;
  const infoCount = items.filter(item => item.status === 'info').length;
  const hasCompatibilityRisk = compatibilityFit.some(item => item.status === 'danger' || item.status === 'warning');
  const status: FitAssessmentStatus = !aquarium || infoCount >= 3
    ? 'unknown'
    : hasCompatibilityRisk
      ? 'conflictRisk'
      : dangerCount > 0
        ? 'unsuitable'
        : warningCount > 0
          ? 'setupNeeded'
          : 'suitable';
  const title = isEmptyTank
    ? status === 'suitable'
      ? '适合建立新缸'
      : status === 'setupNeeded'
        ? '需要先调整环境'
        : status === 'unsuitable'
          ? '不建议作为当前鱼缸首个生物'
          : '先完善鱼缸设置'
    : status === 'conflictRisk'
      ? '不建议加入当前鱼缸'
      : status === 'suitable'
        ? '适合加入'
        : status === 'setupNeeded'
          ? '需要先调整环境'
          : '不建议加入当前鱼缸';
  const conclusion = isEmptyTank
    ? status === 'suitable'
      ? '当前鱼缸为空，基础环境满足要求，可以作为该生物的起始配置。'
      : status === 'setupNeeded'
        ? '当前鱼缸为空，暂无混养冲突，但需要先调整水温、水质或设备。'
        : status === 'unsuitable'
          ? '当前鱼缸为空，暂无混养冲突，但当前水体、空间或水质不满足该生物要求。'
          : '当前鱼缸为空，需要先完善鱼缸尺寸、温度和设备设置。'
    : status === 'conflictRisk'
      ? '当前鱼缸已有生物，存在混养冲突或空间压力。'
      : status === 'suitable'
        ? '适合当前鱼缸，可以少量加入并观察 3-7 天。'
        : status === 'setupNeeded'
          ? '当前鱼缸有部分环境或设备条件需要确认或调整。'
          : '当前鱼缸的基础条件不满足该生物要求。';

  return {
    status,
    title,
    conclusion,
    isEmptyTank,
    existingLivestockCount: existingLivestock.length,
    environmentFit,
    spaceFit,
    equipmentFit,
    compatibilityFit,
    items,
    risks: items.filter(item => item.status === 'warning' || item.status === 'danger'),
  };
};

export function SpeciesDetailDialog({
  fish,
  open,
  source,
  aquariumContext,
  imageSrc,
  owned,
  inCalculator,
  inWishlist,
  detailFeedback,
  onOpenChange,
  onAddToTank,
  onAddToCalculator,
  onToggleWishlist,
  onGoCalculator,
  onRecordDeath,
}: SpeciesDetailDialogProps) {
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const selectedFit = fish ? getSpeciesFitAssessment(fish, aquariumContext) : null;
  const selectedTaxonomy = fish ? getCareTaxonomyPath(fish) : null;

  const openPreview = () => {
    if (!fish) return;
    setPreviewImages([{ src: imageSrc || fish.image, title: fish.name }]);
    setPreviewIndex(0);
    setIsPreviewOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="modalCard w-[min(640px,calc(100vw-32px))] max-w-[640px] p-0 border-border rounded-[28px]">
          {fish && selectedFit && (
            <div className="flex min-h-0 flex-1 flex-col bg-white">
              <div className="modalBody app-scrollbar-hidden p-0">
                <div className="modalHeader border-b border-border bg-gradient-to-br from-white via-sky-50/50 to-emerald-50/60 p-4">
                  <button
                    type="button"
                    onClick={openPreview}
                    data-species-detail-hero
                    className="flex h-[250px] w-full items-center justify-center rounded-[18px] border border-border/70 bg-white p-3 shadow-sm"
                    aria-label={`放大查看${fish.name}图片`}
                  >
                    <img src={imageSrc || fish.image} alt={fish.name} className="h-[84%] w-[84%] object-contain" referrerPolicy="no-referrer" />
                  </button>
                  <div className="mt-4 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <DialogTitle className="font-serif text-[22px] italic font-bold leading-tight text-ink">{fish.name}</DialogTitle>
                        <DialogDescription className="mt-1 text-[11px] font-medium leading-tight text-ink/55">{fish.scientificName}</DialogDescription>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${getDifficultyBadgeClass(fish.difficulty)}`}>{getDifficultyLabel(fish.difficulty)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[selectedTaxonomy?.variety, fish.housingMode, ...getToolFunctions(fish)].filter(Boolean).slice(0, 3).map(tag => (
                        <span key={tag} className="rounded-full border border-border bg-white px-2 py-1 text-[10px] font-bold text-ink/60">{tag}</span>
                      ))}
                    </div>
                    <p className="mt-3 line-clamp-1 text-[12px] font-medium leading-relaxed text-ink/62">{getSpeciesRole(fish)}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-4 md:p-6">
                  {(() => {
                    const tone = getAssessmentTone(selectedFit.status);
                    return (
                  <div className={`rounded-[18px] border p-4 ${tone === 'suitable' ? 'border-emerald-100 bg-emerald-50/80' : tone === 'risk' ? 'border-red-100 bg-red-50/80' : tone === 'warning' ? 'border-amber-100 bg-amber-50/80' : 'border-sky-100 bg-sky-50/80'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white ${tone === 'suitable' ? 'text-emerald-600' : tone === 'risk' ? 'text-red-600' : tone === 'warning' ? 'text-amber-600' : 'text-sky-600'}`}>
                        {selectedFit.status === 'suitable' ? <CheckCircle2 className="h-5 w-5" /> : selectedFit.status === 'unknown' ? <Info className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-black text-ink/45">{source === 'aquarium' ? '当前鱼缸适配' : '能不能养'}</div>
                        <p className="mt-1 text-[18px] font-black leading-tight text-ink">
                          {selectedFit.title}
                        </p>
                        <p className="mt-1 text-[12px] font-bold leading-relaxed text-ink/68">{selectedFit.conclusion}</p>
                        <p className="mt-1 text-[11px] font-medium text-ink/55">
                          参考鱼缸：{aquariumContext ? `${aquariumContext.name} · ${aquariumContext.waterType === 'Saltwater' ? '海水' : '淡水'} · ${aquariumContext.targetTemperature || '温度未设置'}℃` : '暂无鱼缸数据'}
                        </p>
                      </div>
                    </div>
                  </div>
                    );
                  })()}

                  <section className="grid grid-cols-3 gap-2">
                    {selectedFit.items.filter(item => ['水体类型', '温度', '缸体大小', '混养'].includes(item.label)).slice(0, 3).map(item => (
                      <div key={item.label} className="rounded-[14px] border border-border bg-bg/45 p-2">
                        <div className="text-[11px] font-black text-ink">{item.label === '缸体大小' ? '空间' : item.label}</div>
                        <div className="mt-1 line-clamp-1 text-[9px] font-medium text-ink/45">当前：{item.current}</div>
                        <div className="line-clamp-1 text-[9px] font-medium text-ink/45">需求：{item.requirement}</div>
                        <span className={`mt-2 inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-black ${getFitStatusClass(item.status)}`}>{getFitStatusLabel(item.status)}</span>
                      </div>
                    ))}
                  </section>

                  <div className="grid gap-2">
                    {owned ? (
                      <div className="flex h-11 items-center justify-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 text-sm font-black text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" /> 已在鱼缸中
                      </div>
                    ) : onAddToTank ? (
                      <Button className="h-11 rounded-full bg-accent text-sm font-black text-white hover:bg-accent/90" onClick={() => onAddToTank(fish)}>
                        <Plus className="mr-1 h-4 w-4" />{
                          selectedFit.status === 'unknown'
                            ? '先配置鱼缸环境'
                            : selectedFit.status === 'conflictRisk'
                              ? '查看风险后确认添加'
                              : selectedFit.status === 'setupNeeded'
                                ? selectedFit.isEmptyTank ? '查看建缸要求' : '调整后加入'
                                : selectedFit.status === 'unsuitable'
                                  ? '先配置鱼缸环境'
                                  : '添加到我的鱼缸'
                        }
                      </Button>
                    ) : null}
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className={`h-9 rounded-full text-xs font-black ${inCalculator ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border text-ink/65'}`} onClick={() => onAddToCalculator(fish)}>
                        {inCalculator ? '已选择' : '加入混养计算'}
                      </Button>
                      <Button variant="outline" className={`h-9 rounded-full text-xs font-black ${inWishlist ? 'border-rose-200 bg-rose-50 text-rose-500' : 'border-border text-ink/65'}`} onClick={() => onToggleWishlist(fish.id)}>
                        {inWishlist ? <Heart className="mr-1 h-4 w-4 fill-current" /> : <HeartOff className="mr-1 h-4 w-4" />}{inWishlist ? '已种草' : '加入种草'}
                      </Button>
                    </div>
                    {detailFeedback && (
                      <div className="flex items-center justify-between gap-2 rounded-[14px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
                        <span>{detailFeedback}</span>
                        {onGoCalculator && <button type="button" className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-emerald-700" onClick={onGoCalculator}>去计算</button>}
                      </div>
                    )}
                  </div>

                  <details className="rounded-[16px] border border-border bg-white p-3 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-black text-ink">基础需求<ChevronRight className="h-4 w-4 text-ink/38" /></summary>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                      {[
                        ['温度', fish.waterTemperature],
                        ['最小缸体', fish.tankSize],
                        ['加热', getFishTemperatureTheme(fish.waterTemperature).needsHeater ? '建议稳定加热' : '通常不需加热'],
                        ['新手适合', fish.difficulty === 'Easy' ? '适合' : fish.difficulty === 'Medium' ? '一般' : '不建议新手'],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-[12px] bg-bg p-2">
                          <div className="text-[10px] font-bold text-ink/42">{label}</div>
                          <div className="mt-1 text-[12px] font-black text-ink">{value}</div>
                        </div>
                      ))}
                    </div>
                  </details>

                  <details className="rounded-[16px] border border-border bg-white p-3 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-black text-ink">
                      {selectedFit.isEmptyTank ? '建缸要求' : '混养与风险'}
                      <ChevronRight className="h-4 w-4 text-ink/38" />
                    </summary>
                    <div className="mt-3 grid gap-2">
                      <div className="rounded-[12px] bg-bg p-2">
                        <div className="text-[10px] font-bold text-ink/42">{selectedFit.isEmptyTank ? '当前状态' : '性情 / 混养'}</div>
                        <div className="mt-1 text-[12px] font-black text-ink">
                          {selectedFit.isEmptyTank ? '空鱼缸，暂无混养冲突' : `${getTemperamentLabel(fish.temperament)} · ${fish.housingMode || '需观察'}`}
                        </div>
                      </div>
                      <p className="rounded-[12px] bg-bg p-2 text-[11px] font-medium leading-relaxed text-ink/65">
                        {selectedFit.isEmptyTank
                          ? '请优先确认水体类型、水温、空间和设备；有活体入缸后再判断混养关系。'
                          : fish.housingReason || '建议加入混养计算后再确认。'}
                      </p>
                      {selectedFit.risks.length > 0 && (
                        <div className="grid gap-1.5">
                          {selectedFit.risks.slice(0, 3).map(item => (
                            <div key={item.label} className="rounded-[12px] border border-amber-100 bg-amber-50/60 p-2">
                              <div className="text-[11px] font-black text-ink">{item.label}</div>
                              <p className="mt-0.5 text-[10px] font-medium leading-relaxed text-ink/60">{item.advice}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </details>

                  <details className="rounded-[16px] border border-border bg-white p-3 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-black text-ink">喂养与养护<ChevronRight className="h-4 w-4 text-ink/38" /></summary>
                    <div className="mt-3 grid gap-3">
                      <div className="rounded-[12px] bg-bg p-2">
                        <div className="text-[10px] font-black text-ink/42">喂食</div>
                        <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/68">{fish.feedingProfile?.recommendedFoods || fish.diet}</p>
                        <p className="mt-1 text-[11px] font-bold text-ink/48">{fish.feedingProfile?.feedingFrequency || '少量投喂，避免残饵。'}</p>
                      </div>
                      <div className="rounded-[12px] bg-bg p-2">
                        <div className="text-[10px] font-black text-ink/42">换水 / 环境</div>
                        <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/68">约 {fish.waterChangeCycle} 天 · {fish.waterTemperature} · pH {fish.phLevel}</p>
                      </div>
                      <div className="rounded-[12px] bg-bg p-2">
                        <div className="text-[10px] font-black text-ink/42">提醒</div>
                        <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/68">{fish.feedingProfile?.specialNotes || fish.description}</p>
                      </div>
                    </div>
                  </details>

                  {onRecordDeath && (
                    <details className="rounded-[16px] border border-border bg-bg/45 p-3">
                      <summary className="flex cursor-pointer list-none items-center gap-2 text-[12px] font-black text-ink/55"><MoreHorizontal className="h-4 w-4" /> 更多低频操作</summary>
                      <Button variant="outline" className="mt-3 h-9 w-full rounded-full border-border text-xs font-black text-ink/55" onClick={() => onRecordDeath(fish)}>
                        <Skull className="mr-1 h-4 w-4" /> 记录死亡
                      </Button>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ImagePreviewModal images={previewImages} index={previewIndex} open={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} onIndexChange={setPreviewIndex} />
    </>
  );
}
