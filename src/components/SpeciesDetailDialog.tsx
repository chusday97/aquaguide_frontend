import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  t: any,
) => {
  if (status === 'alreadyInTank') return t('encyclopedia.fitStatusInTank');
  if (status === 'suitable') return options.isEmptyTank ? t('encyclopedia.fitStatusNewTank') : t('encyclopedia.fitStatusSuitable');
  if (status === 'needConfirmation') return t('encyclopedia.fitStatusMatchConfirm');
  if (status === 'caution') return t('encyclopedia.fitStatusTryCaution');
  if (status === 'conflictRisk') return t('encyclopedia.fitStatusCautionMix');
  if (status === 'unsuitable') return t('encyclopedia.fitStatusUnsuitable');
  return t('encyclopedia.fitStatusSetupNeeded');
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

const getSpeciesFitAssessment = (fish: Fish, aquarium: Aquarium | null | undefined, t: any): SpeciesFitAssessment => {
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
      current: aquarium ? (aquarium.waterType === 'Saltwater' ? t('encyclopedia.saltwater_label') : t('encyclopedia.freshwater_label')) : t('encyclopedia.noTankSelected'),
      requirement: isSaltwaterSpecies ? t('encyclopedia.saltwater_label') : t('encyclopedia.freshwater_label'),
      status: !aquarium ? 'info' : waterTypeMismatch ? 'danger' : 'ok',
      advice: !aquarium
        ? t('encyclopedia.adviceWaterTypeNoTank')
        : waterTypeMismatch
          ? t('encyclopedia.adviceWaterTypeMismatch')
          : t('encyclopedia.waterTypeMatch'),
    },
    {
      type: 'temperature',
      label: '温度',
      current: currentTemperature ? `${currentTemperature}℃` : t('encyclopedia.noTankSelected'),
      requirement: fish.waterTemperature,
      status: !aquarium || !currentTemperature || !tempRange
        ? 'info'
        : currentTemperature >= tempRange.min && currentTemperature <= tempRange.max ? 'ok' : 'warning',
      advice: !aquarium || !currentTemperature
        ? t('encyclopedia.adviceTempNoTank')
        : currentTemperature >= (tempRange?.min || 0) && currentTemperature <= (tempRange?.max || 99)
          ? t('encyclopedia.tempMatch')
          : t('encyclopedia.tempWarning', { range: fish.waterTemperature, current: currentTemperature }),
    },
    {
      type: 'water_parameter',
      label: '水质参数',
      current: phRange ? t('encyclopedia.phMatch') : t('encyclopedia.fitInsufficient'),
      requirement: phRange ? fish.phLevel : t('encyclopedia.fitInsufficient'),
      status: 'info',
      advice: phRange ? t('encyclopedia.phMatch') : t('encyclopedia.phWarning', { range: fish.phLevel, current: 'pH' }),
    },
  ];

  const spaceFit: FitDimension[] = [
    {
      type: 'space',
      label: '缸体大小',
      current: tankLiters ? `~${tankLiters}L` : t('encyclopedia.noTankSelected'),
      requirement: fish.tankSize,
      status: !tankLiters || !minLiters ? 'info' : tankLiters >= minLiters ? 'ok' : tankLiters < minLiters * 0.65 ? 'danger' : 'warning',
      advice: !tankLiters || !minLiters
        ? t('encyclopedia.adviceSpaceNoTank')
        : tankLiters >= minLiters
          ? t('encyclopedia.adviceSpaceSuitable')
          : t('encyclopedia.adviceSpaceWarning', { min: minLiters, current: tankLiters }),
    },
  ];

  const equipmentFit: FitDimension[] = [
    {
      type: 'care_difficulty',
      label: '养护难度',
      current: t('encyclopedia.difficultyCategory'),
      requirement: fish.difficulty === 'Easy' ? t('encyclopedia.difficultyEasyShort') : fish.difficulty === 'Medium' ? t('encyclopedia.difficultyMediumShort') : t('encyclopedia.difficultyHardShort'),
      status: fish.difficulty === 'Hard' ? 'warning' : 'ok',
      advice: fish.difficulty === 'Easy' ? t('encyclopedia.adviceEasy') : fish.difficulty === 'Medium' ? t('encyclopedia.adviceMedium') : t('encyclopedia.adviceHard'),
    },
    {
      type: 'filter',
      label: '过滤',
      current: aquarium?.equipment?.filter || t('encyclopedia.noTankSelected'),
      requirement: specialCareType === '水母' ? (t('encyclopedia.freshwater') === '淡水' ? '专用水母缸 / 柔和循环水流' : 'Specialized Jellyfish Tank') : (t('encyclopedia.freshwater') === '淡水' ? '稳定过滤' : 'Stable Filtration'),
      status: !aquarium ? 'info' : specialCareType === '水母' ? 'warning' : hasFilter ? 'ok' : 'info',
      advice: !aquarium
        ? t('encyclopedia.adviceFilterNoTank')
        : specialCareType === '水母'
          ? (t('encyclopedia.freshwater') === '淡水' ? '水母需要专用缸体，并避免普通过滤产生强吸力。' : 'Jellyfish require specialized tanks to avoid strong suction from standard filters.')
          : hasFilter
            ? (t('encyclopedia.freshwater') === '淡水' ? '已记录过滤设备。' : 'Filter recorded.')
            : (t('encyclopedia.freshwater') === '淡水' ? '当前未确认过滤设备，建议补充过滤配置。' : 'No filter confirmed yet. Adding filtration is recommended.'),
    },
    {
      type: 'heater',
      label: '加热',
      current: aquarium ? (aquarium.equipment?.heater ? t('encyclopedia.heaterYes') : t('encyclopedia.heaterNo')) : t('encyclopedia.noTankSelected'),
      requirement: needsHeater ? t('encyclopedia.heaterYes') : t('encyclopedia.heaterNo'),
      status: !aquarium ? 'info' : heaterMissing ? 'warning' : 'ok',
      advice: !aquarium
        ? t('encyclopedia.adviceHeaterNoTank')
        : heaterMissing
          ? t('encyclopedia.adviceHeaterWarning')
          : needsHeater
            ? (t('encyclopedia.freshwater') === '淡水' ? '已配置加热棒，建议同时使用温度计观察波动。' : 'Heater configured. Thermometer is recommended to monitor temp fluctuations.')
            : (t('encyclopedia.freshwater') === '淡水' ? '当前物种通常不强制配置加热棒。' : 'Heater not strictly required for this species.'),
    },
  ];

  const compatibilityFit: FitDimension[] = isEmptyTank ? [] : [{
    type: alreadyInTank ? 'livestock_status' : 'compatibility',
    label: '混养',
    current: alreadyInTank ? t('encyclopedia.inTankAlready') : t('encyclopedia.livestockCount', { count: existingLivestock.length }),
    requirement: fish.housingMode ? translateTag(fish.housingMode, t) : t('encyclopedia.fitCaution'),
    status: alreadyInTank ? 'ok' : fish.housingMode === '建议单养' ? 'danger' : fish.housingMode === '谨慎混养' ? 'warning' : 'ok',
    advice: alreadyInTank ? t('encyclopedia.adviceLivestockInTank') : fish.housingReason || t('encyclopedia.adviceHousingDefault'),
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
  const title = getCompatibilityTitle(status, { isEmptyTank }, t);
  const conclusion = status === 'alreadyInTank'
    ? t('encyclopedia.adviceAlreadyInTankPage')
    : compatibilityResult.summary || firstIssue?.advice || t('encyclopedia.fitPending');
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

const roleLabelKeys: Record<string, string> = {
  '观赏生物 / 特殊缸体': 'roleSpecialTank',
  '观赏生物 / 海水特殊养护': 'roleMarineCare',
  '水草造景 / 环境植物': 'rolePlantedEnvironment',
  '造景素材 / 环境配置': 'roleSceneryConfig',
  '工具虾螺 / 除藻生物': 'roleAlgaeCrew',
  '工具生物 / 除藻辅助': 'roleAlgaeHelper',
  '底层生物 / 清残饵': 'roleBottomCrew',
  '水陆生物 / 独立规划': 'roleAmphibianIndy',
  '观赏主角 / 建议单养': 'roleSingleMain',
  '小型观赏鱼 / 群游搭配': 'roleSmallSchooling',
  '工具生物 / 生态搭配': 'roleEcoInvertebrate',
  '观赏无脊椎 / 生态搭配': 'roleEcoInvertebrate2',
  '观赏生物 / 鱼缸搭配': 'roleGeneralLivestock',
};

const translateTag = (tag: string, t: any) => {
  if (tag === '适合混养') return t('encyclopedia.compatible');
  if (tag === '谨慎混养') return t('encyclopedia.cautionMix');
  if (tag === '建议单养' || tag === '单独饲养') return t('encyclopedia.singleSpecimen');
  if (tag === '主题生物' || tag === '观赏主角') return t('encyclopedia.roleSingleMain');
  return tag;
};

const getLocalizedSpeciesRole = (fish: Fish, t: any) => {
  const role = getSpeciesRole(fish);
  return roleLabelKeys[role] ? t('encyclopedia.' + roleLabelKeys[role]) : role;
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
  const { t } = useTranslation();
  const translateLabel = (label: string) => {
    if (label === '水体类型') return t('encyclopedia.waterType');
    if (label === '温度') return t('encyclopedia.tempLabelBasic');
    if (label === '水质参数') return t('encyclopedia.phRangeLabel');
    if (label === '空间' || label === '缸体大小') return t('encyclopedia.spaceLabel');
    if (label === '过滤') return t('encyclopedia.filterLabel');
    if (label === '加热') return t('encyclopedia.heaterLabel');
    if (label === '养护难度') return t('encyclopedia.difficultyLabel');
    if (label === '混养') return t('encyclopedia.temperamentMixing');
    return label;
  };
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
  const selectedFit = useMemo(() => fish ? getSpeciesFitAssessment(fish, aquariumContext, t) : null, [fish, aquariumContext, t]);
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
    if (!displayFit || !aquariumContext) return t('encyclopedia.btnGoSetTank');
    if (owned || displayFit.alreadyInTank || displayFit.status === 'alreadyInTank') return t('encyclopedia.checkDetails');
    if (displayFit.status === 'suitable') return t('encyclopedia.btnJoinTank');
    if (displayFit.status === 'unsuitable' || displayFit.status === 'conflictRisk' || displayFit.status === 'caution') return t('encyclopedia.viewRiskAndAdd');
    return t('encyclopedia.btnCompleteSetup');
  }, [aquariumContext, displayFit, owned, t]);
  const fitVisualModel = useMemo<VisualResultViewModel | null>(() => {
    if (!fish || !displayFit) return null;
    const status = mapFitStatus(displayFit.status);
    const conclusion = aquariumContext ? displayFit.conclusion : t('encyclopedia.conclusionNoTank');
    return {
      status,
      title: aquariumContext ? t('encyclopedia.titleSpeciesFit') : t('encyclopedia.titleNoTankSelected'),
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
          badgeLabel: aquariumContext ? t('encyclopedia.preCheckLabel') : t('encyclopedia.currentSpec'),
          emphasis: getVisualEmphasis(conclusion),
        },
        ...(aquariumContext ? metricCards.map(metric => ({
          id: `fit-${metric.type}`,
          name: translateLabel(metric.label),
          role: 'affected' as const,
          status: mapFitStatus(metric.status),
          shortReason: metric.advice || `${translateLabel(metric.label)}：${metric.current || t('encyclopedia.noTankSelected')}`,
          badgeLabel: metric.status === 'ok' ? t('encyclopedia.fitStatusOkLabel') : metric.status === 'info' ? t('encyclopedia.fitStatusInfoLabel') : t('encyclopedia.fitStatusWarningLabel'),
          emphasis: getVisualEmphasis(metric.advice),
        })) : []),
      ],
      currentAction: aquariumContext
        ? displayFit.risks[0]?.advice || displayFit.confirmations[0]?.advice || t('encyclopedia.adviceHousingDefault')
        : t('encyclopedia.actionNoTank'),
      primaryAction: {
        label: mainActionLabel,
        actionType: displayFit.status === 'suitable' && !owned ? 'mutation' : 'section',
      },
      detailSections: [
        { id: 'risks', title: t('encyclopedia.fitStatusWarningLabel'), items: displayFit.risks.map(item => item.advice) },
        { id: 'confirmations', title: t('encyclopedia.fitAdjustable'), items: displayFit.confirmations.map(item => item.advice) },
        { id: 'matched', title: t('encyclopedia.fitStatusOkLabel'), items: metricCards.filter(item => item.status === 'ok').map(item => `${translateLabel(item.label)}：${item.current}`) },
      ].filter(section => section.items.length > 0),
    };
  }, [aquariumContext, displayFit, fish, mainActionLabel, metricCards, owned, t]);
  const compatibilityVisualModel = useMemo<VisualResultViewModel | null>(() => {
    if (!fish) return null;
    const statusRank = { compatible: 0, caution: 1, insufficient_data: 2, not_recommended: 3 } as const;
    const status = compatibilityPairs.reduce<PairCompatibilityResult['status']>((current, pair) => (
      statusRank[pair.status] > statusRank[current] ? pair.status : current
    ), 'compatible');
    const primaryPair = [...compatibilityPairs].sort((a, b) => statusRank[b.status] - statusRank[a.status])[0];
    const conclusion = primaryPair?.primaryReason?.evidence || primaryPair?.rawResult.summary || t('encyclopedia.conclusionNoPairs');
    return {
      status,
      title: t('encyclopedia.compatibilityCalc'),
      conclusion,
      emphasis: getVisualEmphasis(conclusion),
      subjects: [{
        id: fish.id,
        name: fish.name,
        image: getSpeciesDisplayImage(fish),
        role: 'focus',
        status,
        shortReason: conclusion,
        badgeLabel: t('encyclopedia.currentSpec'),
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
          badgeLabel: pair.primaryReason?.title || (pair.status === 'compatible' ? t('encyclopedia.housingBehaviorMatch') : pair.status === 'caution' ? t('encyclopedia.fitCaution') : pair.status === 'not_recommended' ? t('encyclopedia.fitNotRecommended') : t('encyclopedia.fitInsufficient')),
          emphasis: getVisualEmphasis(reason),
        };
      })],
      currentAction: primaryPair?.actions[0] || t('encyclopedia.actionNoPairs'),
      primaryAction: { label: t('encyclopedia.compatibilityCalc'), actionType: 'route' },
      detailSections: compatibilityPairs.map(pair => {
        const other = pair.speciesA.id === fish.id ? pair.speciesB : pair.speciesA;
        return {
          id: pair.pairId,
          title: t('encyclopedia.withSpecies', { name: other.name }),
          items: [pair.primaryReason?.evidence, ...pair.secondaryReasons.map(item => item.evidence)].filter((item): item is string => Boolean(item)),
        };
      }).filter(section => section.items.length > 0),
    };
  }, [compatibilityPairs, fish, t]);

  const getMetricSettingsPanel = (metric: FitDimension) => {
    if (metric.type === 'space') return 'size' as const;
    if (metric.type === 'filter' || metric.type === 'heater') return 'equipment' as const;
    if (metric.type === 'temperature' || metric.type === 'water_type') return 'parameters' as const;
    return null;
  };

  const getMetricActionLabel = (metric: FitDimension) => {
    if (metric.status === 'ok') return t('encyclopedia.dismiss');
    if (metric.type === 'filter') return t('encyclopedia.btnCompleteEnvDetail');
    if (metric.type === 'heater') return t('encyclopedia.btnCompleteEnvDetail');
    if (metric.type === 'temperature') return t('encyclopedia.actionCompleteTemp');
    if (metric.type === 'space') return t('encyclopedia.actionCompleteSize');
    if (metric.type === 'water_type') return t('encyclopedia.actionCompleteWaterType');
    return t('encyclopedia.actionCompleteInfo');
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
      setDeathError(t('encyclopedia.freshwater') === '淡水' ? '请填写日期和原因后再保存。' : 'Please enter date and reason.');
      deathReasonRef.current?.focus();
      return;
    }
    setIsRecordingDeath(true);
    setDeathError('');
    try {
      await onRecordDeath(fish, { date: deathDate, reason: deathReason.trim() });
      setIsDeathFormOpen(false);
      setInlineFeedback(t('encyclopedia.freshwater') === '淡水' ? `已保存 ${fish.name} 的生命纪念。` : `Saved memorial for ${fish.name}.`);
    } catch (error) {
      setDeathError(error instanceof Error ? error.message : (t('encyclopedia.freshwater') === '淡水' ? '保存失败，请稍后重试。' : 'Save failed, please try again later.'));
    } finally {
      setIsRecordingDeath(false);
    }
  };

  const handleShare = async () => {
    if (!fish) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: fish.name, text: `${fish.name}${t('encyclopedia.shareTextSuffix')}` });
      } else {
        await navigator.clipboard?.writeText(`${fish.name}${t('encyclopedia.shareTextSuffix')}`);
      }
      setInlineFeedback(t('encyclopedia.freshwater') === '淡水' ? '已复制分享信息' : 'Share info copied');
    } catch {
      setInlineFeedback(t('encyclopedia.freshwater') === '淡水' ? '暂时无法分享，可稍后再试' : 'Sharing unavailable now, try again later.');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <AdaptiveDetailContent showCloseButton={false} finalFocus={finalFocusElement ? () => finalFocusElement : undefined}>
          {fish && displayFit && (
            <div className="flex min-h-0 flex-1 flex-col bg-white">
              <div className="modalHeader flex items-center justify-between border-b border-border bg-white px-4 py-3">
                <button type="button" onClick={() => onOpenChange(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-bg text-ink/60 hover:text-accent" aria-label={t('encyclopedia.dismiss')}>
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <button type="button" onClick={handleShare} className="flex h-10 w-10 items-center justify-center rounded-full bg-bg text-ink/60 hover:text-accent" aria-label={t('encyclopedia.shareTextSuffix').trim()}>
                  <Share2 className="h-5 w-5" />
                </button>
              </div>

              <div className="modalBody app-scrollbar-hidden p-0">
                <div className="p-4 pb-28">
                  <div className="rounded-[20px] border border-border bg-white p-3 shadow-sm">
                    <div className="grid grid-cols-[128px_1fr] gap-3">
                      {fish.id === 'sp_0260' ? (
                        <Suspense fallback={<div className="flex aspect-[1.18] min-h-[112px] items-center justify-center rounded-[16px] border border-border/70 bg-slate-50 text-[10px] text-slate-400">{t('encyclopedia.freshwater') === '淡水' ? '3D 加载中...' : 'Loading 3D...'}</div>}>
                          <Interactive3DFishWrapper
                            imageUrl={resolvedImageSrc}
                            className={`flex aspect-[1.18] min-h-[112px] items-center justify-center rounded-[16px] border border-border/70 ${getSpeciesImageSurfaceClass(fish)} p-0 shadow-sm overflow-hidden`}
                          />
                        </Suspense>
                      ) : (
                        <button type="button" onClick={openPreview} data-species-detail-hero className={`flex aspect-[1.18] min-h-[112px] items-center justify-center rounded-[16px] border border-border/70 ${getSpeciesImageSurfaceClass(fish)} p-2 shadow-sm`} aria-label={t('encyclopedia.freshwater') === '淡水' ? `放大查看${fish.name}图片` : `Enlarge image of ${fish.name}`}>
                          <img src={resolvedImageSrc} alt={fish.name} className={`h-[88%] w-[88%] object-contain ${getSpeciesImageClass(fish)}`} referrerPolicy="no-referrer" />
                        </button>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <DialogTitle className="font-serif text-[22px] italic font-bold leading-tight text-ink">{fish.name}</DialogTitle>
                            <DialogDescription className="mt-1 text-[12px] font-medium leading-tight text-ink/55">{fish.scientificName}</DialogDescription>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${getDifficultyBadgeClass(fish.difficulty)}`}>{fish.difficulty === 'Easy' ? t('encyclopedia.difficultyEasyShort') : fish.difficulty === 'Medium' ? t('encyclopedia.difficultyMediumShort') : t('encyclopedia.difficultyHardShort')}</span>
                        </div>
                        <div className="mt-3 flex max-h-[58px] flex-wrap gap-1.5 overflow-hidden">
                          {[selectedTaxonomy?.variety, fish.housingMode, ...getToolFunctions(fish)].filter(Boolean).slice(0, 3).map(tag => {
                            const displayTag = translateTag(tag, t);
                            return <span key={tag} className="rounded-full border border-border bg-white px-2 py-1 text-[10px] font-bold text-ink/60">{displayTag}</span>;
                          })}
                        </div>
                        <p className="mt-3 line-clamp-1 text-[12px] font-bold leading-relaxed text-ink/62">{getLocalizedSpeciesRole(fish, t)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-[18px] border border-border bg-white p-2 shadow-sm">
                    {[
                      { label: t('encyclopedia.compatibilityCalc'), icon: Calculator, active: inCalculator, action: handleOpenCalculator },
                      { label: inWishlist ? t('encyclopedia.inWishlistBtn') : t('encyclopedia.addToWishlistBtn'), icon: inWishlist ? Heart : HeartOff, active: inWishlist, action: () => onToggleWishlist(fish.id) },
                      onRecordDeath ? { label: t('encyclopedia.moreLabel'), icon: Skull, active: false, action: () => setIsDeathFormOpen(true) } : null,
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
                      { id: 'environment', label: t('encyclopedia.tankEnvironment') },
                      { id: 'compatibility', label: t('encyclopedia.compatibilityCheck') },
                      { id: 'care', label: t('encyclopedia.feedingCare') },
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
                          <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-black text-ink">{t('encyclopedia.categoryReferenceTitle')}<ChevronRight className="h-4 w-4 text-ink/40" /></summary>
                          <div className="mt-3 rounded-[12px] bg-bg p-3 text-[12px] font-medium leading-relaxed text-ink/60">
                            <div className="font-black text-ink">{fish.housingMode ? translateTag(fish.housingMode, t) : t('encyclopedia.adviceHousingDefault')}</div>
                            {fish.housingReason && <p className="mt-1">{fish.housingReason}</p>}
                            <p className="mt-2 text-[10px] font-bold text-amber-700">{t('encyclopedia.disclaimerHousing')}</p>
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
                            {sexIdentificationGuide.title === '暂无可靠的公母辨别资料' ? t('encyclopedia.sexTitlePlaceholder') : sexIdentificationGuide.title}
                            <ChevronRight className="h-4 w-4 text-ink/40" />
                          </summary>
                          <p className="mt-3 text-[12px] font-bold leading-relaxed text-ink/62">
                            {sexIdentificationGuide.summary === '当前图鉴没有经过人工审核的公母辨别字段，系统不会仅凭名称或品类猜测公母。' ? t('encyclopedia.sexSummaryPlaceholder') : sexIdentificationGuide.summary}
                          </p>
                          <div className="mt-3 grid gap-2">
                            {sexIdentificationGuide.points.map(point => {
                              const translatedPt = point === '可先按健康状态、体型完整度和活性挑选个体。' ? t('encyclopedia.sexPt1') : point === '如果确实需要配对繁殖，建议向可靠商家确认性别来源。' ? t('encyclopedia.sexPt2') : point === '后续补充人工审核资料后，这里会显示具体辨别要点。' ? t('encyclopedia.sexPt3') : point;
                              return (
                                <div key={point} className="rounded-[12px] bg-white px-3 py-2 text-[12px] font-medium leading-relaxed text-ink/64">
                                  {translatedPt}
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      )}
                      {carePresentation && (
                        <>
                          <section className="rounded-[16px] border border-border bg-white p-3 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-[14px] font-black text-ink">{t('encyclopedia.feedingLabel')}</h3>
                                <p className="mt-1 text-[11px] font-medium leading-relaxed text-ink/52">
                                  {carePresentation.sourceStatus === 'pending' ? t('encyclopedia.noCareProfile') : carePresentation.sourceStatus === 'generic' ? t('encyclopedia.disclaimerHousing') : carePresentation.sourceStatus === 'verified' ? t('encyclopedia.fitStatusOkLabel') : t('encyclopedia.adviceAlreadyInTankPage')}
                                </p>
                              </div>
                              <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${getCareSourceClass(carePresentation.sourceStatus)}`}>
                                {carePresentation.sourceStatus === 'pending' ? t('encyclopedia.fitInsufficient') : carePresentation.sourceStatus === 'generic' ? t('encyclopedia.adviceHousingDefault') : carePresentation.sourceStatus === 'verified' ? t('encyclopedia.fitStatusOkLabel') : t('encyclopedia.fitStatusMatchConfirm')}
                              </span>
                            </div>
                            {carePresentation.feedingItems.length > 0 ? (
                              <div className="mt-3 grid gap-2">
                                {carePresentation.feedingItems.map(item => (
                                  <div key={item.label} className="rounded-[12px] bg-bg p-3">
                                    <div className="text-[10px] font-black text-ink/42">{translateLabel(item.label)}</div>
                                    <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/65">{item.value}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-3 rounded-[12px] bg-bg p-3 text-[12px] font-bold text-ink/55">{t('encyclopedia.noCareProfile')}</div>
                            )}
                          </section>
                          <section className="rounded-[16px] border border-border bg-white p-3 shadow-sm">
                            <h3 className="text-[14px] font-black text-ink">{t('encyclopedia.waterEnvLabel')}</h3>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {carePresentation.environmentItems.map(item => {
                                const displayVal = item.label === '换水周期' ? t('encyclopedia.careWaterChangeValue', { days: fish.waterChangeCycle }) : item.value;
                                return (
                                  <div key={item.label} className="rounded-[12px] bg-bg p-3">
                                    <div className="text-[10px] font-black text-ink/42">{translateLabel(item.label)}</div>
                                    <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/65">{displayVal}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        </>
                      )}
                    </div>
                  )}

                  {(detailFeedback || inlineFeedback) && (
                    <div className="mt-3 rounded-[14px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12px] font-bold text-emerald-800">
                      {detailFeedback || inlineFeedback}
                      {detailFeedback && onGoCalculator && <button type="button" className="ml-2 rounded-full bg-white px-2 py-1 text-[10px] font-black text-emerald-700" onClick={onGoCalculator}>{t('encyclopedia.goToCalcBtn')}</button>}
                    </div>
                  )}
                </div>
              </div>

              <div className="modalFooter border-t border-border bg-white/95 px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4">
                <Button className="h-12 w-full rounded-full bg-accent text-base font-black text-white hover:bg-accent/90" onClick={handleMainAction}>{mainActionLabel}</Button>
              </div>

              {activeMetric && (
                <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/24 px-3 pb-3">
                  <button type="button" className="absolute inset-0" aria-label={t('encyclopedia.dismiss')} onClick={() => setActiveMetric(null)} />
                  <div className="relative w-full max-w-[520px] rounded-[26px] bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
                    <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-ink/12" />
                    <h3 className="text-[18px] font-black text-ink">{activeMetric.status === 'ok' ? t('encyclopedia.viewEnvTitle') : t('encyclopedia.adjustEnvLabel', { label: translateLabel(activeMetric.label) })}</h3>
                    <div className="mt-3 grid gap-2 rounded-[18px] bg-bg p-3">
                      <div className="flex justify-between gap-3 text-[13px] font-bold text-ink/60"><span>{t('encyclopedia.currentValue')}</span><span className={getFitCurrentClass(activeMetric.status)}>{activeMetric.current || t('encyclopedia.noTankSelected')}</span></div>
                      <div className="flex justify-between gap-3 text-[13px] font-bold text-ink/60"><span>{t('encyclopedia.targetRange')}</span><span className="text-ink">{activeMetric.requirement || t('encyclopedia.checkRequirements')}</span></div>
                    </div>
                    <p className="mt-3 text-[12px] font-medium leading-relaxed text-ink/55">{activeMetric.advice || t('encyclopedia.dismissAdvice')}</p>
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
                  <button type="button" className="absolute inset-0" aria-label={t('encyclopedia.btnCancel')} onClick={() => !isRecordingDeath && setIsDeathFormOpen(false)} />
                  <div className="relative w-full max-w-[440px] rounded-[24px] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.24)]">
                    <h3 id="death-record-title" className="text-[18px] font-black text-ink">{t('encyclopedia.recordMemorialTitle')}</h3>
                    <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/58">{t('encyclopedia.memorialSubtitle')}</p>
                    <label className="mt-4 block text-[12px] font-black text-ink" htmlFor="death-date">{t('encyclopedia.dateLabel')}</label>
                    <input id="death-date" type="date" value={deathDate} onChange={event => setDeathDate(event.target.value)} disabled={isRecordingDeath} className="mt-2 h-11 w-full rounded-[14px] border border-border bg-white px-3 text-[14px] font-bold text-ink outline-none focus:border-accent" />
                    <label className="mt-4 block text-[12px] font-black text-ink" htmlFor="death-reason">{t('encyclopedia.reasonLabel')}</label>
                    <textarea ref={deathReasonRef} id="death-reason" value={deathReason} onChange={event => setDeathReason(event.target.value)} disabled={isRecordingDeath} rows={4} placeholder={t('encyclopedia.deathReasonPlaceholder')} className="mt-2 w-full resize-none rounded-[14px] border border-border bg-white p-3 text-[14px] font-medium leading-relaxed text-ink outline-none focus:border-accent" />
                    {deathError && <p className="mt-2 rounded-[12px] bg-red-50 px-3 py-2 text-[12px] font-bold text-red-700" role="alert">{deathError}</p>}
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <Button variant="outline" className="h-11 rounded-full border-border text-sm font-black" disabled={isRecordingDeath} onClick={() => setIsDeathFormOpen(false)}>{t('encyclopedia.btnCancel')}</Button>
                      <Button className="h-11 rounded-full bg-ink text-sm font-black text-white hover:bg-ink/90" disabled={isRecordingDeath} onClick={handleRecordDeath}>{isRecordingDeath ? t('encyclopedia.btnSaving') : t('encyclopedia.btnSave')}</Button>
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
