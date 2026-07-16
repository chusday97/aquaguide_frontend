import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Box, Calculator, CheckCircle2, ChevronRight, Flame, FlaskConical, Heart, HeartOff, Info, Plus, Share2, Skull, SlidersHorizontal, Thermometer, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Aquarium, Fish } from '../types';
import { fishData } from '../data/fishData';
import { getCareTaxonomyPath, getLifeType, getToolFunctions } from '../modules/species/species.service';
import { getSpeciesDisplayImage, getSpeciesImageClass, getSpeciesImageSurfaceClass } from '../lib/speciesVisual';
import { evaluateTankCompatibility, type TankCompatibilityResult } from '../lib/tankCompatibilityEngine';
import { buildSpeciesKnowledgeProfile } from '../modules/knowledge/speciesKnowledge';
import { evaluateCompatibilityDecision } from '../modules/knowledge/compatibilityKnowledge';
import { buildSpeciesCarePresentation } from '../modules/knowledge/speciesCarePresentation';
import type { PairCompatibilityResult } from '../modules/knowledge/knowledge.types';
import type { PreviewImage } from './common/ImagePreviewModal';
import { AdaptiveDetailContent } from './common/AdaptiveDetailContent';
import { VisualResultCard } from './visual-results/VisualResultCard';
import { getVisualEmphasis, mapFitStatus } from './visual-results/visual-result.adapters';
import type { VisualResultViewModel } from './visual-results/visual-result.types';

const ImagePreviewModal = lazy(() => import('./common/ImagePreviewModal').then(module => ({ default: module.ImagePreviewModal })));
const Interactive3DFishWrapper = lazy(() => import('./Interactive3DFishWrapper'));

type FitStatus = 'ok' | 'warning' | 'danger' | 'info';
type DetailSource = 'atlas' | 'aquarium';
type FitDimension = {
  type: string;
  label: string;
  current: string;
  requirement: string;
  status: FitStatus;
  advice: string;
};
type FitAssessmentStatus = 'suitable' | 'alreadyInTank' | 'needConfirmation' | 'setupNeeded' | 'unsuitable' | 'conflictRisk' | 'unknown' | 'caution';
type RuleFitStatus = 'match' | 'warning' | 'mismatch' | 'unknown';
type SpeciesFitAssessment = {
  status: FitAssessmentStatus;
  title: string;
  conclusion: string;
  isEmptyTank: boolean;
  alreadyInTank: boolean;
  existingLivestockCount: number;
  environmentFit: FitDimension[];
  spaceFit: FitDimension[];
  equipmentFit: FitDimension[];
  compatibilityFit: FitDimension[];
  items: FitDimension[];
  ruleResult: TankCompatibilityResult;
  compatibilityResult: TankCompatibilityResult;
  risks: FitDimension[];
  confirmations: FitDimension[];
};

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
  finalFocusElement?: HTMLElement | null;
  onOpenChange: (open: boolean) => void;
  onAddToTank?: (fish: Fish) => void;
  onAddToCalculator: (fish: Fish) => void;
  onToggleWishlist: (fishId: string) => void;
  onGoCalculator?: () => void;
  onOpenTankSettings?: (panel: 'size' | 'parameters' | 'equipment') => void;
  onRecordDeath?: (fish: Fish, input: { date: string; reason: string }) => void | Promise<void>;
};

const getLocalDateValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
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

const getCareSourceClass = (status: ReturnType<typeof buildSpeciesCarePresentation>['sourceStatus']) => {
  if (status === 'verified') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (status === 'derived') return 'border-sky-100 bg-sky-50 text-sky-700';
  if (status === 'generic') return 'border-amber-100 bg-amber-50 text-amber-700';
  return 'border-orange-100 bg-orange-50 text-orange-700';
};

const getFitCurrentClass = (status: FitStatus) => {
  if (status === 'warning') return 'text-amber-700';
  if (status === 'danger') return 'text-red-600';
  if (status === 'info') return 'text-sky-700';
  return 'text-emerald-700';
};

const getFitStatusLabel = (status: FitStatus) => {
  if (status === 'ok') return '匹配';
  if (status === 'warning') return '需调整';
  if (status === 'danger') return '风险';
  return '信息不足';
};

const getAssessmentTone = (status: FitAssessmentStatus) => {
  if (status === 'suitable' || status === 'alreadyInTank') return 'suitable';
  if (status === 'unsuitable' || status === 'conflictRisk') return 'risk';
  if (status === 'setupNeeded' || status === 'caution') return 'warning';
  return 'unknown';
};

const mapCompatibilityStatusToDetailStatus = (
  compatibility: TankCompatibilityResult,
  options: { aquarium?: Aquarium | null; alreadyInTank: boolean },
): FitAssessmentStatus => {
  if (!options.aquarium) return 'unknown';
  if (options.alreadyInTank && compatibility.status !== 'not_recommended') return 'alreadyInTank';
  if (compatibility.status === 'compatible') return 'suitable';
  if (compatibility.status === 'insufficient_data') return 'needConfirmation';
  if (compatibility.status === 'caution') {
    const hasOnlyMissingData = compatibility.warningRules.length === 0 && compatibility.missingData.length > 0;
    return hasOnlyMissingData ? 'needConfirmation' : 'caution';
  }
  const hasCompatibilityBlock = compatibility.blockingRules.some(rule => (
    /predation|territorial|single|compat|attack|housing/i.test(rule.code)
  ));
  return hasCompatibilityBlock ? 'conflictRisk' : 'unsuitable';
};

const getCompatibilityTitle = (
  status: FitAssessmentStatus,
  options: { isEmptyTank: boolean },
) => {
  if (status === 'alreadyInTank') return '已在当前鱼缸中';
  if (status === 'suitable') return options.isEmptyTank ? '适合建立新缸' : '适合当前鱼缸';
  if (status === 'needConfirmation') return '基础条件匹配，建议补充确认';
  if (status === 'caution') return '可以尝试，但需要谨慎';
  if (status === 'conflictRisk') return '混养需谨慎';
  if (status === 'unsuitable') return '不建议加入当前鱼缸';
  return '先完善鱼缸设置';
};

const toRuleFitStatus = (status: FitStatus): RuleFitStatus => {
  if (status === 'ok') return 'match';
  if (status === 'danger') return 'mismatch';
  if (status === 'warning') return 'warning';
  return 'unknown';
};

const getSpeciesRole = (fish: Fish) => {
  const tools = getToolFunctions(fish);
  const taxonomy = getCareTaxonomyPath(fish);
  if (getSecondaryCareType(fish) === '水母') return '观赏生物 / 特殊缸体';
  if (getSecondaryCareType(fish) === '海葵') return '观赏生物 / 海水特殊养护';
  if (taxonomy.waterType.includes('水草') || fish.category.includes('水草')) return '水草造景 / 环境植物';
  if (fish.housingMode === '建议单养') return '观赏主角 / 建议单养';
  if (tools.includes('除藻')) return getLifeType(fish) === 'invertebrate' ? '工具虾螺 / 除藻生物' : '工具生物 / 除藻辅助';
  if (tools.includes('清残饵')) return '底层生物 / 清残饵';
  if (fish.size === 'Small' && fish.temperament === 'Peaceful') return '小型观赏鱼 / 群游搭配';
  return getLifeType(fish) === 'invertebrate' ? '工具生物 / 生态搭配' : '观赏生物 / 鱼缸搭配';
};

const getSexIdentificationGuide = (fish: Fish) => {
  return buildSpeciesKnowledgeProfile(fish).knowledge.sexIdentification;
};

const getSecondaryCareType = (fish: Fish) => {
  const text = `${fish.name} ${fish.scientificName} ${fish.category}`;
  if (/水母|Aurelia|Chrysaora|Phyllorhiza|Cassiopea|Cotylorhiza|Sanderia/i.test(text)) return '水母';
  if (/海葵|anemone|Entacmaea|Stichodactyla|Heteractis/i.test(text)) return '海葵';
  return '';
};

const getSpeciesFitAssessment = (fish: Fish, aquarium?: Aquarium | null): SpeciesFitAssessment => {
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
  const alreadyInTank = existingLivestock.some(item => item.fish.id === fish.id);
  const specialCareType = getSecondaryCareType(fish);
  const hasFilter = Boolean(aquarium?.equipment?.filter);

  const environmentFit: FitDimension[] = [
    {
      type: 'water_type',
      label: '水体类型',
      current: aquarium ? aquarium.waterType === 'Saltwater' ? '海水' : '淡水' : '未设置',
      requirement: isSaltwaterSpecies ? '海水' : '淡水',
      status: !aquarium ? 'info' : waterTypeMismatch ? 'danger' : 'ok',
      advice: !aquarium
        ? '先选择或创建鱼缸后再判断水体类型。'
        : waterTypeMismatch
          ? '当前鱼缸水体类型与该物种需求不一致，不建议直接加入。'
          : '水体类型匹配。',
    },
    {
      type: 'temperature',
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
      type: 'water_parameter',
      label: '水质参数',
      current: 'pH / 硬度未填写',
      requirement: phRange ? fish.phLevel : '资料不足',
      status: 'info',
      advice: phRange ? '当前未记录 pH / 硬度，建议补充确认；这不是混养冲突。' : '该物种缺少明确 pH 范围，可先按稳定水质管理。',
    },
  ];

  const spaceFit: FitDimension[] = [
    {
      type: 'space',
      label: '缸体大小',
      current: tankLiters ? `约 ${tankLiters}L` : '未设置',
      requirement: fish.tankSize,
      status: !tankLiters || !minLiters ? 'info' : tankLiters >= minLiters ? 'ok' : tankLiters < minLiters * 0.65 ? 'danger' : 'warning',
      advice: !tankLiters || !minLiters ? '先完善鱼缸尺寸，才能判断空间是否足够。' : tankLiters >= minLiters ? '空间基本满足最低建议。' : `当前鱼缸为空也暂无混养冲突，但该生物需要至少 ${minLiters}L 水体，当前约 ${tankLiters}L。`,
    },
  ];

  const equipmentFit: FitDimension[] = [
    {
      type: 'care_difficulty',
      label: '养护难度',
      current: '新手参考',
      requirement: getDifficultyLabel(fish.difficulty),
      status: fish.difficulty === 'Hard' ? 'warning' : 'ok',
      advice: fish.difficulty === 'Easy' ? '适合作为入门选择。' : fish.difficulty === 'Medium' ? '需要稳定水质和观察，但不是当前鱼缸不匹配项。' : '养护难度较高，建议先确认经验和设备。',
    },
    {
      type: 'filter',
      label: '过滤',
      current: aquarium?.equipment?.filter || '未设置',
      requirement: specialCareType === '水母' ? '专用水母缸 / 柔和循环水流' : '稳定过滤',
      status: !aquarium ? 'info' : specialCareType === '水母' ? 'warning' : hasFilter ? 'ok' : 'info',
      advice: !aquarium
        ? '先选择鱼缸后再确认过滤设备。'
        : specialCareType === '水母'
          ? '水母需要专用缸体，并避免普通过滤产生强吸力。'
          : hasFilter
            ? '已记录过滤设备。'
            : '当前未确认过滤设备，建议补充过滤配置。',
    },
    {
      type: 'heater',
      label: '加热',
      current: aquarium ? aquarium.equipment?.heater ? '已配置加热棒' : '未配置加热棒' : '未设置',
      requirement: needsHeater ? '建议稳定加热' : '通常不强制加热',
      status: !aquarium ? 'info' : heaterMissing ? 'warning' : 'ok',
      advice: !aquarium
        ? '先选择鱼缸后再确认加热设备。'
        : heaterMissing
          ? '该物种建议稳定加热，当前鱼缸未配置加热棒。'
          : needsHeater
            ? '已配置加热棒，建议同时使用温度计观察波动。'
            : '当前物种通常不强制配置加热棒。',
    },
  ];

  const compatibilityFit: FitDimension[] = isEmptyTank ? [] : [{
    type: alreadyInTank ? 'livestock_status' : 'compatibility',
    label: '混养',
    current: alreadyInTank ? '已在鱼缸中' : `已有 ${existingLivestock.length} 种活体`,
    requirement: fish.housingMode || '需观察',
    status: alreadyInTank ? 'ok' : fish.housingMode === '建议单养' ? 'danger' : fish.housingMode === '谨慎混养' ? 'warning' : 'ok',
    advice: alreadyInTank ? '该生物已在当前鱼缸中，本次详情用于查看现有条件是否匹配。' : fish.housingReason || '建议加入混养计算后再确认组合风险。',
  }];
  const items = [...environmentFit, ...spaceFit, ...equipmentFit, ...compatibilityFit];
  const compatibilityResult = evaluateTankCompatibility({
    tank: aquarium,
    existingSpecies: existingLivestock
      .filter(item => item.fish.id !== fish.id)
      .map(item => ({ species: item.fish, record: { quantity: item.aqFish.quantity } })),
    candidateSpecies: fish,
    candidateQuantity: 1,
  });

  const dangerCount = items.filter(item => item.status === 'danger').length;
  const warningCount = items.filter(item => item.status === 'warning').length;
  const infoCount = items.filter(item => item.status === 'info').length;
  const status = mapCompatibilityStatusToDetailStatus(compatibilityResult, { aquarium, alreadyInTank });
  const firstIssue = items.find(item => item.status === 'danger') || items.find(item => item.status === 'warning') || items.find(item => item.status === 'info');
  const title = getCompatibilityTitle(status, { isEmptyTank });
  const conclusion = status === 'alreadyInTank'
    ? '该生物已在当前鱼缸中，本页用于查看现有条件和后续观察重点。'
    : compatibilityResult.summary || firstIssue?.advice || '当前结果由系统规则计算。';
  const ruleResult = compatibilityResult;

  return {
    status,
    title,
    conclusion,
    isEmptyTank,
    alreadyInTank,
    existingLivestockCount: existingLivestock.length,
    environmentFit,
    spaceFit,
    equipmentFit,
    compatibilityFit,
    items,
    ruleResult,
    compatibilityResult,
    risks: items.filter(item => item.status === 'warning' || item.status === 'danger'),
    confirmations: items.filter(item => item.status === 'info'),
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
  finalFocusElement,
  onOpenChange,
  onAddToTank,
  onAddToCalculator,
  onToggleWishlist,
  onGoCalculator,
  onOpenTankSettings,
  onRecordDeath,
}: SpeciesDetailDialogProps) {
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'environment' | 'compatibility' | 'care'>('environment');
  const [activeMetric, setActiveMetric] = useState<FitDimension | null>(null);
  const [inlineFeedback, setInlineFeedback] = useState('');
  const [isDeathFormOpen, setIsDeathFormOpen] = useState(false);
  const [deathDate, setDeathDate] = useState(getLocalDateValue);
  const [deathReason, setDeathReason] = useState('');
  const [deathError, setDeathError] = useState('');
  const [isRecordingDeath, setIsRecordingDeath] = useState(false);
  const deathReasonRef = useRef<HTMLTextAreaElement | null>(null);
  const selectedFit = useMemo(() => fish ? getSpeciesFitAssessment(fish, aquariumContext) : null, [fish, aquariumContext]);
  const displayFit = selectedFit;
  const selectedTaxonomy = fish ? getCareTaxonomyPath(fish) : null;
  const resolvedImageSrc = fish ? (imageSrc || getSpeciesDisplayImage(fish)) : '';

  useEffect(() => {
    if (!open) return;
    setActiveTab('environment');
    setActiveMetric(null);
    setInlineFeedback('');
    setIsDeathFormOpen(false);
    setDeathDate(getLocalDateValue());
    setDeathReason('');
    setDeathError('');
    setIsRecordingDeath(false);
  }, [open, fish?.id]);

  useEffect(() => {
    if (!isDeathFormOpen) return;
    window.requestAnimationFrame(() => deathReasonRef.current?.focus());
  }, [isDeathFormOpen]);

  const openPreview = () => {
    if (!fish) return;
    setPreviewImages([{ src: resolvedImageSrc, title: fish.name }]);
    setPreviewIndex(0);
    setIsPreviewOpen(true);
  };

  const metricCards = useMemo(() => {
    if (!displayFit) return [];
    const findItem = (label: string) => displayFit.items.find(item => item.label === label);
    const water = findItem('水体类型');
    const temp = findItem('温度');
    const waterParam = findItem('水质参数');
    const space = findItem('缸体大小');
    const filter = findItem('过滤');
    const heater = findItem('加热');
    return [
      water && { ...water, label: '水体类型', icon: Waves },
      temp && { ...temp, label: '温度', icon: Thermometer },
      waterParam && { ...waterParam, label: '水质参数', icon: FlaskConical },
      space && { ...space, label: '空间', icon: Box },
      filter && { ...filter, icon: SlidersHorizontal },
      heater && { ...heater, icon: Flame },
    ].filter(Boolean) as Array<FitDimension & { icon: typeof Waves }>;
  }, [displayFit]);

  const sexIdentificationGuide = useMemo(() => fish ? getSexIdentificationGuide(fish) : null, [fish]);
  const carePresentation = useMemo(() => fish ? buildSpeciesCarePresentation(fish) : null, [fish]);
  const compatibilityPairs = useMemo(() => {
    if (!fish || !aquariumContext) return [];
    const selectedQuantity = aquariumContext.fishes.find(item => item.fishId === fish.id)?.quantity || 1;
    return getExistingLivestock(aquariumContext)
      .filter(item => item.fish.id !== fish.id)
      .map(item => evaluateCompatibilityDecision({
        tank: aquariumContext,
        items: [
          { species: fish, quantity: selectedQuantity, origin: aquariumContext.fishes.some(record => record.fishId === fish.id) ? 'existing' : 'candidate' },
          { species: item.fish, quantity: item.aqFish.quantity, origin: 'existing' },
        ],
      }).pairResults[0])
      .filter((pair): pair is PairCompatibilityResult => Boolean(pair));
  }, [fish, aquariumContext]);

  const mainActionLabel = useMemo(() => {
    if (!displayFit || !aquariumContext) return '去设置鱼缸';
    if (owned || displayFit.alreadyInTank || displayFit.status === 'alreadyInTank') return '检查混养';
    if (displayFit.status === 'suitable') return '加入当前鱼缸';
    if (displayFit.status === 'unsuitable' || displayFit.status === 'conflictRisk' || displayFit.status === 'caution') return '查看混养风险';
    return '完善鱼缸设置';
  }, [aquariumContext, displayFit, owned]);
  const fitVisualModel = useMemo<VisualResultViewModel | null>(() => {
    if (!fish || !displayFit) return null;
    const status = mapFitStatus(displayFit.status);
    const conclusion = aquariumContext ? displayFit.conclusion : '尚未选择鱼缸，选择或创建鱼缸后再判断环境适配。';
    return {
      status,
      title: aquariumContext ? '物种适配' : '尚未选择鱼缸',
      conclusion,
      emphasis: getVisualEmphasis(conclusion),
      subjects: [
        {
          id: fish.id,
          name: fish.name,
          image: getSpeciesDisplayImage(fish),
          role: 'focus',
          status,
          shortReason: conclusion,
          badgeLabel: aquariumContext ? '准备评估' : '当前物种',
          emphasis: getVisualEmphasis(conclusion),
        },
        ...(aquariumContext ? metricCards.map(metric => ({
          id: `fit-${metric.type}`,
          name: metric.label,
          role: 'affected' as const,
          status: mapFitStatus(metric.status),
          shortReason: metric.advice || `${metric.label}：${metric.current || '未设置'}`,
          badgeLabel: metric.status === 'ok' ? '匹配' : metric.status === 'info' ? '待补充' : '待调整',
          emphasis: getVisualEmphasis(metric.advice),
        })) : []),
      ],
      currentAction: aquariumContext
        ? displayFit.risks[0]?.advice || displayFit.confirmations[0]?.advice || '当前条件基本匹配，加入后继续观察。'
        : '先选择或创建鱼缸，再结合环境和缸内生物判断。',
      primaryAction: {
        label: mainActionLabel,
        actionType: displayFit.status === 'suitable' && !owned ? 'mutation' : 'section',
      },
      detailSections: [
        { id: 'risks', title: '需要处理', items: displayFit.risks.map(item => item.advice) },
        { id: 'confirmations', title: '需要确认', items: displayFit.confirmations.map(item => item.advice) },
        { id: 'matched', title: '已经匹配', items: metricCards.filter(item => item.status === 'ok').map(item => `${item.label}：${item.current}`) },
      ].filter(section => section.items.length > 0),
    };
  }, [aquariumContext, displayFit, fish, mainActionLabel, metricCards, owned]);
  const compatibilityVisualModel = useMemo<VisualResultViewModel | null>(() => {
    if (!fish) return null;
    const statusRank = { compatible: 0, caution: 1, insufficient_data: 2, not_recommended: 3 } as const;
    const status = compatibilityPairs.reduce<PairCompatibilityResult['status']>((current, pair) => (
      statusRank[pair.status] > statusRank[current] ? pair.status : current
    ), 'compatible');
    const primaryPair = [...compatibilityPairs].sort((a, b) => statusRank[b.status] - statusRank[a.status])[0];
    const conclusion = primaryPair?.primaryReason?.evidence || primaryPair?.rawResult.summary || '当前鱼缸没有可与该物种逐对比较的其他活体。';
    return {
      status,
      title: '混养关系',
      conclusion,
      emphasis: getVisualEmphasis(conclusion),
      subjects: [{
        id: fish.id,
        name: fish.name,
        image: getSpeciesDisplayImage(fish),
        role: 'focus',
        status,
        shortReason: conclusion,
        badgeLabel: '当前物种',
      }, ...compatibilityPairs.map(pair => {
        const other = pair.speciesA.id === fish.id ? pair.speciesB : pair.speciesA;
        const reason = pair.primaryReason?.evidence || pair.rawResult.summary;
        return {
          id: other.id,
          name: other.name,
          image: getSpeciesDisplayImage(other),
          role: 'related' as const,
          status: pair.status,
          shortReason: reason,
          badgeLabel: pair.primaryReason?.title || (pair.status === 'compatible' ? '暂未发现冲突' : pair.status === 'caution' ? '需要观察' : pair.status === 'not_recommended' ? '存在风险' : '资料不足'),
          emphasis: getVisualEmphasis(reason),
        };
      })],
      currentAction: primaryPair?.actions[0] || '进入完整混养计算，调整组合或补充鱼缸信息。',
      primaryAction: { label: '调整混养组合', actionType: 'route' },
      detailSections: compatibilityPairs.map(pair => {
        const other = pair.speciesA.id === fish.id ? pair.speciesB : pair.speciesA;
        return {
          id: pair.pairId,
          title: `与 ${other.name}`,
          items: [pair.primaryReason?.evidence, ...pair.secondaryReasons.map(item => item.evidence)].filter((item): item is string => Boolean(item)),
        };
      }).filter(section => section.items.length > 0),
    };
  }, [compatibilityPairs, fish]);

  const getMetricSettingsPanel = (metric: FitDimension) => {
    if (metric.type === 'space') return 'size' as const;
    if (metric.type === 'filter' || metric.type === 'heater') return 'equipment' as const;
    if (metric.type === 'temperature' || metric.type === 'water_type') return 'parameters' as const;
    return null;
  };

  const getMetricActionLabel = (metric: FitDimension) => {
    if (metric.status === 'ok') return '我知道了';
    if (metric.type === 'filter') return '配置过滤';
    if (metric.type === 'heater') return '配置加热';
    if (metric.type === 'temperature') return '设置目标温度';
    if (metric.type === 'space') return '完善鱼缸尺寸';
    if (metric.type === 'water_type') return '调整水体类型';
    return '完善鱼缸信息';
  };

  const handleMainAction = () => {
    if (!fish || !displayFit) return;
    if (!aquariumContext) {
      onOpenTankSettings?.('size');
      return;
    }
    if ((displayFit.status === 'suitable') && onAddToTank && !owned && !displayFit.alreadyInTank) {
      onAddToTank(fish);
      return;
    }
    if (owned || displayFit.alreadyInTank || displayFit.status === 'alreadyInTank') {
      if (!inCalculator) onAddToCalculator(fish);
      onGoCalculator?.();
      return;
    }
    if (displayFit.status === 'unsuitable' || displayFit.status === 'conflictRisk' || displayFit.status === 'caution') {
      if (!inCalculator) onAddToCalculator(fish);
      onGoCalculator?.();
      return;
    }
    const firstIssue = metricCards.find(item => item.status !== 'ok' && getMetricSettingsPanel(item));
    if (firstIssue) {
      setActiveMetric(firstIssue);
    } else {
      onOpenTankSettings?.('parameters');
    }
  };

  const handleOpenCalculator = () => {
    if (!fish) return;
    if (!inCalculator) onAddToCalculator(fish);
    onGoCalculator?.();
  };

  const handleRecordDeath = async () => {
    if (!fish || !onRecordDeath || isRecordingDeath) return;
    if (!deathDate || !deathReason.trim()) {
      setDeathError('请填写日期和原因后再保存。');
      deathReasonRef.current?.focus();
      return;
    }
    setIsRecordingDeath(true);
    setDeathError('');
    try {
      await onRecordDeath(fish, { date: deathDate, reason: deathReason.trim() });
      setIsDeathFormOpen(false);
      setInlineFeedback(`已保存 ${fish.name} 的生命纪念。`);
    } catch (error) {
      setDeathError(error instanceof Error ? error.message : '保存失败，请稍后重试。');
    } finally {
      setIsRecordingDeath(false);
    }
  };

  const handleShare = async () => {
    if (!fish) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: fish.name, text: `${fish.name} - AquaGuide 鱼种适配参考` });
      } else {
        await navigator.clipboard?.writeText(`${fish.name} - AquaGuide 鱼种适配参考`);
      }
      setInlineFeedback('已复制分享信息');
    } catch {
      setInlineFeedback('暂时无法分享，可稍后再试');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <AdaptiveDetailContent showCloseButton={false} finalFocus={finalFocusElement ? () => finalFocusElement : undefined}>
          {fish && displayFit && (
            <div className="flex min-h-0 flex-1 flex-col bg-white">
              <div className="modalHeader flex items-center justify-between border-b border-border bg-white px-4 py-3">
                <button type="button" onClick={() => onOpenChange(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-bg text-ink/60 hover:text-accent" aria-label="返回">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <button type="button" onClick={handleShare} className="flex h-10 w-10 items-center justify-center rounded-full bg-bg text-ink/60 hover:text-accent" aria-label="分享">
                  <Share2 className="h-5 w-5" />
                </button>
              </div>

              <div className="modalBody app-scrollbar-hidden p-0">
                <div className="p-4 pb-28">
                  <div className="rounded-[20px] border border-border bg-white p-3 shadow-sm">
                    <div className="grid grid-cols-[128px_1fr] gap-3">
                      {fish.id === 'sp_0260' ? (
                        <Suspense fallback={<div className="flex aspect-[1.18] min-h-[112px] items-center justify-center rounded-[16px] border border-border/70 bg-slate-50 text-[10px] text-slate-400">3D 加载中...</div>}>
                          <Interactive3DFishWrapper
                            imageUrl={resolvedImageSrc}
                            className={`flex aspect-[1.18] min-h-[112px] items-center justify-center rounded-[16px] border border-border/70 ${getSpeciesImageSurfaceClass(fish)} p-0 shadow-sm overflow-hidden`}
                          />
                        </Suspense>
                      ) : (
                        <button type="button" onClick={openPreview} data-species-detail-hero className={`flex aspect-[1.18] min-h-[112px] items-center justify-center rounded-[16px] border border-border/70 ${getSpeciesImageSurfaceClass(fish)} p-2 shadow-sm`} aria-label={`放大查看${fish.name}图片`}>
                          <img src={resolvedImageSrc} alt={fish.name} className={`h-[88%] w-[88%] object-contain ${getSpeciesImageClass(fish)}`} referrerPolicy="no-referrer" />
                        </button>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <DialogTitle className="font-serif text-[22px] italic font-bold leading-tight text-ink">{fish.name}</DialogTitle>
                            <DialogDescription className="mt-1 text-[12px] font-medium leading-tight text-ink/55">{fish.scientificName}</DialogDescription>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${getDifficultyBadgeClass(fish.difficulty)}`}>{getDifficultyLabel(fish.difficulty)}</span>
                        </div>
                        <div className="mt-3 flex max-h-[58px] flex-wrap gap-1.5 overflow-hidden">
                          {[selectedTaxonomy?.variety, fish.housingMode, ...getToolFunctions(fish)].filter(Boolean).slice(0, 3).map(tag => {
                            const displayTag = tag === '主题生物' ? '观赏主角' : tag === '单独饲养' ? '建议单养' : tag;
                            return <span key={tag} className="rounded-full border border-border bg-white px-2 py-1 text-[10px] font-bold text-ink/60">{displayTag}</span>;
                          })}
                        </div>
                        <p className="mt-3 line-clamp-1 text-[12px] font-bold leading-relaxed text-ink/62">{getSpeciesRole(fish)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-[18px] border border-border bg-white p-2 shadow-sm">
                    {[
                      { label: '检查混养', icon: Calculator, active: inCalculator, action: handleOpenCalculator },
                      { label: inWishlist ? '已种草' : '加入种草', icon: inWishlist ? Heart : HeartOff, active: inWishlist, action: () => onToggleWishlist(fish.id) },
                      onRecordDeath ? { label: '更多操作', icon: Skull, active: false, action: () => setIsDeathFormOpen(true) } : null,
                    ].filter(Boolean).map(item => {
                      const actionItem = item as { label: string; icon: typeof Calculator; active: boolean; action: () => void };
                      const Icon = actionItem.icon;
                      return (
                        <button
                          key={actionItem.label}
                          type="button"
                          onClick={actionItem.action}
                          aria-pressed={actionItem.active}
                          className={`flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 rounded-[14px] border px-1 text-[10px] font-black transition-colors ${
                            actionItem.active ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-border bg-white text-ink/62 hover:border-accent/25 hover:bg-bg'
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${actionItem.active ? 'text-emerald-600' : 'text-accent'}`} />
                          <span className="max-w-full truncate">{actionItem.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid grid-cols-3 border-b border-border">
                    {[
                      { id: 'environment', label: '环境适配' },
                      { id: 'compatibility', label: '混养关系' },
                      { id: 'care', label: '喂养养护' },
                    ].map(tab => (
                      <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`relative h-11 text-[14px] font-black transition-colors ${activeTab === tab.id ? 'text-accent' : 'text-ink/45'}`}>
                        {tab.label}
                        {activeTab === tab.id && <span className="absolute inset-x-5 bottom-0 h-[3px] rounded-full bg-accent" />}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'environment' && (
                    <div className="mt-4 grid gap-4">
                      {fitVisualModel && (
                        <VisualResultCard
                          model={fitVisualModel}
                          onPrimaryAction={handleMainAction}
                          onSubjectSelect={subject => {
                            const metric = metricCards.find(item => `fit-${item.type}` === subject.id);
                            if (metric) setActiveMetric(metric);
                          }}
                        />
                      )}
                    </div>
                  )}

                  {activeTab === 'compatibility' && (
                    <div className="mt-4 grid gap-3">
                      {compatibilityVisualModel && <VisualResultCard model={compatibilityVisualModel} onPrimaryAction={handleOpenCalculator} />}
                      {(fish.housingMode || fish.housingReason) && (
                        <details className="rounded-[16px] border border-border bg-white/70 p-3">
                          <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-black text-ink">通用饲养倾向 · 类别参考<ChevronRight className="h-4 w-4 text-ink/40" /></summary>
                          <div className="mt-3 rounded-[12px] bg-bg p-3 text-[12px] font-medium leading-relaxed text-ink/60">
                            <div className="font-black text-ink">{fish.housingMode || '需结合具体组合判断'}</div>
                            {fish.housingReason && <p className="mt-1">{fish.housingReason}</p>}
                            <p className="mt-2 text-[10px] font-bold text-amber-700">该内容是类别通用参考，不代表当前鱼缸的逐对混养结论。</p>
                          </div>
                        </details>
                      )}
                    </div>
                  )}

                  {activeTab === 'care' && (
                    <div className="mt-4 grid gap-3">
                      {sexIdentificationGuide && (
                        <details open className="rounded-[16px] border border-emerald-100 bg-emerald-50/60 p-3 shadow-sm">
                          <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-black text-ink">
                            {sexIdentificationGuide.title}
                            <ChevronRight className="h-4 w-4 text-ink/40" />
                          </summary>
                          <p className="mt-3 text-[12px] font-bold leading-relaxed text-ink/62">{sexIdentificationGuide.summary}</p>
                          <div className="mt-3 grid gap-2">
                            {sexIdentificationGuide.points.map(point => (
                              <div key={point} className="rounded-[12px] bg-white px-3 py-2 text-[12px] font-medium leading-relaxed text-ink/64">
                                {point}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                      {carePresentation && (
                        <>
                          <section className="rounded-[16px] border border-border bg-white p-3 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-[14px] font-black text-ink">喂养资料</h3>
                                <p className="mt-1 text-[11px] font-medium leading-relaxed text-ink/52">{carePresentation.sourceDetail}</p>
                              </div>
                              <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${getCareSourceClass(carePresentation.sourceStatus)}`}>{carePresentation.sourceLabel}</span>
                            </div>
                            {carePresentation.feedingItems.length > 0 ? (
                              <div className="mt-3 grid gap-2">
                                {carePresentation.feedingItems.map(item => (
                                  <div key={item.label} className="rounded-[12px] bg-bg p-3">
                                    <div className="text-[10px] font-black text-ink/42">{item.label}</div>
                                    <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/65">{item.value}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-3 rounded-[12px] bg-bg p-3 text-[12px] font-bold text-ink/55">暂无经过复核的物种专属资料。</div>
                            )}
                          </section>
                          <section className="rounded-[16px] border border-border bg-white p-3 shadow-sm">
                            <h3 className="text-[14px] font-black text-ink">环境节奏</h3>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {carePresentation.environmentItems.map(item => (
                                <div key={item.label} className="rounded-[12px] bg-bg p-3">
                                  <div className="text-[10px] font-black text-ink/42">{item.label}</div>
                                  <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/65">{item.value}</p>
                                </div>
                              ))}
                            </div>
                          </section>
                        </>
                      )}
                    </div>
                  )}

                  {(detailFeedback || inlineFeedback) && (
                    <div className="mt-3 rounded-[14px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12px] font-bold text-emerald-800">
                      {detailFeedback || inlineFeedback}
                      {detailFeedback && onGoCalculator && <button type="button" className="ml-2 rounded-full bg-white px-2 py-1 text-[10px] font-black text-emerald-700" onClick={onGoCalculator}>去计算</button>}
                    </div>
                  )}
                      </div>
              </div>

              <div className="modalFooter border-t border-border bg-white/95 px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4">
                <Button className="h-12 w-full rounded-full bg-accent text-base font-black text-white hover:bg-accent/90" onClick={handleMainAction}>{mainActionLabel}</Button>
              </div>

              {activeMetric && (
                <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/24 px-3 pb-3">
                  <button type="button" className="absolute inset-0" aria-label="关闭参数编辑" onClick={() => setActiveMetric(null)} />
                  <div className="relative w-full max-w-[520px] rounded-[26px] bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
                    <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-ink/12" />
                    <h3 className="text-[18px] font-black text-ink">{activeMetric.status === 'ok' ? '查看环境指标' : `调整${activeMetric.label}`}</h3>
                    <div className="mt-3 grid gap-2 rounded-[18px] bg-bg p-3">
                      <div className="flex justify-between gap-3 text-[13px] font-bold text-ink/60"><span>当前</span><span className={getFitCurrentClass(activeMetric.status)}>{activeMetric.current || '未设置'}</span></div>
                      <div className="flex justify-between gap-3 text-[13px] font-bold text-ink/60"><span>目标范围</span><span className="text-ink">{activeMetric.requirement || '按鱼种需求确认'}</span></div>
                    </div>
                    <p className="mt-3 text-[12px] font-medium leading-relaxed text-ink/55">{activeMetric.advice || '当前页面不直接写入鱼缸设置，请到鱼缸设置中完善后重新评估。'}</p>
                    {getMetricSettingsPanel(activeMetric) && onOpenTankSettings && (
                      <Button className="mt-4 h-11 w-full rounded-full bg-accent text-sm font-black text-white hover:bg-accent/90" onClick={() => {
                        const panel = getMetricSettingsPanel(activeMetric);
                        if (!panel) return;
                        setActiveMetric(null);
                        onOpenTankSettings(panel);
                      }}>{getMetricActionLabel(activeMetric)}</Button>
                    )}
                  </div>
                </div>
              )}

              {isDeathFormOpen && (
                <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/30 px-4" role="dialog" aria-modal="true" aria-labelledby="death-record-title">
                  <button type="button" className="absolute inset-0" aria-label="取消记录" onClick={() => !isRecordingDeath && setIsDeathFormOpen(false)} />
                  <div className="relative w-full max-w-[440px] rounded-[24px] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.24)]">
                    <h3 id="death-record-title" className="text-[18px] font-black text-ink">记录生命纪念</h3>
                    <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/58">保存后会同步更新鱼缸、水族册和“认真复盘”勋章。</p>
                    <label className="mt-4 block text-[12px] font-black text-ink" htmlFor="death-date">日期</label>
                    <input id="death-date" type="date" value={deathDate} onChange={event => setDeathDate(event.target.value)} disabled={isRecordingDeath} className="mt-2 h-11 w-full rounded-[14px] border border-border bg-white px-3 text-[14px] font-bold text-ink outline-none focus:border-accent" />
                    <label className="mt-4 block text-[12px] font-black text-ink" htmlFor="death-reason">原因与复盘</label>
                    <textarea ref={deathReasonRef} id="death-reason" value={deathReason} onChange={event => setDeathReason(event.target.value)} disabled={isRecordingDeath} rows={4} placeholder="例如：发现时的状态、可能原因和以后会注意什么" className="mt-2 w-full resize-none rounded-[14px] border border-border bg-white p-3 text-[14px] font-medium leading-relaxed text-ink outline-none focus:border-accent" />
                    {deathError && <p className="mt-2 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] font-bold text-red-700" role="alert">{deathError}</p>}
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <Button variant="outline" className="h-11 rounded-full border-border text-sm font-black" disabled={isRecordingDeath} onClick={() => setIsDeathFormOpen(false)}>取消</Button>
                      <Button className="h-11 rounded-full bg-ink text-sm font-black text-white hover:bg-ink/90" disabled={isRecordingDeath} onClick={handleRecordDeath}>{isRecordingDeath ? '正在保存…' : '确认保存'}</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {false && fish && displayFit && (
            <div className="flex min-h-0 flex-1 flex-col bg-white">
              <div className="modalBody app-scrollbar-hidden p-0">
                <div className="modalHeader border-b border-border bg-gradient-to-br from-white via-sky-50/50 to-emerald-50/60 p-4">
                  <button
                    type="button"
                    onClick={openPreview}
                    data-species-detail-hero
                    className={`flex h-[250px] w-full items-center justify-center rounded-[18px] border border-border/70 ${getSpeciesImageSurfaceClass(fish)} p-3 shadow-sm`}
                    aria-label={`放大查看${fish.name}图片`}
                  >
                    <img src={resolvedImageSrc} alt={fish.name} className={`h-[84%] w-[84%] object-contain ${getSpeciesImageClass(fish)}`} referrerPolicy="no-referrer" />
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
                      {[selectedTaxonomy?.variety, fish.housingMode, ...getToolFunctions(fish)].filter(Boolean).slice(0, 3).map(tag => {
                        const displayTag = tag === '主题生物' ? '观赏主角' : tag === '单独饲养' ? '建议单养' : tag;
                        return (
                          <span key={tag} className="rounded-full border border-border bg-white px-2 py-1 text-[10px] font-bold text-ink/60">{displayTag}</span>
                        );
                      })}
                    </div>
                    <p className="mt-3 line-clamp-1 text-[12px] font-medium leading-relaxed text-ink/62">{getSpeciesRole(fish)}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-4 md:p-6">
                  {(() => {
                    const tone = getAssessmentTone(displayFit.status);
                    return (
                  <div className={`rounded-[18px] border p-4 ${tone === 'suitable' ? 'border-emerald-100 bg-emerald-50/80' : tone === 'risk' ? 'border-red-100 bg-red-50/80' : tone === 'warning' ? 'border-amber-100 bg-amber-50/80' : 'border-sky-100 bg-sky-50/80'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white ${tone === 'suitable' ? 'text-emerald-600' : tone === 'risk' ? 'text-red-600' : tone === 'warning' ? 'text-amber-600' : 'text-sky-600'}`}>
                        {displayFit.status === 'suitable' || displayFit.status === 'alreadyInTank' ? <CheckCircle2 className="h-5 w-5" /> : displayFit.status === 'unknown' || displayFit.status === 'needConfirmation' ? <Info className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-black text-ink/45">{source === 'aquarium' ? '当前鱼缸适配' : '能不能养'}</div>
                        <p className="mt-1 text-[18px] font-black leading-tight text-ink">
                          {displayFit.title}
                        </p>
                        <p className="mt-1 text-[12px] font-bold leading-relaxed text-ink/68">{displayFit.conclusion}</p>
                        <p className="mt-1 text-[11px] font-medium text-ink/55">
                          参考鱼缸：{aquariumContext ? `${aquariumContext.name} · ${aquariumContext.waterType === 'Saltwater' ? '海水' : '淡水'} · ${aquariumContext.targetTemperature || '温度未设置'}℃` : '暂无鱼缸数据'}
                        </p>
                      </div>
                    </div>
                  </div>
                    );
                  })()}

                  <section className="grid grid-cols-3 gap-2">
                    {displayFit.items.filter(item => ['水体类型', '温度', '缸体大小', '水质参数', '设备', '混养'].includes(item.label)).slice(0, 6).map(item => (
                      <div key={item.label} className="rounded-[14px] border border-border bg-bg/45 p-2">
                        <div className="text-[11px] font-black text-ink">{item.label === '缸体大小' ? '空间' : item.label}</div>
                        {item.status !== 'ok' && (
                          <div className="mt-1 line-clamp-2 text-[9px] font-medium leading-snug text-ink/48">
                            需求：{item.requirement}
                            <span className={getFitCurrentClass(item.status)}>（当前：{item.current}）</span>
                          </div>
                        )}
                        <span className={`mt-2 inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-black ${getFitStatusClass(item.status)}`}>{getFitStatusLabel(item.status)}</span>
                      </div>
                    ))}
                  </section>

                  <div className="grid gap-2">
                    {owned || displayFit.alreadyInTank ? (
                      <div className="flex h-11 items-center justify-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 text-sm font-black text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" /> 已在鱼缸中
                      </div>
                    ) : onAddToTank ? (
                      <Button className="h-11 rounded-full bg-accent text-sm font-black text-white hover:bg-accent/90" onClick={() => onAddToTank(fish)}>
                        <Plus className="mr-1 h-4 w-4" />{
                          displayFit.status === 'unknown'
                            ? '先配置鱼缸环境'
                            : displayFit.status === 'conflictRisk'
                              ? '查看风险后确认添加'
                              : displayFit.status === 'setupNeeded'
                                ? displayFit.isEmptyTank ? '完善鱼缸环境' : '调整后加入'
                                : displayFit.status === 'unsuitable'
                                  ? '先配置鱼缸环境'
                                  : displayFit.status === 'needConfirmation'
                                    ? '补充确认后加入'
                                  : '添加到我的鱼缸'
                        }
                      </Button>
                    ) : null}
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

                  <details open className="rounded-[16px] border border-border bg-white p-3 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-black text-ink">
                      系统适配结果
                      <ChevronRight className="h-4 w-4 text-ink/38" />
                    </summary>
                    <div className="mt-3 grid gap-2">
                      <div className="rounded-[12px] bg-bg p-2">
                        <div className="text-[10px] font-bold text-ink/42">{displayFit.isEmptyTank ? '当前状态' : '性情 / 混养'}</div>
                        <div className="mt-1 text-[12px] font-black text-ink">
                          {displayFit.isEmptyTank ? '空鱼缸，暂无混养冲突' : displayFit.alreadyInTank ? '已在鱼缸中 · 查看现有条件' : `${getTemperamentLabel(fish.temperament)} · ${fish.housingMode || '需观察'}`}
                        </div>
                      </div>
                      <p className="rounded-[12px] bg-bg p-2 text-[11px] font-medium leading-relaxed text-ink/65">
                        {displayFit.isEmptyTank
                          ? '请优先确认水体类型、水温、空间和设备；有活体入缸后再判断混养关系。'
                          : displayFit.alreadyInTank ? '该生物已经在当前鱼缸中，当前页面不再提供重复加入入口。' : fish.housingReason || '建议加入混养计算后再确认。'}
                      </p>
                      {displayFit.risks.length > 0 && (
                        <div className="grid gap-1.5">
                          {displayFit.risks.slice(0, 4).map(item => (
                            <div key={item.label} className="rounded-[12px] border border-amber-100 bg-amber-50/60 p-2">
                              <div className="text-[11px] font-black text-ink">{item.label}</div>
                              <p className="mt-0.5 text-[10px] font-medium leading-relaxed text-ink/60">{item.advice}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {displayFit.confirmations.length > 0 && (
                        <div className="grid gap-1.5">
                          {displayFit.confirmations.slice(0, 4).map(item => (
                            <div key={item.label} className="rounded-[12px] border border-sky-100 bg-sky-50/70 p-2">
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

                </div>
              </div>
            </div>
          )}
        </AdaptiveDetailContent>
      </Dialog>

      {isPreviewOpen && (
        <Suspense fallback={null}>
          <ImagePreviewModal images={previewImages} index={previewIndex} open onClose={() => setIsPreviewOpen(false)} onIndexChange={setPreviewIndex} />
        </Suspense>
      )}
    </>
  );
}
