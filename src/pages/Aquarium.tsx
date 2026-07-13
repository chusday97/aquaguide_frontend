import { lazy, Suspense, useState, useEffect, useMemo, useRef } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { Aquarium, AquariumFish, Fish } from '../types';
import { fishData } from '../data/fishData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, differenceInDays, addDays, isPast, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths, isSameDay } from 'date-fns';
import { Plus, Trash2, AlertTriangle, Edit2, Calendar, Droplets, Sparkles, Search, ChevronLeft, ChevronRight, Settings, BookOpen, Info, Crown, Activity, HelpCircle, Skull, Heart, HeartOff, X, Layers3, Maximize2, CheckCircle2 } from 'lucide-react';
import { DeceasedRecord } from '../types';
import {
  askAquaGuideAI,
  generateRiskExplanation,
  generateTankBuildCopilot,
  type AiResponseSource,
  type RiskExplanationData,
  type TankBuildCopilotData,
} from '../lib/aiClient';
import { isAquaticPlantSpecies, isHardscapeSpecies } from '../lib/speciesClassification';
import { getSpeciesDisplayImage, getSpeciesImageClass, getSpeciesImageSurfaceClass } from '../lib/speciesVisual';
import { getLifeType, getToolFunctions, isSpeciesCompatibleWithWaterType } from '../modules/species/species.service';
import type { DiscoveryDeckState, RecommendationCandidate, RecommendationMode, SimulationResult, SmartRecommendationOutput } from '../modules/recommendation/recommendation.schema';
import { careTopicsData } from '../data/careTopicsData';
import { buildDiagnosisResult } from '../modules/diagnosis/diagnosis.rules';
import {
  diagnosisProblemTypes,
  getDiagnosisQuestions,
  getEstimatedQuestionCount,
  isDiagnosisProblemType,
} from '../modules/diagnosis/diagnosis.questionBank';
import type { DiagnosisAnswerMap, DiagnosisOutput, DiagnosisProblemType, DiagnosisQuestion } from '../modules/diagnosis/diagnosis.types';
import {
  DISCOVERY_DAILY_LIMIT,
  DISCOVERY_STORAGE_KEY,
  normalizeDiscoveryState,
  recommendationService,
} from '../modules/recommendation/recommendation.service';
import { buildTankCopilotContext, getTankCopilotMissingInfo } from '../modules/copilot/tankBuildCopilot';
import { weatherService } from '../services/weather/weather.service';
import type { LocalWeatherOutput } from '../services/weather/weather.schema';
import {
  clearLocalAppState,
  exportLocalAppState,
  importLocalAppState,
  loadAppStateFromStorage,
  patchLocalAppState,
  saveAppStateToStorage,
  type LocalEventRecord,
} from '../services/storage/local-app-state';
import { StatusSummaryCard, type AquariumStatusLevel, type DailyAdviceTask, type DailyAdviceViewModel } from '../components/product/StatusSummaryCard';
import type { TodayTaskStatus } from '../components/product/TodayTaskCard';
import { SectionHeader } from '../components/product/SectionHeader';
import { TagPill } from '../components/product/TagPill';
import { ConfigSection } from '../components/product/ConfigSection';
import { SelectableOptionCard } from '../components/product/SelectableOptionCard';
import { ConfigSummaryCard } from '../components/product/ConfigSummaryCard';
import { TemplatePlanCard } from '../components/product/TemplatePlanCard';
import { ActionCenterCard, type ActionCenterStatus } from '../components/product/ActionCenterCard';
import { QuickActionGrid } from '../components/product/QuickActionGrid';
import { FilterBottomSheet } from '../components/common/FilterBottomSheet';
import { SpeciesDetailDialog } from '../components/SpeciesDetailDialog';
import {
  getTankCompatibilityAddPolicy,
  getTankCompatibilityStatusLabel,
} from '../lib/tankCompatibilityEngine';
import {
  executeSpeciesAddition,
  reviewSpeciesAdditions,
  type SpeciesAdditionItem,
  type SpeciesAdditionReview,
} from '../services/aquarium/species-addition.service';
import { getSpeciesFavoriteIds, setSpeciesFavoriteIds, subscribeToFavorites } from '../services/favorites/favorites.service';
import { useToast } from '../components/common/ToastProvider';
import { useWorkspaceNavigation } from '../components/layout/WorkspaceNavigationProvider';
import type { WorkspaceNavigationContext } from '../types/navigation';

const ThreeAquarium = lazy(() => import('../components/ThreeAquarium').then(module => ({ default: module.ThreeAquarium })));

const substrateOptions = [
  { value: '无', label: '裸缸', hint: '方便清洁' },
  { value: '河沙', label: '河沙', hint: '自然浅色' },
  { value: '溪流砂', label: '溪流砂', hint: '原生溪流' },
  { value: '化妆砂', label: '化妆砂', hint: '明亮前景' },
  { value: '水草泥', label: '水草泥', hint: '草缸首选' },
  { value: '黑金沙', label: '黑金沙', hint: '显色强烈' },
  { value: '陶粒', label: '陶粒', hint: '透气颗粒' },
  { value: '碎石', label: '碎石', hint: '粗颗粒' },
  { value: '鹅卵石', label: '鹅卵石', hint: '溪流大石' },
  { value: '珊瑚砂', label: '珊瑚砂', hint: '海水/硬水' },
];

const plantOptions = fishData
  .filter(isAquaticPlantSpecies)
  .filter((plant, index, plants) => plants.findIndex(item => item.scientificName === plant.scientificName && item.name === plant.name) === index)
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

const hardscapeOptions = fishData
  .filter(isHardscapeSpecies)
  .filter((item, index, items) => items.findIndex(next => next.scientificName === item.scientificName && next.name === item.name) === index)
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

type AquariumSettingsPanel = 'size' | 'parameters' | 'substrate' | 'plants' | 'lighting' | 'equipment';

const dimensionFields: Array<{ key: keyof NonNullable<Aquarium['dimensions']>; label: string }> = [
  { key: 'length', label: '长' },
  { key: 'width', label: '宽' },
  { key: 'height', label: '高' },
];

const getSettingsPanelForMissingInfo = (missingInfo: string[]): AquariumSettingsPanel => {
  const text = missingInfo.join(' ');
  if (/尺寸|容量|水量|长|宽|高/.test(text)) return 'size';
  if (/过滤|设备|加热/.test(text)) return 'equipment';
  if (/灯/.test(text)) return 'lighting';
  if (/水草|植物/.test(text)) return 'plants';
  if (/底砂|底床|硬景/.test(text)) return 'substrate';
  return 'parameters';
};

type TankBuildTemplate = {
  id: string;
  name: string;
  tagline: string;
  bestFor: string;
  difficulty: '新手' | '进阶';
  minVolumeLiters: number;
  recommendedVolumeLiters: number;
  minLengthCm: number;
  waterType: NonNullable<Aquarium['waterType']>;
  temperatureRange: [number, number];
  baseEquipment: string[];
  baseSubstrate: string;
  basePlants: string[];
  baseHardscape: string[];
  speciesRecommendations: Array<{
    name: string;
    role: 'schooling' | 'bottom' | 'shrimp' | 'snail' | 'centerpiece';
    minQuantity: number;
    recommendedQuantity: number;
  }>;
  visualLabel: string;
  visualGradient: string;
  benefitTags: string[];
  tankSize: string;
  temperature: string;
  substrate: string;
  plants: string[];
  hardscape: string[];
  equipment: string[];
  equipmentSettings: Aquarium['equipment'];
  livestock: string[];
  capacityGuidance: {
    recommendedLiters: string;
    maxLivestock: string;
    suitableTypes: string[];
    avoidTypes: string[];
  };
  stockedSpecies: { name: string; quantity: number }[];
  maintenance: string[];
  caution: string;
};

type AdaptedBuildPlan = {
  template: TankBuildTemplate;
  status: 'suitable' | 'caution' | 'unsuitable';
  statusLabel: string;
  statusTone: string;
  currentVolumeLiters: number;
  currentLengthCm: number;
  volumeRatio: number;
  summary: string;
  coreConfigSummary: string;
  livestockSummary: string;
  appliedSpecies: { name: string; quantity: number; role: TankBuildTemplate['speciesRecommendations'][number]['role']; fish?: Fish }[];
  riskItems: string[];
  autoFixes: string[];
  canApply: boolean;
  ctaLabel: string;
};

const findSpeciesValueByName = (name: string, matcher: (fish: Fish) => boolean) => {
  const species = fishData.find(fish => matcher(fish) && (fish.name === name || fish.name.includes(name) || name.includes(fish.name)));
  return species?.id || name;
};

const findStockSpeciesByName = (name: string) => {
  return fishData.find(fish => (
    !isAquaticPlantSpecies(fish)
    && !isHardscapeSpecies(fish)
    && (fish.name === name || fish.name.includes(name) || name.includes(fish.name))
  ));
};

const tankBuildTemplates: TankBuildTemplate[] = ([
  {
    id: 'beginner-low-tech',
    name: '新手阴性草缸',
    tagline: '低光、低 CO2 依赖，先把稳定养成习惯。',
    bestFor: '30-60cm 新手缸、办公室桌面缸',
    difficulty: '新手',
    minVolumeLiters: 30,
    recommendedVolumeLiters: 60,
    minLengthCm: 30,
    waterType: 'Freshwater',
    temperatureRange: [23, 26],
    baseEquipment: ['瀑布过滤或小桶滤', '普通灯/入门水草灯', '可选加热棒'],
    baseSubstrate: '水草泥',
    basePlants: ['小水榕', '铁皇冠', '黑木蕨', '三角莫斯'],
    baseHardscape: ['沉木 (流木)', '杜鹃根'],
    speciesRecommendations: [
      { name: '红绿灯', role: 'schooling', minQuantity: 8, recommendedQuantity: 10 },
      { name: '咖啡鼠', role: 'bottom', minQuantity: 3, recommendedQuantity: 4 },
      { name: '斑马螺', role: 'snail', minQuantity: 1, recommendedQuantity: 1 },
    ],
    visualLabel: '低维护绿意',
    visualGradient: 'linear-gradient(135deg,#DCEFE4 0%,#F7F3DF 52%,#B9D8C2 100%)',
    benefitTags: ['适合第一缸', '维护压力低', '桌面缸友好'],
    tankSize: '30L 起步，60cm 缸更稳定',
    temperature: '24',
    substrate: '水草泥',
    plants: ['小水榕', '铁皇冠', '黑木蕨', '三角莫斯'],
    hardscape: ['沉木 (流木)', '杜鹃根'],
    equipment: ['瀑布过滤或小桶滤', '普通灯/入门水草灯', '可选加热棒'],
    equipmentSettings: { filter: '瀑布过滤', heater: true, oxygen: false, light: '水草灯' },
    livestock: ['红绿灯 8-12 条', '咖啡鼠 3-5 条', '斑马螺 1-2 只'],
    capacityGuidance: {
      recommendedLiters: '30-60L',
      maxLivestock: '小型群游鱼 8-12 条；底层鼠鱼 3-5 条；螺 1-2 只',
      suitableTypes: ['小型灯科鱼', '温和底栖鱼', '少量工具螺'],
      avoidTypes: ['大型鱼', '高排泄鱼', '强领地鱼'],
    },
    stockedSpecies: [{ name: '红绿灯', quantity: 10 }, { name: '咖啡鼠', quantity: 4 }, { name: '斑马螺', quantity: 1 }],
    maintenance: ['每周换水 20%-30%', '每周擦缸壁和修剪老叶', '每天开灯 6-7 小时，爆藻时先减光'],
    caution: '水榕、铁皇冠和黑木蕨不要把根茎埋进泥里，绑在沉木或石头上更稳。',
  },
  {
    id: 'tetra-planted',
    name: '灯鱼草缸',
    tagline: '用群游灯鱼做视觉中心，水草负责层次和安全感。',
    bestFor: '45-90cm 中小型观赏草缸',
    difficulty: '新手',
    minVolumeLiters: 45,
    recommendedVolumeLiters: 82,
    minLengthCm: 45,
    waterType: 'Freshwater',
    temperatureRange: [24, 26],
    baseEquipment: ['水草灯', '桶滤或强瀑布过滤', '可选 CO2', '加热棒'],
    baseSubstrate: '水草泥',
    basePlants: ['迷你矮珍珠', '牛毛毡', '宫廷草', '红宫廷'],
    baseHardscape: ['青龙石', 'ADA风格化妆砂'],
    speciesRecommendations: [
      { name: '宝莲灯', role: 'schooling', minQuantity: 10, recommendedQuantity: 16 },
      { name: '红鼻剪刀', role: 'schooling', minQuantity: 8, recommendedQuantity: 10 },
      { name: '咖啡鼠', role: 'bottom', minQuantity: 3, recommendedQuantity: 4 },
      { name: '黑壳虾', role: 'shrimp', minQuantity: 4, recommendedQuantity: 6 },
    ],
    visualLabel: '群游草景',
    visualGradient: 'linear-gradient(135deg,#CFE9F8 0%,#DFF4DB 48%,#A7D8C6 100%)',
    benefitTags: ['群游鱼效果好', '观赏性强', '草缸入门'],
    tankSize: '45L 起步，建议 60cm 以上',
    temperature: '25',
    substrate: '水草泥',
    plants: ['迷你矮珍珠', '牛毛毡', '宫廷草', '红宫廷'],
    hardscape: ['青龙石', 'ADA风格化妆砂'],
    equipment: ['水草灯', '桶滤或强瀑布过滤', '可选 CO2', '加热棒'],
    equipmentSettings: { filter: '桶滤', heater: true, oxygen: false, light: '水草灯' },
    livestock: ['宝莲灯 12-20 条', '红鼻剪刀/红绿灯 10-15 条', '咖啡鼠 4-6 条', '黑壳虾少量'],
    capacityGuidance: {
      recommendedLiters: '45-90L',
      maxLivestock: '小型群游鱼 18-28 条；底层鼠鱼 4-6 条；工具虾 5-10 只',
      suitableTypes: ['小型群游灯鱼', '温和鼠鱼', '少量工具虾'],
      avoidTypes: ['大型鱼', '强攻击鱼', '偏硬水鱼'],
    },
    stockedSpecies: [{ name: '宝莲灯', quantity: 16 }, { name: '红鼻剪刀', quantity: 10 }, { name: '咖啡鼠', quantity: 4 }, { name: '黑壳虾', quantity: 6 }],
    maintenance: ['每周换水 30%', '每 2 周修剪一次茎类草', '开灯 7 小时起步，CO2 不稳定时减少红草比例'],
    caution: '前景草和红草对灯光、肥力和 CO2 更敏感，新手可先减少迷你矮珍珠面积。',
  },
  {
    id: 'shrimp-tank',
    name: '虾缸',
    tagline: '给米虾留足躲避和啃食面，重点控制稳定水质。',
    bestFor: '30-45cm 小缸、繁殖观察缸',
    difficulty: '新手',
    minVolumeLiters: 20,
    recommendedVolumeLiters: 35,
    minLengthCm: 30,
    waterType: 'Freshwater',
    temperatureRange: [20, 24],
    baseEquipment: ['海绵过滤', '普通灯', '加热棒视室温决定'],
    baseSubstrate: '水草泥',
    basePlants: ['三角莫斯', '青丝绒莫斯', '小水榕', '辣椒榕'],
    baseHardscape: ['沉木 (流木)', '火山石板'],
    speciesRecommendations: [
      { name: '极火虾', role: 'shrimp', minQuantity: 10, recommendedQuantity: 15 },
      { name: '斑马螺', role: 'snail', minQuantity: 1, recommendedQuantity: 1 },
    ],
    visualLabel: '虾类观察',
    visualGradient: 'linear-gradient(135deg,#E6F4E8 0%,#F8E7D2 55%,#D2E6D1 100%)',
    benefitTags: ['虾类友好', '适合观察', '小缸稳定'],
    tankSize: '20L 起步，30L 以上更稳',
    temperature: '23',
    substrate: '水草泥',
    plants: ['三角莫斯', '青丝绒莫斯', '小水榕', '辣椒榕'],
    hardscape: ['沉木 (流木)', '火山石板'],
    equipment: ['海绵过滤', '普通灯', '加热棒视室温决定'],
    equipmentSettings: { filter: '海绵过滤', heater: false, oxygen: true, light: '普通灯' },
    livestock: ['极火虾 10-20 只', '黄金米虾/蓝丝绒米虾单色群', '斑马螺 1 只'],
    capacityGuidance: {
      recommendedLiters: '20-45L',
      maxLivestock: '米虾 10-20 只；螺 1 只；不建议加鱼',
      suitableTypes: ['米虾', '单只工具螺', '莫斯/阴性草'],
      avoidTypes: ['会捕食虾的鱼', '大型鱼', '需要频繁下药的组合'],
    },
    stockedSpecies: [{ name: '极火虾', quantity: 15 }, { name: '斑马螺', quantity: 1 }],
    maintenance: ['每周小换水 10%-20%', '补水和换水温差控制在 1-2°C 内', '避免铜药和强力除藻剂'],
    caution: '不同颜色米虾混养后代容易返祖，想保色建议单色单缸。',
  },
  {
    id: 'south-america-blackwater',
    name: '南美黑水缸',
    tagline: '弱酸软水、沉木落叶和暗色环境，突出南美鱼的状态。',
    bestFor: '60cm 以上观赏缸、短鲷/神仙主题缸',
    difficulty: '进阶',
    minVolumeLiters: 70,
    recommendedVolumeLiters: 120,
    minLengthCm: 60,
    waterType: 'Freshwater',
    temperatureRange: [26, 28],
    baseEquipment: ['桶滤', '弱光灯', '加热棒', '可加黑水素/榄仁叶'],
    baseSubstrate: '河沙',
    basePlants: ['大叶皇冠', '细叶皇冠', '黑木蕨'],
    baseHardscape: ['沉木 (流木)', '杜鹃根'],
    speciesRecommendations: [
      { name: '宝莲灯', role: 'schooling', minQuantity: 12, recommendedQuantity: 20 },
      { name: '阿卡西短鲷', role: 'centerpiece', minQuantity: 2, recommendedQuantity: 2 },
      { name: '神仙鱼', role: 'centerpiece', minQuantity: 0, recommendedQuantity: 2 },
      { name: '咖啡鼠', role: 'bottom', minQuantity: 4, recommendedQuantity: 4 },
    ],
    visualLabel: '暗色原生',
    visualGradient: 'linear-gradient(135deg,#8A6A45 0%,#D5B981 48%,#5B4636 100%)',
    benefitTags: ['氛围感强', '南美主题', '状态展示'],
    tankSize: '60L 起步，神仙鱼建议高缸',
    temperature: '27',
    substrate: '河沙',
    plants: ['大叶皇冠', '细叶皇冠', '黑木蕨'],
    hardscape: ['沉木 (流木)', '杜鹃根'],
    equipment: ['桶滤', '弱光灯', '加热棒', '可加黑水素/榄仁叶'],
    equipmentSettings: { filter: '桶滤', heater: true, oxygen: false, light: '普通灯' },
    livestock: ['宝莲灯 15-30 条', '阿卡西短鲷 1 对', '神仙鱼 2-4 条', '咖啡鼠 4-6 条'],
    capacityGuidance: {
      recommendedLiters: '60L 起步，神仙鱼建议更高水体',
      maxLivestock: '灯鱼 15-25 条；短鲷 1 对；神仙鱼 2 条；鼠鱼 4-6 条',
      suitableTypes: ['弱酸南美灯鱼', '短鲷', '少量神仙鱼', '温和底栖鱼'],
      avoidTypes: ['偏硬水卵胎生鱼', '大型捕食鱼', '高流速溪流鱼'],
    },
    stockedSpecies: [{ name: '宝莲灯', quantity: 20 }, { name: '阿卡西短鲷', quantity: 2 }, { name: '神仙鱼', quantity: 2 }, { name: '咖啡鼠', quantity: 4 }],
    maintenance: ['每周换水 20%', '定期补充落叶或黑水材料', '保持水流柔和，避免频繁大幅调 pH'],
    caution: '黑水缸追求稳定弱酸，不建议同时混入偏硬水或高流速需求的鱼。',
  },
  {
    id: 'seiryu-iwagumi',
    name: '青龙石岩组缸',
    tagline: '石组构图强，视觉干净，但更考验控藻和硬度管理。',
    bestFor: '45-90cm 岩组草缸、极简风格缸',
    difficulty: '进阶',
    minVolumeLiters: 45,
    recommendedVolumeLiters: 90,
    minLengthCm: 45,
    waterType: 'Freshwater',
    temperatureRange: [23, 26],
    baseEquipment: ['强水草灯', '桶滤', 'CO2 强烈建议', '加热棒'],
    baseSubstrate: '水草泥',
    basePlants: ['迷你矮珍珠', '牛毛毡', '南美叉柱花'],
    baseHardscape: ['青龙石', '青龙石景观组', 'ADA风格化妆砂'],
    speciesRecommendations: [
      { name: '红莲灯', role: 'schooling', minQuantity: 10, recommendedQuantity: 16 },
      { name: '红绿灯', role: 'schooling', minQuantity: 8, recommendedQuantity: 15 },
      { name: '黑壳虾', role: 'shrimp', minQuantity: 4, recommendedQuantity: 8 },
      { name: '斑马螺', role: 'snail', minQuantity: 1, recommendedQuantity: 1 },
    ],
    visualLabel: '极简石组',
    visualGradient: 'linear-gradient(135deg,#D9E4DF 0%,#F1F0E8 50%,#AEB9B3 100%)',
    benefitTags: ['视觉层次强', '极简风格', '进阶造景'],
    tankSize: '45L 起步，60cm 以上更容易做纵深',
    temperature: '24',
    substrate: '水草泥',
    plants: ['迷你矮珍珠', '牛毛毡', '南美叉柱花'],
    hardscape: ['青龙石', '青龙石景观组', 'ADA风格化妆砂'],
    equipment: ['强水草灯', '桶滤', 'CO2 强烈建议', '加热棒'],
    equipmentSettings: { filter: '桶滤', heater: true, oxygen: false, light: '水草灯' },
    livestock: ['红莲灯 12-20 条', '红绿灯 15-25 条', '黑壳虾少量', '斑马螺 1-2 只'],
    capacityGuidance: {
      recommendedLiters: '45-90L',
      maxLivestock: '小型灯鱼 20-30 条；工具虾 5-10 只；螺 1-2 只',
      suitableTypes: ['小型群游灯鱼', '少量工具虾', '工具螺'],
      avoidTypes: ['大型鱼', '强翻砂鱼', '偏软水敏感且不耐硬度波动的组合'],
    },
    stockedSpecies: [{ name: '红莲灯', quantity: 16 }, { name: '红绿灯', quantity: 15 }, { name: '黑壳虾', quantity: 8 }, { name: '斑马螺', quantity: 1 }],
    maintenance: ['每周换水 30%-40%', '前 4 周重点控光和勤换水', '前景草爬满后定期薄剪'],
    caution: '青龙石可能提高硬度，搭配偏软水灯鱼时要观察 GH/KH 和鱼只状态。',
  },
] satisfies TankBuildTemplate[]).map(template => ({
  ...template,
  plants: template.plants.map(name => findSpeciesValueByName(name, isAquaticPlantSpecies)),
  hardscape: template.hardscape.map(name => findSpeciesValueByName(name, isHardscapeSpecies)),
}));

const safeJsonParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('Failed to parse localStorage value', error);
    return fallback;
  }
};

const normalizeAquariumRecord = (aquarium: Partial<Aquarium>, index = 0): Aquarium => ({
  id: typeof aquarium.id === 'string' && aquarium.id ? aquarium.id : Math.random().toString(36).substring(2, 9),
  name: typeof aquarium.name === 'string' && aquarium.name ? aquarium.name : `我的鱼缸 ${index + 1}`,
  fishes: Array.isArray(aquarium.fishes) ? aquarium.fishes : [],
  lastWaterChangeDate: aquarium.lastWaterChangeDate || new Date().toISOString(),
  waterChangeHistory: Array.isArray(aquarium.waterChangeHistory) ? aquarium.waterChangeHistory : [],
  lastWaterStoredDate: aquarium.lastWaterStoredDate,
  dimensions: {
    length: aquarium.dimensions?.length || '60',
    width: aquarium.dimensions?.width || '40',
    height: aquarium.dimensions?.height || '40',
  },
  waterType: aquarium.waterType === 'Saltwater' ? 'Saltwater' : 'Freshwater',
  targetTemperature: aquarium.targetTemperature || '25',
  substrate: aquarium.substrate || '无',
  plants: Array.isArray(aquarium.plants) ? aquarium.plants : [],
  hardscape: Array.isArray(aquarium.hardscape) ? aquarium.hardscape : [],
  equipment: {
    filter: aquarium.equipment?.filter || '瀑布过滤',
    heater: aquarium.equipment?.heater ?? true,
    oxygen: aquarium.equipment?.oxygen ?? false,
    light: aquarium.equipment?.light || '普通灯',
  },
});

const createDefaultAquarium = (name = '我的鱼缸'): Aquarium => ({
  id: Math.random().toString(36).substring(2, 9),
  name,
  fishes: [],
  lastWaterChangeDate: new Date().toISOString(),
  dimensions: { length: '60', width: '40', height: '40' },
  waterType: 'Freshwater',
  targetTemperature: '25',
  substrate: '无',
  plants: [],
  hardscape: [],
  equipment: { filter: '瀑布过滤', heater: true, oxygen: false, light: '普通灯' },
});

const normalizeAquariumPlants = (aquariums: Partial<Aquarium>[]) => aquariums.map((rawAquarium, index) => {
  const aquarium = normalizeAquariumRecord(rawAquarium, index);
  const plantIdsFromFishes = aquarium.fishes
    .map(item => fishData.find(fish => fish.id === item.fishId))
    .filter((fish): fish is Fish => Boolean(fish) && isAquaticPlantSpecies(fish))
    .map(fish => fish.id);
  const hardscapeIdsFromFishes = aquarium.fishes
    .map(item => fishData.find(fish => fish.id === item.fishId))
    .filter((fish): fish is Fish => Boolean(fish) && isHardscapeSpecies(fish))
    .map(fish => fish.id);

  if (plantIdsFromFishes.length === 0 && hardscapeIdsFromFishes.length === 0) return aquarium;

  return {
    ...aquarium,
    fishes: aquarium.fishes.filter(item => {
      const fish = fishData.find(species => species.id === item.fishId);
      return !fish || (!isAquaticPlantSpecies(fish) && !isHardscapeSpecies(fish));
    }),
    plants: Array.from(new Set([...(aquarium.plants || []), ...plantIdsFromFishes])),
    hardscape: Array.from(new Set([...(aquarium.hardscape || []), ...hardscapeIdsFromFishes])),
  };
});

const parseLiters = (value: string | undefined, fallback = 0) => {
  const match = (value || '').match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : fallback;
};

const getTankGrossVolumeLiters = (dimensions?: Aquarium['dimensions']) => {
  const length = parseFloat(dimensions?.length || '60');
  const width = parseFloat(dimensions?.width || '40');
  const height = parseFloat(dimensions?.height || '40');
  if ([length, width, height].some(value => Number.isNaN(value) || value <= 0)) return 0;
  return Math.round((length * width * height) / 1000);
};

const getEstimatedWaterVolumeLiters = (dimensions?: Aquarium['dimensions']) => {
  const grossVolume = getTankGrossVolumeLiters(dimensions);
  return grossVolume > 0 ? Math.round(grossVolume * 0.85) : 0;
};

const getTankVolumeLiters = (aquarium: Aquarium) => {
  return getEstimatedWaterVolumeLiters(aquarium.dimensions);
};

const needsHeaterForSpecies = (fish: Fish) => {
  const match = fish.waterTemperature.match(/(\d+)-(\d+)/);
  if (!match) return false;
  return parseInt(match[1], 10) >= 20;
};

const loadDiscoveryState = () => {
  try {
    const state = normalizeDiscoveryState(JSON.parse(localStorage.getItem(DISCOVERY_STORAGE_KEY) || 'null'));
    return { ...state, queueIds: [] };
  } catch {
    return normalizeDiscoveryState();
  }
};

const saveDiscoveryState = (state: DiscoveryDeckState) => {
  localStorage.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify(state));
  patchLocalAppState({ discoveryState: state }, { debounce: true });
};

const getDiscoveryPositioning = (fish: Fish) => {
  const primaryTool = getToolFunctions(fish)[0];
  if (primaryTool) return `${primaryTool} · ${fish.housingMode || '适合继续观察'}`;
  if (fish.difficulty === 'Easy') return '适合新手观察和入门搭配';
  if (fish.housingMode) return fish.housingMode;
  return '可以先看详情，再决定是否加入鱼缸';
};

const getDiscoveryFitText = (fish: Fish) => {
  const lifeType = getLifeType(fish);
  if (lifeType === 'invertebrate') {
    return {
      suitable: '适合稳定淡水缸、草缸或工具生物搭配。',
      unsuitable: '不适合频繁下药、强攻击鱼或水质大幅波动的缸。',
    };
  }
  if (fish.difficulty === 'Easy') {
    return {
      suitable: '适合新手、稳定水体和循序少量添加。',
      unsuitable: '不适合刚开缸大量加入或与体型差异过大的鱼混养。',
    };
  }
  return {
    suitable: '适合已有稳定参数和一定养护经验后尝试。',
    unsuitable: fish.housingMode === '建议单养' ? '不适合随意混养，建议先单独规划缸位。' : '不适合水质不稳定或没有观察周期时直接加入。',
  };
};

const getBioLoadLiters = (fish: Fish) => {
  const lifeType = getLifeType(fish);
  if (lifeType === 'plant' || lifeType === 'hardscape') return 0;
  if (lifeType === 'invertebrate') {
    if (/螺|snail|Neritina|Pomacea|Clithon|Anentome/i.test(`${fish.name} ${fish.scientificName}`)) return 1.5;
    return 0.5;
  }
  if (lifeType === 'coral') return 8;
  if (lifeType === 'reptile') return 60;

  const base = fish.size === 'Large' ? 35 : fish.size === 'Medium' ? 9 : 2.5;
  const temperamentMultiplier = fish.temperament === 'Aggressive' || fish.temperament === 'Territorial' ? 1.35 : 1;
  return base * temperamentMultiplier;
};

const getArchiveCategory = (fish: Fish) => {
  const lifeType = getLifeType(fish);
  if (lifeType === 'plant') return '水草';
  if (lifeType === 'hardscape') {
    return /砂|泥|底床|substrate|soil|sand/i.test(`${fish.name} ${fish.scientificName}`) ? '底砂' : '造景';
  }
  if (lifeType === 'invertebrate') return '虾螺';
  return '鱼类';
};

const getSubstrateArchiveSpecies = (substrate?: string) => {
  if (!substrate || substrate === '无') return null;
  const hardscapeSpecies = fishData.filter(isHardscapeSpecies);
  return (
    hardscapeSpecies.find(item => item.name === substrate || item.name.includes(substrate) || substrate.includes(item.name))
    || (substrate.includes('化妆砂') ? hardscapeSpecies.find(item => item.name.includes('化妆砂')) : undefined)
    || (substrate.includes('水草泥') ? hardscapeSpecies.find(item => item.name.includes('水草泥')) : undefined)
    || (/砂|河沙|黑金沙|珊瑚砂/.test(substrate) ? hardscapeSpecies.find(item => item.name.includes('溪流砂') || item.name.includes('化妆砂')) : undefined)
    || null
  );
};

type DiagnosisMode = 'home' | 'quiz' | 'result' | 'history';

type DiagnosisQuizQuestion = DiagnosisQuestion;

type DiagnosisResult = {
  verdict: string;
  risk: string;
  riskLevel: 'low' | 'medium' | 'high' | 'unknown';
  currentAction: string;
  keyMetrics: Array<{ label: string; value: string }>;
  reasons: string[];
  actions: string[];
  avoid: string[];
  observe: string[];
  missing: string[];
  evidence: string[];
  nextCheckAt?: string;
};

type DiagnosisRecord = {
  diagnosisId: string;
  id?: string;
  createdAt: string;
  aquariumId: string;
  source?: {
    type: 'manual' | 'care_article' | 'home';
    title?: string;
  };
  problemType: string;
  answers: Record<string, string>;
  structuredAnswers?: Array<{ questionId: string; question: string; answer: string }>;
  resultSummary: string;
  riskLevel: string;
  riskCode?: 'low' | 'medium' | 'high' | 'unknown';
  conclusion?: string;
  keyMetrics?: Array<{ label: string; value: string }>;
  suggestedActions: string[];
  avoidActions?: string[];
  observeItems?: string[];
  missingInfo: string[];
  optionalMissingInfo?: string[];
  nextCheckAt?: string;
  followUpNotes: string[];
};

type CareDiagnosisContext = {
  source: 'care';
  topicId: string;
  title: string;
  category: string;
  diagnosisType: string;
  summary: string;
  selectedSymptoms: string[];
  completedSteps: string[];
  prepInfo: string[];
};

type SelectedAddFishItem = { fishId: string; quantity: number; entryDate: string };

const loadWishlistFishIds = () => {
  return new Set(getSpeciesFavoriteIds());
};

export default function AquariumManager() {
  const { captureContext, navigateToSection, restoreContext } = useWorkspaceNavigation();
  const { showToast } = useToast();
  const [aquariums, setAquariums] = useState<Aquarium[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [pendingDeleteAquariumId, setPendingDeleteAquariumId] = useState<string | null>(null);
  
  // UI States
  const [isAquariumMenuOpen, setIsAquariumMenuOpen] = useState(false);
  const [isAddFishOpen, setIsAddFishOpen] = useState(false);
  const [isSmartRecommendOpen, setIsSmartRecommendOpen] = useState(false);
  const [smartRecommendMode, setSmartRecommendMode] = useState<RecommendationMode>('existing_livestock');
  const [smartPreference, setSmartPreference] = useState('新手友好 低维护');
  const [smartSimulation, setSmartSimulation] = useState<SimulationResult | null>(null);
  const [smartAddQuantity, setSmartAddQuantity] = useState(1);
  const [smartCandidateScopeIds, setSmartCandidateScopeIds] = useState<string[] | null>(null);
  const [isTankCopilotOpen, setIsTankCopilotOpen] = useState(false);
  const [tankCopilotGoal, setTankCopilotGoal] = useState('');
  const [tankCopilotResult, setTankCopilotResult] = useState<TankBuildCopilotData | null>(null);
  const [isTankCopilotLoading, setIsTankCopilotLoading] = useState(false);
  const [tankCopilotError, setTankCopilotError] = useState('');
  const [tankCopilotAnswers, setTankCopilotAnswers] = useState<Record<string, string>>({});
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [selectedAqFish, setSelectedAqFish] = useState<{fish: Fish, aqFish: AquariumFish} | null>(null);
  const speciesDetailNavigationContextRef = useRef<WorkspaceNavigationContext | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isBuildPlanOpen, setIsBuildPlanOpen] = useState(false);
  const [isTankPreviewOpen, setIsTankPreviewOpen] = useState(false);
  const [isDiagnosisOpen, setIsDiagnosisOpen] = useState(false);
  const [diagnosisText, setDiagnosisText] = useState('');
  const [diagnosisFullText, setDiagnosisFullText] = useState('');
  const [diagnosisQuestion, setDiagnosisQuestion] = useState('');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisIssueType, setDiagnosisIssueType] = useState('巡检');
  const [diagnosisMode, setDiagnosisMode] = useState<DiagnosisMode>('home');
  const [diagnosisQuestionIndex, setDiagnosisQuestionIndex] = useState(0);
  const [diagnosisQuizAnswers, setDiagnosisQuizAnswers] = useState<Record<string, string>>({});
  const [diagnosisFollowUps, setDiagnosisFollowUps] = useState<Array<{ question: string; answer: string }>>([]);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [diagnosisAquariumId, setDiagnosisAquariumId] = useState('');
  const [diagnosisRecords, setDiagnosisRecords] = useState<DiagnosisRecord[]>([]);
  const [selectedDiagnosisRecord, setSelectedDiagnosisRecord] = useState<DiagnosisRecord | null>(null);
  const [diagnosisSaveMessage, setDiagnosisSaveMessage] = useState('');
  const [careDiagnosisContext, setCareDiagnosisContext] = useState<CareDiagnosisContext | null>(null);
  const [selectedBuildTemplateId, setSelectedBuildTemplateId] = useState(tankBuildTemplates[0].id);
  const [isTankArchiveExpanded, setIsTankArchiveExpanded] = useState(false);
  const [isDeceasedArchiveExpanded, setIsDeceasedArchiveExpanded] = useState(false);
  const [tankArchiveCategory, setTankArchiveCategory] = useState('全部');
  const [isTankContentFilterOpen, setIsTankContentFilterOpen] = useState(false);
  const [draftTankArchiveCategory, setDraftTankArchiveCategory] = useState('全部');
  const [settingsForm, setSettingsForm] = useState<Partial<Aquarium>>({});
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<'size' | 'parameters' | 'substrate' | 'plants' | 'lighting' | 'equipment' | null>(null);
  const [isPlantListExpanded, setIsPlantListExpanded] = useState(false);
  const [isScapeListExpanded, setIsScapeListExpanded] = useState(false);
  const settingsBodyRef = useRef<HTMLDivElement | null>(null);
  const settingPanelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // 3D Highlight state
  const [active3DSpecies, setActive3DSpecies] = useState<string | null>(null);

  // New fish form state
  const [fishSearchTerm, setFishSearchTerm] = useState('');
  const [selectedAddFishItems, setSelectedAddFishItems] = useState<SelectedAddFishItem[]>([]);
  const [addFishSuccess, setAddFishSuccess] = useState<{
    aquariumName: string;
    items: Array<{ fishId: string; name: string; quantity: number; entryDate: string; image: string }>;
  } | null>(null);
  const [addFishCompatibilityReview, setAddFishCompatibilityReview] = useState<SpeciesAdditionReview | null>(null);
  const [addFishDatePicker, setAddFishDatePicker] = useState<{ fishId: string; month: Date } | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedWaterChangeDate, setSelectedWaterChangeDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [waterChangeFeedback, setWaterChangeFeedback] = useState('');

  const [isRecommending, setIsRecommending] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string>('');
  const [aiReasoningSource, setAiReasoningSource] = useState<AiResponseSource | null>(null);

  const [wishlistFishIds, setWishlistFishIds] = useState<Set<string>>(() => loadWishlistFishIds());
  const [isWishlistExpanded, setIsWishlistExpanded] = useState(false);
  const [discoveryState, setDiscoveryState] = useState<DiscoveryDeckState>(() => loadDiscoveryState());
  const [discoveryDragStartX, setDiscoveryDragStartX] = useState<number | null>(null);
  const [discoveryDragX, setDiscoveryDragX] = useState(0);
  const [discoveryMessage, setDiscoveryMessage] = useState('');
  const [loadedDiscoveryImageSrc, setLoadedDiscoveryImageSrc] = useState('');
  const [selectedDiscoveryFish, setSelectedDiscoveryFish] = useState<Fish | null>(null);
  const [selectedWishlistFish, setSelectedWishlistFish] = useState<Fish | null>(null);

  const openAquariumSpeciesDetail = (fish: Fish, aqFish: AquariumFish, sourceId?: string) => {
    speciesDetailNavigationContextRef.current = captureContext(sourceId);
    setSelectedWishlistFish(null);
    setSelectedAqFish({ fish, aqFish });
  };

  const openWishlistSpeciesDetail = (fish: Fish, sourceId?: string) => {
    speciesDetailNavigationContextRef.current = captureContext(sourceId);
    setSelectedAqFish(null);
    setSelectedWishlistFish(fish);
  };

  const closeAquariumSpeciesDetail = () => {
    setSelectedAqFish(null);
    setSelectedWishlistFish(null);
    const context = speciesDetailNavigationContextRef.current;
    speciesDetailNavigationContextRef.current = null;
    if (context) void restoreContext(context);
  };
  const [deceasedRecords, setDeceasedRecords] = useState<DeceasedRecord[]>([]);
  const [tankActionMessage, setTankActionMessage] = useState<string>('');
  const [fedToday, setFedToday] = useState(false);
  const [priorityTaskStatus, setPriorityTaskStatus] = useState<Record<string, string>>({});
  const [isDailyAdviceDetailsOpen, setIsDailyAdviceDetailsOpen] = useState(false);
  const [dailyAdviceAiAnswer, setDailyAdviceAiAnswer] = useState('');
  const [dailyAdviceAiError, setDailyAdviceAiError] = useState('');
  const [dailyAdviceAiSource, setDailyAdviceAiSource] = useState<AiResponseSource | null>(null);
  const [isDailyAdviceAiLoading, setIsDailyAdviceAiLoading] = useState(false);
  const [isRiskReminderOpen, setIsRiskReminderOpen] = useState(false);
  const [isObservationOpen, setIsObservationOpen] = useState(false);
  const [observationChecks, setObservationChecks] = useState<string[]>([]);
  const [feedingRecords, setFeedingRecords] = useState<LocalEventRecord[]>([]);
  const [observationRecords, setObservationRecords] = useState<LocalEventRecord[]>([]);
  const [isLocalDataOpen, setIsLocalDataOpen] = useState(false);
  const [localDataText, setLocalDataText] = useState('');
  const [localDataMessage, setLocalDataMessage] = useState('');
  const [localWeather, setLocalWeather] = useState<LocalWeatherOutput | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  useEffect(() => {
    const appState = loadAppStateFromStorage();
    setWishlistFishIds(loadWishlistFishIds());
    setDeceasedRecords(Array.isArray(appState.deceasedRecords) ? appState.deceasedRecords as DeceasedRecord[] : []);
    setDiagnosisRecords(Array.isArray(appState.diagnosisRecords) ? appState.diagnosisRecords as DiagnosisRecord[] : []);
    setFeedingRecords(appState.feedingRecords);
    setObservationRecords(appState.observationRecords);
    setPriorityTaskStatus(appState.riskReminderState || {});
  }, []);

  useEffect(() => {
    let isMounted = true;
    setWeatherStatus('loading');

    weatherService.getLocalWeather({ timeoutMs: 8000 }).then((weather) => {
      if (!isMounted) return;
      setLocalWeather(weather);
      setWeatherStatus(weather.ok ? 'ready' : 'unavailable');
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isSettingsOpen) {
      setActiveSettingsPanel(null);
    }
  }, [isSettingsOpen]);

  useEffect(() => {
    if (!diagnosisFullText) {
      setDiagnosisText('');
      return;
    }

    setDiagnosisText('');
    let index = 0;
    const timer = window.setInterval(() => {
      index += 2;
      setDiagnosisText(diagnosisFullText.slice(0, index));
      if (index >= diagnosisFullText.length) {
        window.clearInterval(timer);
        setIsDiagnosing(false);
      }
    }, 18);

    return () => window.clearInterval(timer);
  }, [diagnosisFullText]);

  const syncWishlistFishIds = (next: Set<string>) => {
    setWishlistFishIds(next);
    setSpeciesFavoriteIds(next);
  };

  useEffect(() => {
    const refreshWishlist = () => setWishlistFishIds(loadWishlistFishIds());
    window.addEventListener('focus', refreshWishlist);
    const unsubscribe = subscribeToFavorites(refreshWishlist);
    return () => {
      window.removeEventListener('focus', refreshWishlist);
      unsubscribe();
    };
  }, []);

  const toggleWishlist = (id: string) => {
    const next = new Set(wishlistFishIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    syncWishlistFishIds(next);
  };

  useEffect(() => {
    const appState = loadAppStateFromStorage();
    if (appState.aquariums.length > 0) {
      const parsedItems = appState.aquariums.length > 0 ? appState.aquariums : [createDefaultAquarium()];
      const parsed = normalizeAquariumPlants(parsedItems);
      setAquariums(parsed);
      if (parsed.length > 0) setActiveId(appState.currentAquariumId && parsed.some(item => item.id === appState.currentAquariumId) ? appState.currentAquariumId : parsed[0].id);
      saveAppStateToStorage({ ...appState, aquariums: parsed, currentAquariumId: appState.currentAquariumId || parsed[0]?.id || '' });
    } else {
      const oldSaved = localStorage.getItem('myAquarium');
      const oldAquarium = safeJsonParse<Partial<Aquarium> | null>(oldSaved, null);
      const initialAquariums = normalizeAquariumPlants(oldAquarium ? [oldAquarium] : [createDefaultAquarium()]);
      setAquariums(initialAquariums);
      setActiveId(initialAquariums[0].id);
      saveAppStateToStorage({ ...appState, aquariums: initialAquariums, currentAquariumId: initialAquariums[0].id });
    }
  }, []);

  const saveAquariums = (newAquariums: Aquarium[]) => {
    setAquariums(newAquariums);
    localStorage.setItem('aquariums', JSON.stringify(newAquariums));
    patchLocalAppState({ aquariums: newAquariums, currentAquariumId: activeId || newAquariums[0]?.id || '' }, { debounce: true });
  };

  const handleAddAquarium = () => {
    const newAq = createDefaultAquarium(`我的鱼缸 ${aquariums.length + 1}`);
    const updated = [...aquariums, newAq];
    saveAquariums(updated);
    setActiveId(newAq.id);
  };

  const requestDeleteAquarium = (id: string) => {
    setPendingDeleteAquariumId(id);
  };

  const confirmDeleteAquarium = () => {
    if (!pendingDeleteAquariumId || aquariums.length <= 1) return;
    const updated = aquariums.filter(a => a.id !== pendingDeleteAquariumId);
    saveAquariums(updated);
    if (activeId === pendingDeleteAquariumId) {
      setActiveId(updated[0]?.id || '');
    }
    setPendingDeleteAquariumId(null);
  };

  const openLocalDataManager = () => {
    setLocalDataText('');
    setLocalDataMessage('');
    setIsLocalDataOpen(true);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash === '#local-data') {
      openLocalDataManager();
      return;
    }
    const settingsPanel = window.location.hash.match(/^#settings-(size|parameters|equipment)$/)?.[1];
    if (settingsPanel) openAquariumSettings(settingsPanel as 'size' | 'parameters' | 'equipment');
  }, []);

  const openAquariumSettings = (panel: typeof activeSettingsPanel = null) => {
    setSettingsForm(activeAquarium);
    setIsPlantListExpanded(panel === 'plants');
    setIsScapeListExpanded(panel === 'substrate');
    setActiveSettingsPanel(panel);
    setIsSettingsOpen(true);
  };

  const openSettingsPanel = (panel: NonNullable<typeof activeSettingsPanel>) => {
    const nextPanel = activeSettingsPanel === panel ? null : panel;
    setActiveSettingsPanel(nextPanel);
    if (panel === 'plants') setIsPlantListExpanded(true);
    if (panel === 'substrate') setIsScapeListExpanded(true);
    if (!nextPanel) return;
    window.setTimeout(() => {
      const body = settingsBodyRef.current;
      const target = settingPanelRefs.current[panel];
      if (!body || !target) return;
      body.scrollTo({ top: Math.max(0, target.offsetTop - 10), behavior: 'smooth' });
    }, 80);
  };

  useEffect(() => {
    if (!isSettingsOpen || !activeSettingsPanel) return;
    window.setTimeout(() => {
      const body = settingsBodyRef.current;
      const target = settingPanelRefs.current[activeSettingsPanel];
      if (!body || !target) return;
      body.scrollTo({ top: Math.max(0, target.offsetTop - 10), behavior: 'smooth' });
    }, 140);
  }, [activeSettingsPanel, isSettingsOpen]);

  const handleExportLocalData = () => {
    setLocalDataText(exportLocalAppState());
    setLocalDataMessage('已生成本地数据，可复制保存。');
  };

  const handleImportLocalData = () => {
    try {
      importLocalAppState(localDataText);
      setLocalDataMessage('导入成功，正在重新加载。');
      window.setTimeout(() => window.location.reload(), 300);
    } catch (error) {
      setLocalDataMessage(error instanceof Error ? error.message : '导入失败，请检查 JSON 格式。');
    }
  };

  const handleClearLocalData = () => {
    const confirmed = window.confirm('确认清除本地数据吗？清除后鱼缸、种草、诊断和记录都不会恢复。');
    if (!confirmed) return;
    clearLocalAppState();
    setLocalDataMessage('已清除本地数据，正在恢复默认鱼缸。');
    window.setTimeout(() => window.location.reload(), 300);
  };

  const activeAquarium = aquariums.find(a => a.id === activeId);
  const diagnosisAquarium = aquariums.find(a => a.id === (diagnosisAquariumId || activeId)) || activeAquarium;
  const pendingDeleteAquarium = aquariums.find(a => a.id === pendingDeleteAquariumId);

  useEffect(() => {
    if (!activeId) return;
    patchLocalAppState({ currentAquariumId: activeId }, { debounce: true });
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    setDiagnosisAquariumId(prev => prev || activeId);
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    setFedToday(feedingRecords.some(record => record.aquariumId === activeId && record.createdAt.startsWith(today)));
  }, [activeId, feedingRecords]);

  type TankRiskItem = {
    group: '容量风险' | '水质参数冲突' | '混养风险' | '信息不足';
    severity: 'info' | 'warning' | 'danger';
    title: string;
    detail: string;
    nextStep: string;
  };

  // --- COMPATIBILITY LOGIC ---
  const getTankRiskItems = (aquarium: Aquarium | undefined): TankRiskItem[] => {
    if (!aquarium || aquarium.fishes.length === 0) return [];
    const risks: TankRiskItem[] = [];
    
    const curFishes = aquarium.fishes.map(aqf => fishData.find(f => f.id === aqf.fishId)).filter(f => f !== undefined) as Fish[];
    const stockedItems = aquarium.fishes
      .map(aqFish => ({ aqFish, fish: fishData.find(f => f.id === aqFish.fishId) }))
      .filter(item => item.fish) as { aqFish: AquariumFish; fish: Fish }[];
    const animalItems = stockedItems.filter(({ fish }) => {
      const lifeType = getLifeType(fish);
      return lifeType !== 'plant' && lifeType !== 'hardscape';
    });

    // 1. Temperament
    const hasAggressive = curFishes.some(f => f.temperament === 'Aggressive');
    const hasPeaceful = curFishes.some(f => f.temperament === 'Peaceful');
    const hasSmall = curFishes.some(f => f.size === 'Small');
    const hasLarge = curFishes.some(f => f.size === 'Large');

    if (hasAggressive && hasPeaceful) {
      const aggressiveNames = curFishes.filter(f => f.temperament === 'Aggressive').map(f => f.name).slice(0, 3).join('、');
      risks.push({
        group: '混养风险',
        severity: 'danger',
        title: '攻击性和温和生物同缸',
        detail: `${aggressiveNames || '攻击性生物'} 与温和小型生物同缸，发生撕咬、追逐或吞食的风险较高。`,
        nextStep: '优先移除攻击性生物，或单独规划主题缸。',
      });
    }
    if (hasLarge && hasSmall && !hasAggressive) { // if aggressive already marked, avoid spam
      risks.push({
        group: '混养风险',
        severity: 'danger',
        title: '体型差异过大',
        detail: '当前同时存在大型和小型生物，小型鱼虾可能被追逐、抢食或吞食。',
        nextStep: '减少大型鱼，或为小型生物单独开缸。',
      });
    }

    // 2. pH
    const parseRange = (str: string) => {
      const match = str.match(/([\d.]+)-([\d.]+)/);
      if (match) return [parseFloat(match[1]), parseFloat(match[2])];
      const single = parseFloat(str);
      if (!isNaN(single)) return [single, single];
      return [0, 14];
    };
    
    const phRanges = animalItems
      .map(({ fish }) => ({ fish, range: parseRange(fish.phLevel) }))
      .filter(item => item.range[0] > 0 || item.range[1] < 14);
    let minPH = 0;
    let maxPH = 14;
    phRanges.forEach(({ range }, index) => {
      const [min, max] = range;
      if (index === 0) {
        minPH = min;
        maxPH = max;
      } else {
        minPH = Math.max(minPH, min);
        maxPH = Math.min(maxPH, max);
      }
    });
    if (phRanges.length > 1 && minPH > maxPH) {
      const sorted = [...phRanges].sort((a, b) => a.range[0] - b.range[0]);
      const low = sorted[0];
      const high = sorted[sorted.length - 1];
      risks.push({
        group: '水质参数冲突',
        severity: 'danger',
        title: 'pH 要求冲突',
        detail: `${low.fish.name}：${low.fish.phLevel}；${high.fish.name}：${high.fish.phLevel}。两者重叠区间为空，因此不建议同缸。`,
        nextStep: '移除偏酸或偏碱需求差异最大的对象，保持同缸生物 pH 区间有交集。',
      });
    }

    // 3. Water Type
    const waterTypes = new Set(curFishes.map(f => f.category === '海水鱼' ? 'Saltwater' : 'Freshwater'));
    if (waterTypes.size > 1) {
      risks.push({
        group: '水质参数冲突',
        severity: 'danger',
        title: '水体类型冲突',
        detail: '当前同时存在海水与淡水生物，水体类型无法同时满足。',
        nextStep: '把海水生物和淡水生物分缸管理。',
      });
    }

    // 4. Tank volume / stocking density
    const tankLiters = getTankVolumeLiters(aquarium);
    if (tankLiters > 0 && animalItems.length > 0) {
      const minRequiredLiters = Math.max(...animalItems.map(({ fish }) => parseLiters(fish.tankSize, 30)));
      const bioLoadLiters = animalItems.reduce((sum, { aqFish, fish }) => {
        return sum + getBioLoadLiters(fish) * Math.max(aqFish.quantity || 1, 1);
      }, 0);
      const totalQuantity = animalItems.reduce((sum, { aqFish }) => sum + Math.max(aqFish.quantity || 1, 1), 0);
      const loadSources = animalItems
        .map(({ aqFish, fish }) => ({
          name: fish.name,
          load: getBioLoadLiters(fish) * Math.max(aqFish.quantity || 1, 1),
          quantity: Math.max(aqFish.quantity || 1, 1),
        }))
        .sort((a, b) => b.load - a.load)
        .slice(0, 3)
        .map(item => `${item.name}×${item.quantity}`)
        .join('、');

      if (tankLiters < minRequiredLiters) {
        risks.push({
          group: '容量风险',
          severity: 'warning',
          title: '空间需求偏紧',
          detail: `鱼缸有效水体约 ${tankLiters}L，小于当前动物最低建议缸容 ${Math.round(minRequiredLiters)}L。`,
          nextStep: '优先减少空间需求最高的生物，或升级缸体。',
        });
      }
      if (bioLoadLiters > tankLiters) {
        risks.push({
          group: '容量风险',
          severity: 'danger',
          title: '动物负载超过当前水体',
          detail: `当前约 ${totalQuantity} 只/条动物，估算动物负载需要约 ${Math.round(bioLoadLiters)}L，当前有效水体 ${tankLiters}L。主要负载来源：${loadSources || '当前动物记录'}。`,
          nextStep: '先减少数量最多或负载最高的动物，再加强过滤和换水。',
        });
      } else if (bioLoadLiters > tankLiters * 0.75) {
        risks.push({
          group: '容量风险',
          severity: 'warning',
          title: '动物负载接近上限',
          detail: `当前约 ${totalQuantity} 只/条动物，估算动物负载需要约 ${Math.round(bioLoadLiters)}L，鱼缸有效水体约 ${tankLiters}L。`,
          nextStep: '暂缓继续加生物，观察氨氮、亚硝酸盐和溶氧。',
        });
      }
    }

    return risks;
  };

  const tankRiskItems = getTankRiskItems(activeAquarium);
  const conflicts = tankRiskItems.filter(item => item.severity !== 'info').map(item => `${item.title}：${item.detail}`);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);

  const handleRenameSubmit = () => {
    if (!activeAquarium || !editNameValue.trim()) {
      setIsEditingName(false);
      return;
    }
    const updated = aquariums.map(a => 
      a.id === activeId ? { ...a, name: editNameValue.trim() } : a
    );
    saveAquariums(updated);
    setIsEditingName(false);
  };

  const normalizeSelectedAddFishItems = () => selectedAddFishItems
      .filter(item => fishData.some(fish => fish.id === item.fishId))
      .map(item => ({
        ...item,
        quantity: Math.max(1, item.quantity || 1),
        entryDate: item.entryDate || format(new Date(), 'yyyy-MM-dd'),
      }));

  const buildAddFishCompatibilityReview = (items: SelectedAddFishItem[]) => (
    activeAquarium
      ? reviewSpeciesAdditions({ aquarium: activeAquarium, items, speciesCatalog: fishData })
      : null
  );

  const commitAddFishItems = (normalizedItems: SpeciesAdditionItem[], confirmedCaution = false) => {
    if (!activeAquarium || normalizedItems.length === 0) return false;

    const successItems = normalizedItems.map(item => {
      const fish = fishData.find(candidate => candidate.id === item.fishId);
      return {
        fishId: item.fishId,
        name: fish?.name || '生物',
        image: fish ? getSpeciesDisplayImage(fish) : '',
        quantity: item.quantity,
        entryDate: item.entryDate || format(new Date(), 'yyyy-MM-dd'),
      };
    });
    const execution = executeSpeciesAddition({
      aquariums,
      aquarium: activeAquarium,
      items: normalizedItems,
      speciesCatalog: fishData,
      confirmedCaution,
    });
    if (!execution.added) return false;

    saveAquariums(execution.aquariums);
    setAddFishCompatibilityReview(null);
    setAddFishSuccess({
      aquariumName: activeAquarium.name,
      items: successItems,
    });
    setSelectedAddFishItems([]);
    setFishSearchTerm('');
    setAddFishDatePicker(null);
    return true;
  };

  const handleAddFish = () => {
    if (!activeAquarium) {
      setTankActionMessage('请先选择当前鱼缸。');
      return;
    }
    if (selectedAddFishItems.length === 0) return;

    const normalizedItems = normalizeSelectedAddFishItems();
    if (normalizedItems.length === 0) return;

    const review = buildAddFishCompatibilityReview(normalizedItems);
    if (!review || getTankCompatibilityAddPolicy(review.status) === 'allow') {
      commitAddFishItems(normalizedItems);
      return;
    }

    setAddFishCompatibilityReview(review);
  };

  const handleConfirmAddFishAfterReview = () => {
    if (!addFishCompatibilityReview) return;
    const addPolicy = getTankCompatibilityAddPolicy(addFishCompatibilityReview.status);
    if (addPolicy === 'block') {
      setTankActionMessage('当前组合不建议加入，请先返回调整。');
      return;
    }
    if (addPolicy === 'complete_information') {
      const missingCodes = addFishCompatibilityReview.keyRules.map(rule => rule.code);
      const settingsPanel = missingCodes.some(code => /volume|size|tank/.test(code))
        ? 'size'
        : missingCodes.some(code => /filter|heater|equipment/.test(code))
          ? 'equipment'
          : 'parameters';
      setIsAddFishOpen(false);
      setAddFishCompatibilityReview(null);
      openAquariumSettings(settingsPanel);
      setTankActionMessage('请先补充鱼缸信息，再评估是否可以加入。');
      return;
    }
    commitAddFishItems(addFishCompatibilityReview.items, true);
  };

  const handleAddCompatibilitySpeciesToTank = async (items: { fishId: string; quantity: number }[]) => {
    if (!activeAquarium) {
      throw new Error('请先选择当前鱼缸。');
    }

    const entryDate = format(new Date(), 'yyyy-MM-dd');
    const normalizedItems = items
      .filter(item => fishData.some(fish => fish.id === item.fishId))
      .map(item => ({
        fishId: item.fishId,
        quantity: Math.max(1, item.quantity || 1),
        entryDate,
      }));

    if (normalizedItems.length === 0) {
      throw new Error('没有可加入当前鱼缸的生物。');
    }

    const execution = executeSpeciesAddition({
      aquariums,
      aquarium: activeAquarium,
      items: normalizedItems,
      speciesCatalog: fishData,
      confirmedCaution: true,
    });
    if (!execution.added) {
      throw new Error(execution.reason === 'missing_information'
        ? '请先补充鱼缸信息后再添加。'
        : execution.reason === 'blocked'
          ? '当前组合不建议加入鱼缸。'
          : '请先确认混养提醒后再添加。');
    }

    saveAquariums(execution.aquariums);
    const addedNames = normalizedItems
      .map(item => fishData.find(fish => fish.id === item.fishId)?.name)
      .filter(Boolean)
      .join('、');
    const message = `已加入 ${normalizedItems.length} 种生物到当前鱼缸${addedNames ? `：${addedNames}` : ''}。`;
    setTankActionMessage(message);
    return { message };
  };

  const handleViewTankAfterAdd = () => {
    setIsAddFishOpen(false);
    setAddFishSuccess(null);
    void navigateToSection('aquarium-records', { updateHash: false });
  };

  const handleContinueAddFish = () => {
    setAddFishSuccess(null);
    setFishSearchTerm('');
    setAddFishDatePicker(null);
    setAddFishCompatibilityReview(null);
  };

  const handleRemoveFish = (fishIdToRemove: string) => {
    if (!activeAquarium) return;
    const updated = aquariums.map(a => 
      a.id === activeId ? { ...a, fishes: a.fishes.filter(f => f.id !== fishIdToRemove) } : a
    );
    saveAquariums(updated);
  };

  const handleUpdateEntryDate = (fishId: string, newDate: string) => {
    if (!activeAquarium) return;
    const updated = aquariums.map(a => 
      a.id === activeId ? {
        ...a,
        fishes: a.fishes.map(f => f.id === fishId ? { ...f, entryDate: new Date(newDate).toISOString() } : f)
      } : a
    );
    saveAquariums(updated);
    if (selectedAqFish && selectedAqFish.aqFish.id === fishId) {
      setSelectedAqFish({ ...selectedAqFish, aqFish: { ...selectedAqFish.aqFish, entryDate: new Date(newDate).toISOString() } });
    }
  };

  const handleUpdateQuantity = (fishId: string, newQty: number) => {
    if (!activeAquarium || newQty < 1) return;
    const updated = aquariums.map(a => 
      a.id === activeId ? {
        ...a,
        fishes: a.fishes.map(f => f.id === fishId ? { ...f, quantity: newQty } : f)
      } : a
    );
    saveAquariums(updated);
    if (selectedAqFish && selectedAqFish.aqFish.id === fishId) {
      setSelectedAqFish({ ...selectedAqFish, aqFish: { ...selectedAqFish.aqFish, quantity: newQty } });
    }
  };

  const handleTankWaterChange = () => {
    if (!activeAquarium) return;
    const now = new Date().toISOString();
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const history = activeAquarium.waterChangeHistory || [];
    const hasTodayRecord = history.includes(todayStr);
    const newHistory = hasTodayRecord ? history.filter(date => date !== todayStr) : [...history, todayStr];
    const previousChangeDate = newHistory.length > 0
      ? new Date(newHistory[newHistory.length - 1]).toISOString()
      : activeAquarium.lastWaterChangeDate;

    const updated = aquariums.map(a => 
      a.id === activeId ? { 
        ...a, 
        lastWaterChangeDate: hasTodayRecord ? previousChangeDate : now,
        waterChangeHistory: newHistory,
        fishes: a.fishes.map(f => ({ ...f, lastWaterChangeDate: hasTodayRecord ? (previousChangeDate || f.lastWaterChangeDate) : now }))
      } : a
    );
    saveAquariums(updated);
    setTankActionMessage(hasTodayRecord ? '已撤回今日换水记录' : `已记录换水：${format(new Date(), 'yyyy-MM-dd HH:mm')}`);
  };

  const handleDailyAdviceAction = (action: 'start' | 'complete' | 'snooze' | 'toggle_steps' | 'open_ai_chat') => {
    const task = dailyAdviceViewModel.task;

    if (action === 'toggle_steps') {
      setIsDailyAdviceDetailsOpen(prev => !prev);
      return;
    }

    if (action === 'start') {
      setIsDailyAdviceDetailsOpen(true);
      setTankActionMessage(task ? '已展开今日建议步骤，请按步骤处理。' : '今天没有必须处理的任务，保持常规观察即可。');
      return;
    }

    if (action === 'complete') {
      if (!task) return;
      if (task.type === 'water_change') {
        handleTankWaterChange();
      } else {
        setTankActionMessage('已记录本次处理。');
      }
      return;
    }

    if (action === 'snooze') {
      if (!task) return;
      const overdueDays = Number(task.trigger.value?.overdueDays || 0);
      const confirmMessage = overdueDays > 0
        ? `换水计划已经逾期 ${overdueDays} 天，仍要推迟到明天吗？`
        : '确认把这项建议推迟到明天吗？';
      if (window.confirm(confirmMessage)) {
        setTankActionMessage('已记录：明天再次提醒。换水周期未改变。');
      }
      return;
    }

    if (action === 'open_ai_chat') {
      setIsDailyAdviceDetailsOpen(true);
    }
  };

  const handleAskDailyAdviceAI = async (question: string) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    const context = {
      aquariumId: activeAquarium?.id || '',
      aquarium: activeAquarium ? {
        name: activeAquarium.name,
        waterType: activeAquarium.waterType === 'Saltwater' ? '海水' : '淡水',
        volume: getTankVolumeLiters(activeAquarium),
        temperature: activeAquarium.targetTemperature,
        speciesCount: activeAquarium.fishes.reduce((sum, fish) => sum + Math.max(1, fish.quantity || 1), 0),
      } : null,
      currentTask: dailyAdviceViewModel.task ? {
        id: dailyAdviceViewModel.task.id,
        type: dailyAdviceViewModel.task.type,
        title: dailyAdviceViewModel.task.title,
        priority: dailyAdviceViewModel.task.priority,
        trigger: dailyAdviceViewModel.task.trigger,
      } : null,
      status: dailyAdviceViewModel.status,
      dataFreshness: {
        latestWaterChangeDate,
        missingData: dailyAdviceViewModel.status.missingData,
      },
    };

    setDailyAdviceAiAnswer('');
    setDailyAdviceAiError('');
    setDailyAdviceAiSource(null);
    setIsDailyAdviceAiLoading(true);

    try {
      const text = await askAquaGuideAI({
        system: [
          '你是 AquaGuide 今日建议解释助手。',
          '只能解释输入中的事实、缺失信息、建议步骤和还需要补充的信息。',
          '不能编造未记录的异常，不能把“暂无记录”说成“没有风险”。',
          '回答要短，最多 4 句。',
        ].join('\n'),
        messages: [{
          role: 'user',
          content: JSON.stringify({ question: trimmedQuestion, context }, null, 2),
        }],
        maxTokens: 500,
        temperature: 0.2,
      });
      setDailyAdviceAiSource('model');
      setDailyAdviceAiAnswer(text);
    } catch {
      setDailyAdviceAiSource('fallback');
      setDailyAdviceAiError('AI 暂不可用，系统规则仍可使用。');
    } finally {
      setIsDailyAdviceAiLoading(false);
    }
  };

  const handleApplyBuildTemplate = (adaptedPlan: AdaptedBuildPlan) => {
    if (!activeAquarium) return;
    if (!adaptedPlan.canApply) {
      setTankActionMessage('当前鱼缸低于该方案最低要求，无法直接应用。');
      return;
    }
    const template = adaptedPlan.template;
    const now = new Date().toISOString();
    const templateFish = adaptedPlan.appliedSpecies
      .map(item => ({ name: item.name, quantity: item.quantity, fish: item.fish || findStockSpeciesByName(item.name) }))
      .filter((item): item is { name: string; quantity: number; fish: Fish } => Boolean(item.fish));

    const updated = aquariums.map(a => (
      a.id === activeId
        ? (() => {
            const nextFishes = [...a.fishes];
            templateFish.forEach(({ fish, quantity }) => {
              const existingIndex = nextFishes.findIndex(item => item.fishId === fish.id);
              if (existingIndex >= 0) {
                nextFishes[existingIndex] = {
                  ...nextFishes[existingIndex],
                  quantity: Math.max(nextFishes[existingIndex].quantity || 1, quantity),
                };
                return;
              }

              nextFishes.push({
                id: Math.random().toString(36).substring(2, 9),
                fishId: fish.id,
                quantity,
                entryDate: now,
                lastWaterChangeDate: now,
              });
            });

            return {
              ...a,
              waterType: 'Freshwater' as const,
              targetTemperature: template.temperature,
              substrate: template.substrate,
              plants: template.plants,
              hardscape: template.hardscape,
              equipment: template.equipmentSettings,
              fishes: nextFishes,
              buildTemplateMeta: {
                id: template.id,
                name: template.name,
                appliedAt: now,
                capacityGuidance: template.capacityGuidance,
                adaptedStatus: adaptedPlan.status,
                adaptedSummary: adaptedPlan.summary,
                stockedSpecies: templateFish.map(({ name, quantity }) => ({ name, quantity })),
              },
            };
          })()
        : a
    ));

    saveAquariums(updated);
    setTankActionMessage(`已应用「${template.name}」的适配方案：${adaptedPlan.summary}`);
    setIsBuildPlanOpen(false);
  };

  const handleToggleWaterChangeDate = (dateStr: string) => {
    if (!activeAquarium) return;
    const history = activeAquarium.waterChangeHistory || [];
    let newHistory;
    if (history.includes(dateStr)) {
      newHistory = history.filter(d => d !== dateStr);
    } else {
      newHistory = [...history, dateStr];
    }
    newHistory.sort();
    
    // Update lastWaterChangeDate if needed
    let newLastDate = activeAquarium.lastWaterChangeDate;
    if (newHistory.length > 0) {
      const latest = newHistory[newHistory.length - 1];
      newLastDate = new Date(latest).toISOString();
    } else {
      newLastDate = new Date().toISOString(); // fallback
    }

    const updated = aquariums.map(a => 
      a.id === activeId ? { 
        ...a, 
        waterChangeHistory: newHistory,
        lastWaterChangeDate: newLastDate
      } : a
    );
    saveAquariums(updated);
  };

  const getConflicts = (_fishes: AquariumFish[]): string[] => {
    return tankRiskItems.filter(item => item.severity !== 'info').map(item => `${item.title}：${item.detail}`);
  };

  const formatRiskExplanationText = (explanation: RiskExplanationData, localRiskItems: TankRiskItem[]) => {
    const localFallbackText = 'AI 暂不可用，系统规则仍可使用。';

    if (explanation.fallback) return localFallbackText;

    const lines = [
      explanation.summary,
      ...explanation.reasons.map(reason => `${reason.title}：${reason.detail}${reason.source ? `（${reason.source}）` : ''}`),
      ...explanation.suggestions.map(suggestion => `建议：${suggestion.title}，${suggestion.detail}`),
      ...explanation.nextSteps.map((step, index) => `下一步 ${index + 1}：${step}`),
      explanation.disclaimer,
    ];

    return lines.filter(Boolean).join('\n');
  };

  const handleAskAIAboutConflicts = async () => {
    if (!activeAquarium) return;
    setIsRecommending(true);
    setAiReasoning('');
    setAiReasoningSource(null);
    try {
      const livestock = activeAquarium.fishes.map(af => {
        const fish = fishData.find(d => d.id === af.fishId);
        return fish ? {
          id: fish.id,
          name: fish.name,
          quantity: af.quantity,
          category: fish.category,
          phLevel: fish.phLevel,
          waterTemperature: fish.waterTemperature,
          size: fish.size,
          temperament: fish.temperament,
          tankSize: fish.tankSize,
        } : null;
      }).filter(Boolean);
      const riskLevel = tankRiskItems.some(item => item.severity === 'danger')
        ? 'high'
        : tankRiskItems.some(item => item.severity === 'warning')
          ? 'medium'
          : 'info';
      const riskResult = {
        riskLevel,
        riskItems: tankRiskItems,
        conflicts,
      };

      const explanation = await generateRiskExplanation({
        aquarium: {
          id: activeAquarium.id,
          name: activeAquarium.name,
          waterType: activeAquarium.waterType,
          targetTemperature: activeAquarium.targetTemperature,
          dimensions: activeAquarium.dimensions,
          equipment: activeAquarium.equipment,
          volumeLiters: getTankVolumeLiters(activeAquarium),
        },
        selectedSpecies: livestock,
        existingLivestock: livestock,
        riskResult,
        ruleFacts: {
          source: 'AquaGuide local tank risk checker',
          riskItems: tankRiskItems,
          conflicts,
        },
      });

      setAiReasoningSource(explanation.source === 'model' ? 'model' : 'fallback');
      setAiReasoning(formatRiskExplanationText(explanation, tankRiskItems));
    } catch(e) {
      console.error(e);
      setAiReasoningSource('fallback');
      setAiReasoning(formatRiskExplanationText({
        summary: 'AI 暂不可用，系统规则仍可使用。',
        reasons: [],
        suggestions: [],
        nextSteps: [],
        disclaimer: '最终判断以系统规则结果为准',
        fallback: true,
      }, tankRiskItems));
    }
    setIsRecommending(false);
  };
  const openSmartRecommendation = (
    mode: RecommendationMode = activeAquarium.fishes.length > 0 ? 'existing_livestock' : 'empty_tank',
    candidateIds: string[] | null = null,
  ) => {
    setSmartRecommendMode(mode);
    setSmartCandidateScopeIds(candidateIds);
    setSmartSimulation(null);
    setSmartAddQuantity(1);
    setIsSmartRecommendOpen(true);
  };

  const openTankBuildCopilot = () => {
    setTankCopilotError('');
    setTankCopilotResult(null);
    setTankCopilotAnswers({});
    setTankCopilotGoal(prev => prev || (activeAquarium.fishes.length > 0 ? '基于当前鱼缸规划下一步安全搭配' : '新手小型淡水缸'));
    setIsTankCopilotOpen(true);
  };

  const handleTankCopilotGenerate = async (goalOverride?: string, answerOverride?: Record<string, string>) => {
    const nextGoal = (goalOverride ?? tankCopilotGoal).trim();
    if (!nextGoal) {
      setTankCopilotError('先写一句目标，例如“新手小型淡水缸”。');
      return;
    }

    const nextAnswers = answerOverride ?? (goalOverride ? {} : tankCopilotAnswers);

    setTankCopilotGoal(nextGoal);
    if (goalOverride) setTankCopilotAnswers({});
    setTankCopilotError('');
    setIsTankCopilotLoading(true);
    try {
      const context = buildTankCopilotContext({
        aquarium: activeAquarium,
        userGoal: nextGoal,
        answers: nextAnswers,
        smartRecommendation,
      });
      const result = await generateTankBuildCopilot(context);
      setTankCopilotResult(result);
      setTankCopilotError('');
    } catch {
      setTankCopilotError('AI 建缸规划暂时不可用，请稍后重试。');
    } finally {
      setIsTankCopilotLoading(false);
    }
  };

  const handleTankCopilotNextAction = () => {
    if (!tankCopilotResult) {
      void handleTankCopilotGenerate();
      return;
    }

    const nextAction = tankCopilotResult.recommendedActions[0];

    if (nextAction?.type === 'complete_tank_info') {
      const missingInfo = getTankCopilotMissingInfo(activeAquarium);
      const targetPanel = getSettingsPanelForMissingInfo([
        ...missingInfo,
        ...tankCopilotMissingQuestions.map(question => question.prompt),
      ]);
      setIsTankCopilotOpen(false);
      openAquariumSettings(targetPanel);
      return;
    }

    if (nextAction?.type === 'view_safe_candidates') {
      if (tankCopilotAllowedCandidates.length === 0) {
        setTankCopilotResult(null);
        setTankCopilotAnswers({});
        setTankCopilotError('当前本地规则没有可执行候选，请换一个目标或先完善鱼缸信息。');
        return;
      }
      setIsTankCopilotOpen(false);
      openSmartRecommendation(
        activeAquarium.fishes.length > 0 ? 'existing_livestock' : 'empty_tank',
        tankCopilotAllowedCandidates.map(candidate => candidate.speciesId),
      );
      return;
    }

    if (nextAction?.type === 'start_addition_simulation') {
      if (!tankCopilotPrimaryCandidate) {
        setTankCopilotResult(null);
        setTankCopilotAnswers({});
        setTankCopilotError('当前没有能进入模拟添加的安全候选，请重新描述目标。');
        return;
      }
      setIsTankCopilotOpen(false);
      openSmartRecommendation(
        activeAquarium.fishes.length > 0 ? 'existing_livestock' : 'empty_tank',
        tankCopilotAllowedCandidates.map(candidate => candidate.speciesId),
      );
      openSmartSimulation(tankCopilotPrimaryCandidate);
      return;
    }

    setTankCopilotResult(null);
    setTankCopilotAnswers({});
    setTankCopilotError('可以重新描述目标，生成更具体的建缸方案。');
  };

  const openSmartSimulation = (candidate: RecommendationCandidate) => {
    const simulation = recommendationService.simulateSmartAdd({
      candidate,
      quantity: candidate.recommendedQuantity,
      profile: smartRecommendation.profile,
      speciesPool: fishData,
    });
    setSmartSimulation(simulation);
    setSmartAddQuantity(candidate.recommendedQuantity);
  };

  const updateSmartSimulationQuantity = (quantity: number) => {
    if (!smartSimulation) return;
    const nextQuantity = Math.max(1, quantity);
    setSmartAddQuantity(nextQuantity);
    setSmartSimulation(recommendationService.simulateSmartAdd({
      candidate: smartSimulation.candidate,
      quantity: nextQuantity,
      profile: smartRecommendation.profile,
      speciesPool: fishData,
    }));
  };

  const confirmSmartSimulationAdd = () => {
    if (!activeAquarium || !smartSimulation) {
      showToast('当前没有可确认的模拟方案。', 'error');
      return;
    }
    const species = fishData.find(item => item.id === smartSimulation.candidate.speciesId);
    if (!species) {
      showToast('候选物种资料不存在，无法加入鱼缸。', 'error');
      return;
    }
    const execution = executeSpeciesAddition({
      aquariums,
      aquarium: activeAquarium,
      items: [{ fishId: species.id, quantity: smartAddQuantity, entryDate: format(new Date(), 'yyyy-MM-dd') }],
      speciesCatalog: fishData,
      confirmedCaution: true,
    });

    if (!execution.added) {
      const message = execution.reason === 'missing_information'
        ? '请先补充鱼缸信息，再确认模拟添加。'
        : execution.reason === 'blocked'
          ? '规则复核后仍不建议加入该物种。'
          : '当前模拟无法写入鱼缸，请重新评估。';
      showToast(message, 'error');
      return;
    }

    saveAquariums(execution.aquariums);
    setTankActionMessage(`已加入 ${species.name} x${smartAddQuantity}，建议观察 3-7 天。`);
    showToast(`已加入 ${species.name} x${smartAddQuantity}`, 'success');
    setSmartSimulation(null);
    setSmartCandidateScopeIds(null);
    setIsSmartRecommendOpen(false);
  };

  const diagnosisIconMap = {
    巡检: <Activity className="h-4 w-4" />,
    换水: <Droplets className="h-4 w-4" />,
    水质异常: <Droplets className="h-4 w-4" />,
    鱼只异常: <AlertTriangle className="h-4 w-4" />,
    新鱼入缸: <Plus className="h-4 w-4" />,
    喂食问题: <Heart className="h-4 w-4" />,
    '怀孕/鱼苗': <Sparkles className="h-4 w-4" />,
    死亡处理: <Skull className="h-4 w-4" />,
    设备异常: <Settings className="h-4 w-4" />,
  };

  const diagnosisIssueTypes = diagnosisProblemTypes.map(type => ({
    ...type,
    icon: diagnosisIconMap[type.id] || <Activity className="h-4 w-4" />,
  }));

  const getDiagnosisLivestock = (aquarium: Aquarium | undefined) => (
    (aquarium?.fishes || [])
      .map(aqFish => ({ aqFish, fish: fishData.find(item => item.id === aqFish.fishId) }))
      .filter((item): item is { aqFish: AquariumFish; fish: Fish } => {
        if (!item.fish) return false;
        const lifeType = getLifeType(item.fish);
        return lifeType !== 'plant' && lifeType !== 'hardscape';
      })
  );

  const getDiagnosisTankSummary = () => {
    const targetAquarium = diagnosisAquarium;
    const stockedFishes = targetAquarium?.fishes || [];
    const currentLivestock = getDiagnosisLivestock(targetAquarium);
    const stocked = currentLivestock
      .map(({ aqFish, fish }) => `${fish.name} x${aqFish.quantity || 1}`)
      .join('、') || '暂无活体生物';
    const latestAdded = [...stockedFishes]
      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())[0];
    const latestAddedFish = latestAdded ? fishData.find(item => item.id === latestAdded.fishId) : null;
    const latestFeeding = feedingRecords
      .filter(record => record.aquariumId === targetAquarium?.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    return {
      aquariumId: targetAquarium?.id || '',
      name: targetAquarium?.name || '未选择鱼缸',
      water: targetAquarium?.waterType === 'Saltwater' ? '海水' : '淡水',
      temperature: `${targetAquarium?.targetTemperature || 25}°C`,
      volume: `约 ${targetAquarium ? getTankVolumeLiters(targetAquarium) : 0}L`,
      dimensions: targetAquarium ? `${targetAquarium.dimensions.length}×${targetAquarium.dimensions.width}×${targetAquarium.dimensions.height}cm` : '未设置',
      stocked,
      livestockCount: currentLivestock.reduce((sum, item) => sum + (item.aqFish.quantity || 1), 0),
      waterChange: targetAquarium?.lastWaterChangeDate ? format(new Date(targetAquarium.lastWaterChangeDate), 'MM/dd') : '暂无记录',
      recentFeeding: latestFeeding ? format(new Date(latestFeeding.createdAt), 'MM/dd HH:mm') : '暂无记录',
      recentAddedSpecies: latestAddedFish ? `${latestAddedFish.name} · ${format(new Date(latestAdded.entryDate), 'MM/dd')}` : '暂无记录',
      equipment: targetAquarium ? [
        targetAquarium.equipment?.filter ? `过滤：${targetAquarium.equipment.filter}` : '',
        targetAquarium.equipment?.heater ? '加热：有' : '加热：无',
        targetAquarium.equipment?.oxygen ? '增氧：有' : '增氧：无',
      ].filter(Boolean).join(' / ') : '未设置',
      missing: ['如情况没有改善，可选补充 pH / 氨氮 / 亚硝酸盐'],
    };
  };

  const buildStructuredDiagnosis = (): DiagnosisResult => {
    const targetAquarium = diagnosisAquarium;
    if (!targetAquarium) {
      return {
        verdict: '请先选择一个鱼缸，再进行诊断。',
        risk: '信息不足',
        riskLevel: 'unknown',
        currentAction: '先选择鱼缸',
        keyMetrics: [],
        reasons: [],
        actions: ['先选择或创建一个鱼缸'],
        avoid: ['不要在没有鱼缸数据时判断'],
        observe: [],
        missing: ['鱼缸数据'],
        evidence: [],
      };
    }

    const currentLivestock = getDiagnosisLivestock(targetAquarium);
    const livestockNames = currentLivestock.map(({ aqFish, fish }) => `${fish.name} x${aqFish.quantity || 1}`);
    const hasShrimp = currentLivestock.some(({ fish }) => /虾|shrimp|neocaridina|caridina/i.test(`${fish.name} ${fish.scientificName}`));
    const hasPlants = (targetAquarium.plants || []).length > 0;
    const problemType: DiagnosisProblemType = isDiagnosisProblemType(diagnosisIssueType) ? diagnosisIssueType : '巡检';
    const makeStaticResult = (
      verdict: string,
      currentAction: string,
      actions: string[],
      avoid: string[],
      observe: string[],
      missing: string[] = ['活体生物记录', '水质数据'],
    ): DiagnosisResult => ({
      verdict,
      risk: '信息不足',
      riskLevel: 'unknown',
      currentAction,
      keyMetrics: [
        { label: '问题类型', value: problemType },
        { label: '当前鱼缸', value: targetAquarium.name },
        { label: '活体数量', value: `${currentLivestock.reduce((sum, item) => sum + (item.aqFish.quantity || 1), 0)} 只/条` },
      ],
      reasons: ['当前数据不足，不能生成鱼只状态判断'],
      actions,
      avoid,
      observe,
      missing,
      evidence: [
        `当前鱼缸：${targetAquarium.name}`,
        `当前活体：${livestockNames.join('、') || '暂无活体生物'}`,
        `水体：${diagnosisTankSummary.water} · ${diagnosisTankSummary.volume} · ${diagnosisTankSummary.temperature}`,
      ],
    });

    const livestockProblemTypes: DiagnosisProblemType[] = [
      '鱼浮头 / 呼吸急促',
      '拒食',
      '躲藏不动',
      '追咬打架',
      '死亡 / 异常死亡',
      '鱼只异常',
      '新鱼入缸',
      '喂食问题',
      '怀孕/鱼苗',
      '死亡处理',
    ];
    if (currentLivestock.length === 0 && (problemType === '巡检' || livestockProblemTypes.includes(problemType))) {
      return makeStaticResult(
        '当前鱼缸暂无活体生物，无法诊断鱼只状态。',
        '先添加生物，或仅查看水质/设备排查建议',
        ['先确认鱼缸过滤、温度和水体是否稳定', '如果只是水浑或设备异常，请选择对应问题类型', '添加活体后再进行鱼只状态诊断'],
        ['不要在没有活体记录时判断鱼病', '不要套用其他鱼种的固定建议'],
        ['过滤是否正常出水', '水体是否浑浊或有异味', '温度是否稳定'],
        ['活体生物记录'],
      );
    }
    if (problemType === '虾类死亡' && !hasShrimp) {
      return makeStaticResult(
        '当前鱼缸没有虾类记录，无法生成虾类死亡诊断。',
        '先确认是否已把虾类添加到当前鱼缸',
        ['检查当前鱼缸活体列表是否选对', '如果实际有虾，请先添加到鱼缸记录', '如果只是水质异常，请切换到水质诊断'],
        ['不要套用虾类蜕壳或铜药风险判断到没有虾的鱼缸'],
        ['当前真实活体是否完整记录', '水体是否有异味或浑浊'],
      );
    }
    if (problemType === '水草黄叶 / 烂叶' && !hasPlants) {
      return makeStaticResult(
        '当前鱼缸没有水草配置记录，无法判断水草黄叶或烂叶。',
        '先补充水草配置，或切换到水质/设备排查',
        ['确认当前鱼缸是否已经记录水草', '检查灯光时长和过滤是否稳定', '如果实际有水草，请先添加到设备配置'],
        ['不要把水草黄叶原因套用到无水草鱼缸'],
        ['灯光是否正常', '水体是否浑浊', '底床是否近期翻动'],
        ['水草配置记录'],
      );
    }

    const snapshot = {
      aquariumId: targetAquarium.id,
      waterType: diagnosisTankSummary.water,
      temperature: diagnosisTankSummary.temperature,
      volume: diagnosisTankSummary.volume,
      stocked: diagnosisTankSummary.stocked,
      recentWaterChange: diagnosisTankSummary.waterChange,
      recentFeeding: diagnosisTankSummary.recentFeeding,
      recentAddedSpecies: diagnosisTankSummary.recentAddedSpecies,
      healthScore,
      riskCount: riskReminderCount,
    };
    const output: DiagnosisOutput = buildDiagnosisResult({
      aquarium: targetAquarium,
      snapshot,
      problemType,
      answers: diagnosisQuizAnswers as DiagnosisAnswerMap,
      careTopics: careTopicsData,
      previousDiagnosisRecords: recentDiagnosisRecords,
      sourceContext: careDiagnosisContext
        ? { source: 'care_article', title: careDiagnosisContext.title, category: careDiagnosisContext.category }
        : { source: 'home' },
    });

    return {
      verdict: output.summary,
      risk: output.riskLabel,
      riskLevel: output.riskLevel,
      currentAction: output.currentAction,
      keyMetrics: output.keyMetrics,
      reasons: output.possibleCauses,
      actions: output.actions,
      avoid: output.avoidActions,
      observe: output.observeItems,
      missing: output.missingInfo,
      evidence: Array.from(new Set([
        `当前鱼缸：${targetAquarium.name}`,
        `当前真实活体：${livestockNames.join('、') || '暂无活体生物'}`,
        ...output.evidence,
      ].filter(Boolean))).slice(0, 6),
      nextCheckAt: output.nextCheckAt,
    };
  };

  const buildDiagnosisFollowUpAnswer = (question: string) => {
    const lower = question.toLowerCase();
    const base = diagnosisIssueType === '巡检' ? '当前是巡检模式，建议先选择一个具体问题类型，这样判断会更准确。' : `这个追问仍按「${diagnosisIssueType}」来判断。`;
    if (/躲|藏|不出来|怕/.test(question)) {
      return `${base} 更像应激或被追赶。先弱光、减少打扰，观察 24-48 小时；如果同时浮头、白点或拒食，需要升级为鱼只异常诊断。还需要补充：入缸多久、同缸鱼是否追它。`;
    }
    if (/浮头|呼吸|喘|缺氧/.test(question)) {
      return `${base} 浮头/急促呼吸优先按缺氧或水质刺激处理：先增加打氧，检查过滤出水，今天停喂；若伴随异味或水浑，少量换水 20%。还需要补充：是否多条鱼同时浮头、水温和最近换水时间。`;
    }
    if (/白点|烂尾|红血丝|蹭/.test(question)) {
      return `${base} 体表异常不要直接混药。先隔离观察、确认是否扩散到多条鱼，再决定治疗方向。需要补充：异常持续多久、是否有照片描述、同缸其他鱼是否正常。`;
    }
    if (/喂|饲料|吃|残饵/.test(question) || lower.includes('feed')) {
      return `${base} 先把投喂降到 2-3 分钟内吃完，残饵及时清理；如果水已经变浑，停喂 1 天并检查过滤。需要补充：每天喂几次、缸底是否有残饵。`;
    }
    if (/死|死亡/.test(question)) {
      return `${base} 死鱼先立即移除，再看是否连续死亡或其他鱼异常。不要马上全缸下药，先补充最近换水、加药、新鱼入缸和水质数据。`;
    }
    return `${base} 目前信息还不足，先补充：异常持续多久、是否多条鱼同时出现、最近是否换水/加药/新鱼入缸，以及 pH、氨氮、亚硝酸盐数据。`;
  };

  const handleOpenDiagnosis = () => {
    if (!activeAquarium) return;
    setDiagnosisAquariumId(activeAquarium.id);
    setIsDiagnosisOpen(true);
    setDiagnosisMode('home');
    setSelectedDiagnosisRecord(null);
    setCareDiagnosisContext(null);
    setDiagnosisResult(null);
    setIsDiagnosing(false);
    setDiagnosisFullText('');
    setDiagnosisText('');
    setDiagnosisSaveMessage('');
  };

  const handleOpenDiagnosisWithType = (typeId: string) => {
    if (!activeAquarium) return;
    const safeType: DiagnosisProblemType = isDiagnosisProblemType(typeId) ? typeId : '巡检';
    setDiagnosisAquariumId(activeAquarium.id);
    setIsDiagnosisOpen(true);
    setDiagnosisIssueType(safeType);
    setDiagnosisMode('quiz');
    setDiagnosisQuestionIndex(0);
    setDiagnosisQuizAnswers({});
    setDiagnosisFollowUps([]);
    setDiagnosisResult(null);
    setDiagnosisQuestion('');
    setDiagnosisSaveMessage('');
    setSelectedDiagnosisRecord(null);
    setCareDiagnosisContext(null);
    setIsDiagnosing(false);
    setDiagnosisFullText('');
    setDiagnosisText('');
  };

  const handleStartDiagnosisQuiz = (typeId: string) => {
    const safeType: DiagnosisProblemType = isDiagnosisProblemType(typeId) ? typeId : '巡检';
    setDiagnosisIssueType(safeType);
    setDiagnosisMode('quiz');
    setDiagnosisQuestionIndex(0);
    setDiagnosisQuizAnswers({});
    setDiagnosisFollowUps([]);
    setDiagnosisResult(null);
    setDiagnosisQuestion('');
    setDiagnosisSaveMessage('');
    setSelectedDiagnosisRecord(null);
    setCareDiagnosisContext(null);
  };

  const handleDiagnosisAnswer = (questionId: string, answer: string) => {
    setDiagnosisQuizAnswers(prev => ({ ...prev, [questionId]: answer }));
    setDiagnosisResult(null);
    setDiagnosisSaveMessage('');
  };

  const handleRunDiagnosis = () => {
    const result = buildStructuredDiagnosis();
    setDiagnosisResult(result);
    setDiagnosisMode('result');
    setDiagnosisSaveMessage('');
  };

  const handleDiagnosisNext = () => {
    const problemType: DiagnosisProblemType = isDiagnosisProblemType(diagnosisIssueType) ? diagnosisIssueType : '巡检';
    const questions = getDiagnosisQuestions(problemType, diagnosisQuizAnswers);
    if (diagnosisQuestionIndex < questions.length - 1) {
      setDiagnosisQuestionIndex(prev => prev + 1);
      return;
    }
    handleRunDiagnosis();
  };

  const handleDiagnosisPrevious = () => {
    if (diagnosisQuestionIndex > 0) {
      setDiagnosisQuestionIndex(prev => prev - 1);
      return;
    }
    setDiagnosisMode('home');
  };

  const handleSaveDiagnosisRecord = () => {
    const targetAquarium = diagnosisAquarium;
    if (!targetAquarium) return;
    const result = diagnosisResult || buildStructuredDiagnosis();
    const problemType: DiagnosisProblemType = isDiagnosisProblemType(diagnosisIssueType) ? diagnosisIssueType : '巡检';
    const activeQuestions = getDiagnosisQuestions(problemType, diagnosisQuizAnswers);
    const structuredAnswers = activeQuestions
      .filter(question => diagnosisQuizAnswers[question.id])
      .map(question => ({
        questionId: question.id,
        question: question.question,
        answer: diagnosisQuizAnswers[question.id],
      }));
    const id = Math.random().toString(36).substring(2, 10);
    const record: DiagnosisRecord = {
      diagnosisId: id,
      id,
      createdAt: new Date().toISOString(),
      aquariumId: targetAquarium.id,
      source: careDiagnosisContext
        ? { type: 'care_article', title: careDiagnosisContext.title }
        : { type: 'home' },
      problemType: diagnosisIssueType,
      answers: diagnosisQuizAnswers,
      structuredAnswers,
      resultSummary: result.verdict,
      riskLevel: result.risk,
      riskCode: result.riskLevel,
      conclusion: result.verdict,
      keyMetrics: result.keyMetrics,
      suggestedActions: result.actions,
      avoidActions: result.avoid,
      observeItems: result.observe,
      missingInfo: result.missing,
      optionalMissingInfo: result.missing,
      nextCheckAt: result.nextCheckAt,
      followUpNotes: [
        ...(careDiagnosisContext ? [`来自百科：${careDiagnosisContext.title}`] : []),
        ...diagnosisFollowUps.map(item => `问：${item.question}；答：${item.answer}`),
      ],
    };
    const nextRecords = [record, ...diagnosisRecords].slice(0, 50);
    setDiagnosisRecords(nextRecords);
    localStorage.setItem('aquarium_diagnosis_records', JSON.stringify(nextRecords));
    patchLocalAppState({ diagnosisRecords: nextRecords }, { debounce: true });
    setDiagnosisSaveMessage('已保存到诊断记录，下次诊断会参考最近记录。');
  };

  const handleDiagnosisFollowUp = () => {
    const question = diagnosisQuestion.trim();
    if (!question || isDiagnosing) return;
    setDiagnosisQuestion('');
    setDiagnosisFollowUps(prev => [...prev, { question, answer: buildDiagnosisFollowUpAnswer(question) }]);
  };

  useEffect(() => {
    if (!activeAquarium) return;
    const rawContext = sessionStorage.getItem('aquaguide_pending_diagnosis');
    if (!rawContext) return;

    const context = safeJsonParse<CareDiagnosisContext | null>(rawContext, null);
    sessionStorage.removeItem('aquaguide_pending_diagnosis');
    if (!context?.title) return;

    const issueType = isDiagnosisProblemType(context.diagnosisType)
      ? context.diagnosisType
      : /换水|安全换水/.test(`${context.title}${context.summary}${context.category}`)
        ? '换水'
        : /鱼苗|怀孕|繁殖/.test(`${context.title}${context.summary}${context.category}`)
          ? '怀孕/鱼苗'
          : '巡检';
    setCareDiagnosisContext(context);
    setDiagnosisAquariumId(activeAquarium.id);
    setDiagnosisIssueType(issueType);
    setDiagnosisMode('quiz');
    setDiagnosisQuestionIndex(0);
    setDiagnosisQuizAnswers({});
    setDiagnosisFollowUps([]);
    setDiagnosisResult(null);
    setDiagnosisQuestion('');
    setDiagnosisSaveMessage('');
    setSelectedDiagnosisRecord(null);
    setIsDiagnosisOpen(true);
  }, [activeAquarium?.id]);

  const discoveryPool = useMemo(() => {
    return fishData.filter(fish => !isAquaticPlantSpecies(fish) && !isHardscapeSpecies(fish));
  }, []);

  useEffect(() => {
    setDiscoveryState(prev => {
      const output = recommendationService.createDiscoveryDeck({
        speciesPool: discoveryPool,
        wishlistIds: Array.from(wishlistFishIds),
        state: prev,
      });
      saveDiscoveryState(output.state);
      return output.state;
    });
  }, [discoveryPool, wishlistFishIds]);

  const discoveryFish = useMemo(
    () => discoveryPool.find(fish => fish.id === discoveryState.queueIds[0]) || null,
    [discoveryPool, discoveryState.queueIds]
  );
  const nextDiscoveryFish = useMemo(
    () => discoveryPool.find(fish => fish.id === discoveryState.queueIds[1]) || null,
    [discoveryPool, discoveryState.queueIds]
  );
  const discoveryImageSrc = discoveryFish ? getSpeciesDisplayImage(discoveryFish) : '';
  const nextDiscoveryImageSrc = nextDiscoveryFish ? getSpeciesDisplayImage(nextDiscoveryFish) : '';
  const discoveryUsedToday = discoveryState.consumedIds.length;
  const discoveryRemainingToday = Math.max(0, DISCOVERY_DAILY_LIMIT - discoveryUsedToday);
  const isDiscoveryDailyLimitReached = discoveryRemainingToday === 0;
  const discoveryRotation = Math.max(-9, Math.min(9, discoveryDragX / 18));
  const discoveryIntent = discoveryDragX > 44 ? 'interest' : discoveryDragX < -44 ? 'skip' : null;

  useEffect(() => {
    if (!discoveryImageSrc) return;

    setLoadedDiscoveryImageSrc('');
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => setLoadedDiscoveryImageSrc(discoveryImageSrc);
    image.src = discoveryImageSrc;
    if (image.complete) setLoadedDiscoveryImageSrc(discoveryImageSrc);

    discoveryState.queueIds.slice(1, 5).forEach(id => {
      const fish = discoveryPool.find(item => item.id === id);
      if (!fish) return;
      const preload = new Image();
      preload.decoding = 'async';
      preload.src = getSpeciesDisplayImage(fish);
    });
  }, [discoveryImageSrc, discoveryPool, discoveryState.queueIds]);

  const advanceDiscoveryCard = (action: 'skip' | 'interest') => {
    if (!discoveryFish) return;
    const output = recommendationService.advanceDiscoveryDeck({
      speciesId: discoveryFish.id,
      action,
      speciesPool: discoveryPool,
      wishlistIds: Array.from(wishlistFishIds),
      state: discoveryState,
    });

    const addedWishlistId = output.addedWishlistId || (action === 'interest' ? discoveryFish.id : null);
    if (addedWishlistId) {
      const next = new Set(wishlistFishIds);
      next.add(addedWishlistId);
      syncWishlistFishIds(next);
    }

    setDiscoveryMessage(output.message);
    setDiscoveryDragStartX(null);
    setDiscoveryDragX(0);
    saveDiscoveryState(output.state);
    setDiscoveryState(output.state);
  };

  const handleAquariumSpeciesSelect = (fishId: string | null) => {
    setActive3DSpecies(fishId);
    if (!fishId) return;

    const aqFish = activeAquarium.fishes.find(item => item.fishId === fishId);
    const fish = fishData.find(item => item.id === fishId);
    if (!aqFish || !fish) return;

    openAquariumSpeciesDetail(
      fish,
      aqFish,
      isTankPreviewOpen ? 'aquarium-tank-preview' : 'aquarium-tank',
    );
  };

  const handleDiscoveryPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    setDiscoveryDragStartX(event.clientX);
    setDiscoveryMessage('');
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDiscoveryPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (discoveryDragStartX === null) return;
    setDiscoveryDragX(event.clientX - discoveryDragStartX);
  };

  const handleDiscoveryPointerEnd = () => {
    if (discoveryDragX > 90) {
      advanceDiscoveryCard('interest');
    } else if (discoveryDragX < -90) {
      advanceDiscoveryCard('skip');
    } else {
      setDiscoveryDragStartX(null);
      setDiscoveryDragX(0);
    }
  };

  const handleTankCopilotPrimaryAction = () => {
    if (tankCopilotResult?.missingQuestions.length) {
      void handleTankCopilotGenerate(undefined, tankCopilotAnswers);
      return;
    }
    handleTankCopilotNextAction();
  };

  const tankCopilotMissingQuestions = tankCopilotResult?.missingQuestions.slice(0, 3) ?? [];
  const tankCopilotNeedsAnswers = tankCopilotMissingQuestions.length > 0;
  const tankCopilotHasAnswer = tankCopilotMissingQuestions.some(question => (tankCopilotAnswers[question.id] || '').trim().length > 0);
  const tankCopilotStep = !tankCopilotResult ? 1 : tankCopilotNeedsAnswers ? 2 : 3;

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '极易';
      case 'Medium': return '中等';
      case 'Hard': return '困难';
      default: return difficulty;
    }
  };

  if (!activeAquarium) return null;

  const currentFishesDetails = activeAquarium.fishes.map(af => fishData.find(f => f.id === af.fishId)).filter(Boolean) as Fish[];
  const heaterStockedItems = activeAquarium.fishes
    .map(aqFish => ({ aqFish, fish: fishData.find(f => f.id === aqFish.fishId) }))
    .filter((item): item is { aqFish: AquariumFish; fish: Fish } => Boolean(item.fish) && needsHeaterForSpecies(item.fish));
  const heaterSpeciesCount = new Set(heaterStockedItems.map(item => item.fish.id)).size;
  const recommendationItems = recommendationService.recommendForAquarium(activeAquarium, fishData, 10).items;
  const recommendationReasonById = new Map(recommendationItems.map(item => [item.speciesId, item.reason]));
  const recommendations = recommendationItems
    .map(item => fishData.find(fish => fish.id === item.speciesId))
    .filter(Boolean) as Fish[];
  const smartRecommendation: SmartRecommendationOutput = recommendationService.recommendSmartForAquarium({
    aquarium: activeAquarium,
    speciesPool: fishData,
    mode: smartRecommendMode,
    preference: {
      experience: smartPreference.includes('新手') ? 'beginner' : 'intermediate',
      maintenance: smartPreference.includes('低维护') ? 'low' : 'balanced',
      naturalLanguage: smartPreference,
    },
  });
  const smartCandidateScope = smartCandidateScopeIds ? new Set(smartCandidateScopeIds) : null;
  const visibleSmartDirect = smartCandidateScope
    ? smartRecommendation.direct.filter(candidate => smartCandidateScope.has(candidate.speciesId))
    : smartRecommendation.direct;
  const visibleSmartAdjustable = smartCandidateScope
    ? smartRecommendation.adjustable.filter(candidate => smartCandidateScope.has(candidate.speciesId))
    : smartRecommendation.adjustable;
  const visibleSmartBlocked = smartCandidateScope ? [] : smartRecommendation.blocked;
  const tankCopilotLocalCandidatePool = [
    ...smartRecommendation.direct,
    ...smartRecommendation.adjustable,
  ].filter(candidate => candidate.status !== 'blocked');
  const tankCopilotAllowedCandidates = (() => {
    if (!tankCopilotResult || tankCopilotNeedsAnswers) return [];
    const localById = new Map(tankCopilotLocalCandidatePool.map(candidate => [candidate.speciesId, candidate]));
    const matched = new Map<string, RecommendationCandidate>();

    tankCopilotResult.selectedCandidateIds.forEach(speciesId => {
      const localCandidate = localById.get(speciesId);
      if (localCandidate) matched.set(localCandidate.speciesId, localCandidate);
    });

    return Array.from(matched.values());
  })();
  const tankCopilotHiddenCandidateCount = tankCopilotResult && !tankCopilotNeedsAnswers
    ? Math.max(0, tankCopilotResult.selectedCandidateIds.length - tankCopilotAllowedCandidates.length)
    : 0;
  const tankCopilotPrimaryCandidate = tankCopilotAllowedCandidates[0] || null;
  const tankCopilotActionView = (() => {
    const actionType = tankCopilotResult?.recommendedActions[0]?.type;
    if (actionType === 'complete_tank_info') {
      return {
        label: '完善鱼缸信息',
        description: '打开鱼缸设置，并定位到最可能缺失的尺寸、水质或设备区域。',
      };
    }
    if (actionType === 'view_safe_candidates') {
      if (tankCopilotAllowedCandidates.length === 0) {
        return {
          label: '重新描述目标',
          description: '本地规则暂时没有可执行候选。换一个更具体的目标，或先完善鱼缸信息。',
        };
      }
      return {
        label: '查看候选生物',
        description: `打开 ${tankCopilotAllowedCandidates.length} 个本地规则允许的候选，不写入真实鱼缸。`,
      };
    }
    if (actionType === 'start_addition_simulation') {
      if (!tankCopilotPrimaryCandidate) {
        return {
          label: '重新描述目标',
          description: '当前没有可以模拟添加的安全候选。请换一个目标，或先完善鱼缸信息。',
        };
      }
      return {
        label: '进入模拟添加',
        description: `先模拟 ${tankCopilotPrimaryCandidate.name} 的负载和兼容变化，确认后再进入真实添加。`,
      };
    }
    return {
      label: '重新描述目标',
      description: '当前没有明确可执行动作，重新描述目标会生成新的方案。',
    };
  })();
  const tankCopilotPrimaryLabel = !tankCopilotResult
    ? (isTankCopilotLoading ? '生成中...' : '生成建缸方案')
    : tankCopilotNeedsAnswers
      ? (isTankCopilotLoading ? '重新生成中...' : '带着补充信息重新生成')
      : tankCopilotActionView.label;
  const isTankCopilotPrimaryDisabled = isTankCopilotLoading || (tankCopilotNeedsAnswers && !tankCopilotHasAnswer);
  const smartCandidateIds = new Set([
    ...smartRecommendation.direct,
    ...smartRecommendation.adjustable,
  ].map(candidate => candidate.speciesId));
  const wishlistFishes = Array.from(wishlistFishIds)
    .map(id => fishData.find(fish => fish.id === id))
    .filter(Boolean) as Fish[];
  const selectedBuildTemplate = tankBuildTemplates.find(template => template.id === selectedBuildTemplateId) || tankBuildTemplates[0];
  const currentTankVolumeLiters = getTankVolumeLiters(activeAquarium);
  const currentTankLengthCm = parseFloat(activeAquarium.dimensions?.length || '0') || 0;
  const getSpeciesDisplayName = (value: string) => fishData.find(fish => fish.id === value)?.name || value;
  const getRoleLoadBudgetRatio = (role: TankBuildTemplate['speciesRecommendations'][number]['role']) => {
    if (role === 'schooling') return 0.55;
    if (role === 'bottom') return 0.18;
    if (role === 'shrimp') return 0.06;
    if (role === 'snail') return 0.04;
    return 0.22;
  };
  const adaptBuildTemplate = (template: TankBuildTemplate, aquarium: Aquarium): AdaptedBuildPlan => {
    const volumeLiters = getTankVolumeLiters(aquarium);
    const tankLengthCm = parseFloat(aquarium.dimensions?.length || '0') || 0;
    const volumeRatio = template.recommendedVolumeLiters > 0
      ? Math.max(0, Math.min(1, volumeLiters / template.recommendedVolumeLiters))
      : 1;
    const belowMinimum = volumeLiters < template.minVolumeLiters || tankLengthCm < template.minLengthCm || aquarium.waterType !== template.waterType;
    const atRecommended = volumeLiters >= template.recommendedVolumeLiters && tankLengthCm >= template.minLengthCm;
    const status: AdaptedBuildPlan['status'] = belowMinimum ? 'unsuitable' : atRecommended ? 'suitable' : 'caution';
    const safeLoadBudget = Math.max(0, volumeLiters * (status === 'suitable' ? 0.78 : 0.58));
    const existingAnimalLoad = aquarium.fishes.reduce((sum, aqFish) => {
      const fish = fishData.find(item => item.id === aqFish.fishId);
      if (!fish) return sum;
      const lifeType = getLifeType(fish);
      if (lifeType === 'plant' || lifeType === 'hardscape') return sum;
      return sum + getBioLoadLiters(fish) * Math.max(1, aqFish.quantity || 1);
    }, 0);
    let remainingBudget = Math.max(0, safeLoadBudget - existingAnimalLoad);
    let usedPrimarySchool = false;

    const appliedSpecies = template.speciesRecommendations
      .map(rec => {
        const fish = findStockSpeciesByName(rec.name);
        if (!fish || status === 'unsuitable') return null;
        if (rec.role === 'schooling' && usedPrimarySchool && status === 'caution') return null;
        const perAnimalLoad = Math.max(0.5, getBioLoadLiters(fish));
        const roleBudget = Math.max(0, safeLoadBudget * getRoleLoadBudgetRatio(rec.role));
        const scaledTarget = status === 'suitable'
          ? rec.recommendedQuantity
          : Math.max(rec.minQuantity, Math.floor(rec.recommendedQuantity * Math.max(0.45, volumeRatio)));
        const budgetCap = Math.floor(Math.min(roleBudget, remainingBudget) / perAnimalLoad);
        let quantity = Math.min(rec.recommendedQuantity, scaledTarget, budgetCap);
        if (rec.role === 'schooling') {
          if (quantity < rec.minQuantity) return null;
          usedPrimarySchool = true;
        } else if (quantity < Math.max(1, rec.minQuantity)) {
          return null;
        }
        if (rec.role === 'snail') quantity = Math.min(quantity, volumeLiters >= 60 ? 2 : 1);
        remainingBudget -= quantity * perAnimalLoad;
        return { name: rec.name, quantity, role: rec.role, fish };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item && item.quantity > 0));

    const riskItems: string[] = [];
    if (belowMinimum) {
      riskItems.push(`当前约 ${volumeLiters}L / ${tankLengthCm || '未设置'}cm，低于 ${template.name} 的最低要求 ${template.minVolumeLiters}L / ${template.minLengthCm}cm。`);
    }
    if (existingAnimalLoad > safeLoadBudget * 0.8) {
      riskItems.push('当前已有动物负载偏高，应用方案时不建议继续加入完整生物组合。');
    }
    if (status !== 'unsuitable' && appliedSpecies.length === 0 && template.speciesRecommendations.length > 0) {
      riskItems.push('当前鱼缸剩余承载空间不足，方案只建议应用环境配置，暂不新增生物。');
    }

    const school = appliedSpecies.find(item => item.role === 'schooling');
    const omittedSecondSchool = template.speciesRecommendations.filter(item => item.role === 'schooling').length > 1 && status === 'caution';
    const autoFixes = [
      status === 'caution' && school ? `已根据你的 ${volumeLiters}L 鱼缸调整：建议 ${school.name} ${school.quantity} 条。` : '',
      omittedSecondSchool ? '不建议同时加入第二种群游鱼，避免满配多个鱼群。' : '',
      existingAnimalLoad > 0 ? '已预留当前已有生物的承载空间。' : '',
    ].filter(Boolean);
    const statusLabel = status === 'suitable' ? '适合当前鱼缸' : status === 'caution' ? '可用，已缩减生物' : '不适合当前鱼缸';
    const ctaLabel = status === 'suitable'
      ? '应用到当前鱼缸'
      : status === 'caution'
        ? '应用调整后的安全方案'
        : '当前鱼缸偏小';

    return {
      template,
      status,
      statusLabel,
      statusTone: status === 'suitable' ? 'bg-emerald-100 text-emerald-700' : status === 'caution' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600',
      currentVolumeLiters: volumeLiters,
      currentLengthCm: tankLengthCm,
      volumeRatio,
      summary: status === 'unsuitable'
        ? `当前鱼缸低于最低要求，建议更换更大鱼缸或选择更小方案。`
        : autoFixes.join(' ') || `当前鱼缸可承接该方案，按 ${volumeLiters}L 水体生成安全组合。`,
      coreConfigSummary: `${template.baseSubstrate} · ${template.baseEquipment.slice(0, 2).join(' · ')}`,
      livestockSummary: appliedSpecies.length > 0 ? appliedSpecies.map(item => `${item.name} ${item.quantity}`).join(' · ') : '仅应用环境配置，暂不新增生物',
      appliedSpecies,
      riskItems,
      autoFixes,
      canApply: status !== 'unsuitable',
      ctaLabel,
    };
  };
  const adaptedBuildPlans = tankBuildTemplates.map(template => adaptBuildTemplate(template, activeAquarium));
  const selectedAdaptedBuildPlan = adaptedBuildPlans.find(plan => plan.template.id === selectedBuildTemplate.id) || adaptedBuildPlans[0];
  const getTemplateEnvironmentSummary = (template: TankBuildTemplate) => {
    const heatText = template.equipmentSettings.heater ? '稳定加热' : '室温可养';
    return `${template.waterType === 'Saltwater' ? '海水' : '淡水'} · ${template.temperatureRange[0]}-${template.temperatureRange[1]}°C · ${heatText}`;
  };
  const getTemplateLayoutSummary = (template: TankBuildTemplate) => {
    const plantNames = template.plants.map(getSpeciesDisplayName).slice(0, 2).join('、') || '少量水草';
    const hardscapeNames = template.hardscape.map(getSpeciesDisplayName).slice(0, 2).join('、') || '自然造景';
    return `${template.substrate} · ${hardscapeNames} · ${plantNames}`;
  };
  const getTemplateLivestockSummary = (template: TankBuildTemplate) => (
    template.livestock.slice(0, 3).join(' · ') || '按方案选择生物'
  );
  const getTemplateEquipmentSummary = (template: TankBuildTemplate) => {
    const equipment = [
      template.equipmentSettings.filter,
      template.equipmentSettings.light,
      template.equipmentSettings.heater ? '加热棒' : null,
      template.equipmentSettings.oxygen ? '氧气/气泡石' : null,
    ].filter(Boolean);
    return equipment.join(' · ') || template.equipment.slice(0, 2).join(' · ');
  };
  const getTemplateVisualImages = (template: TankBuildTemplate) => [
    ...template.hardscape,
    ...template.plants,
    ...(template.stockedSpecies.map(item => findStockSpeciesByName(item.name)?.id).filter(Boolean) as string[]),
  ]
    .map(value => fishData.find(fish => fish.id === value || fish.name === value)?.image)
    .filter(Boolean) as string[];

  // Search logic for Add Fish
  const searchResults = fishSearchTerm.trim() 
    ? fishData
      .filter(f => !isAquaticPlantSpecies(f) && !isHardscapeSpecies(f))
      .filter(f => f.name.toLowerCase().includes(fishSearchTerm.toLowerCase()) || f.scientificName.toLowerCase().includes(fishSearchTerm.toLowerCase()))
      .slice(0, 8)
    : [];

  const recommendedFishes = recommendations.slice(0, 6);
  const addFishList = fishSearchTerm.trim() ? searchResults : recommendedFishes;
  const selectedAddFishDetails = selectedAddFishItems
    .map(item => {
      const fish = fishData.find(candidate => candidate.id === item.fishId);
      return fish ? { ...item, fish } : null;
    })
    .filter((item): item is { fishId: string; quantity: number; entryDate: string; fish: Fish } => Boolean(item));
  const selectedAddSpeciesCount = selectedAddFishDetails.length;
  const selectedAddTotalQuantity = selectedAddFishItems.reduce((sum, item) => sum + Math.max(1, item.quantity || 1), 0);
  const todayAddFishDate = format(new Date(), 'yyyy-MM-dd');
  const formatAddFishDateLabel = (dateValue: string) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '今天';
    const formatted = format(date, 'yyyy/MM/dd');
    return dateValue === todayAddFishDate ? `今天 · ${formatted}` : formatted;
  };
  const updateSelectedAddFishItem = (fishId: string, patch: Partial<{ quantity: number; entryDate: string }>) => {
    setAddFishCompatibilityReview(null);
    setSelectedAddFishItems(prev => prev.map(item => (
      item.fishId === fishId
        ? { ...item, ...patch, quantity: Math.max(1, patch.quantity ?? item.quantity) }
        : item
    )));
  };
  const toggleSelectedAddFish = (fish: Fish) => {
    setAddFishSuccess(null);
    setAddFishDatePicker(null);
    setAddFishCompatibilityReview(null);
    setSelectedAddFishItems(prev => {
      if (prev.some(item => item.fishId === fish.id)) {
        return prev.filter(item => item.fishId !== fish.id);
      }
      return [...prev, { fishId: fish.id, quantity: 1, entryDate: format(new Date(), 'yyyy-MM-dd') }];
    });
  };
  const handleReAddDeceasedFish = (fish: Fish) => {
    setAddFishSuccess(null);
    setAddFishDatePicker(null);
    setAddFishCompatibilityReview(null);
    setFishSearchTerm('');
    setSelectedAddFishItems([{ fishId: fish.id, quantity: 1, entryDate: format(new Date(), 'yyyy-MM-dd') }]);
    setIsAddFishOpen(true);
  };
  const addFishIntro = activeAquarium.fishes.length === 0
    ? '当前为空缸，建议先选择新手友好、适合建立生态的起步生物。'
    : '根据当前鱼缸状态，优先推荐新手友好、适合后续搭配的生物。';
  const getAddFishTags = (fish: Fish) => {
    const tags: string[] = [];
    if (fish.difficulty === 'Easy') tags.push('新手友好');
    if (fish.size === 'Small') tags.push('小型温和');
    if (fish.housingMode === '适合混养') tags.push('后续好搭配');
    const toolTags = getToolFunctions(fish);
    tags.push(...toolTags.slice(0, 2));
    if (tags.length === 0) tags.push(fish.category);
    return Array.from(new Set(tags)).slice(0, 3);
  };
  const getAddFishReason = (fish: Fish) => {
    const recommendationReason = recommendationReasonById.get(fish.id);
    if (recommendationReason) return recommendationReason;
    if (fish.size === 'Small' && fish.housingMode === '适合混养') return '适合作为起步搭配生物，建议先少量加入观察状态。';
    if (getLifeType(fish) === 'invertebrate') return '适合作为清洁或观察生物，但仍需要稳定水质。';
    return '建议先少量加入，观察 3-7 天后再决定是否补充数量。';
  };
  const recommendationNames = currentFishesDetails.slice(0, 2).map(fish => fish.name).join('、');
  const singleOnlyFishes = currentFishesDetails.filter(fish => fish.housingMode === '建议单养' || getLifeType(fish) === 'reptile');
  const tankVolumeLiters = getTankVolumeLiters(activeAquarium);
  const currentBioLoadLiters = activeAquarium.fishes.reduce((sum, aqFish) => {
    const fish = fishData.find(item => item.id === aqFish.fishId);
    return sum + (fish ? getBioLoadLiters(fish) * Math.max(1, aqFish.quantity || 1) : 0);
  }, 0);
  const selectedPlantCount = settingsForm.plants?.length || 0;
  const settingsGrossVolumeLiters = getTankGrossVolumeLiters(settingsForm.dimensions);
  const settingsEstimatedWaterLiters = getEstimatedWaterVolumeLiters(settingsForm.dimensions);
  const settingsWaterType = settingsForm.waterType || 'Freshwater';
  const availablePlantOptions = settingsWaterType === 'Freshwater'
    ? plantOptions.filter(item => isSpeciesCompatibleWithWaterType(item, 'Freshwater'))
    : plantOptions;
  const availableHardscapeOptions = settingsWaterType === 'Freshwater'
    ? hardscapeOptions.filter(item => isSpeciesCompatibleWithWaterType(item, 'Freshwater'))
    : hardscapeOptions;
  const availableSubstrateOptions = settingsWaterType === 'Freshwater'
    ? substrateOptions.filter(option => option.value !== '珊瑚砂')
    : substrateOptions;
  const updateSettingsWaterType = (waterType: NonNullable<Aquarium['waterType']>) => {
    const keepFreshwaterOnly = waterType === 'Freshwater';
    setSettingsForm({
      ...settingsForm,
      waterType,
      substrate: keepFreshwaterOnly && settingsForm.substrate === '珊瑚砂' ? '无' : settingsForm.substrate,
      plants: keepFreshwaterOnly
        ? (settingsForm.plants || []).filter(value => {
            const species = fishData.find(item => item.id === value || item.name === value);
            return !species || isSpeciesCompatibleWithWaterType(species, 'Freshwater');
          })
        : settingsForm.plants,
      hardscape: keepFreshwaterOnly
        ? (settingsForm.hardscape || []).filter(value => {
            const species = fishData.find(item => item.id === value || item.name === value);
            return !species || isSpeciesCompatibleWithWaterType(species, 'Freshwater');
          })
        : settingsForm.hardscape,
    });
  };
  const visiblePlantOptions = isPlantListExpanded ? availablePlantOptions : availablePlantOptions.slice(0, 4);
  const hiddenPlantCount = Math.max(availablePlantOptions.length - visiblePlantOptions.length, 0);
  const selectedHardscapeCount = settingsForm.hardscape?.length || 0;
  const currentSubstrate = settingsForm.substrate || '无';
  const scapeOptions = [
    ...availableSubstrateOptions.map(option => ({
      type: 'substrate' as const,
      id: `substrate-${option.value}`,
      value: option.value,
      label: option.label,
      hint: option.hint,
    })),
    ...availableHardscapeOptions.map(item => ({
      type: 'hardscape' as const,
      id: `hardscape-${item.id}`,
      value: item.id,
      label: item.name,
      hint: item.scientificName,
      image: item.image,
    })),
  ];
  const selectedScapeCount = (currentSubstrate !== '无' ? 1 : 0) + selectedHardscapeCount;
  const sortedScapeOptions = [...scapeOptions].sort((a, b) => {
    const aSelected = a.type === 'substrate'
      ? a.value === currentSubstrate
      : (settingsForm.hardscape || []).includes(a.value);
    const bSelected = b.type === 'substrate'
      ? b.value === currentSubstrate
      : (settingsForm.hardscape || []).includes(b.value);
    return Number(bSelected) - Number(aSelected);
  });
  const visibleScapeOptions = isScapeListExpanded ? sortedScapeOptions : sortedScapeOptions.slice(0, 4);
  const hiddenScapeCount = Math.max(sortedScapeOptions.length - visibleScapeOptions.length, 0);
  const selectedPlantNames = (settingsForm.plants || [])
    .map(value => fishData.find(item => item.id === value || item.name === value)?.name || value)
    .slice(0, 3);
  const selectedHardscapeNames = (settingsForm.hardscape || [])
    .map(value => fishData.find(item => item.id === value || item.name === value)?.name || value)
    .slice(0, 3);
  const configuredSettingCount = [
    settingsForm.waterType,
    settingsForm.targetTemperature,
    settingsEstimatedWaterLiters > 0,
    currentSubstrate !== '无',
    selectedPlantCount > 0,
    selectedHardscapeCount > 0,
    settingsForm.equipment?.filter,
    settingsForm.equipment?.light,
    settingsForm.equipment?.heater,
    settingsForm.equipment?.oxygen,
  ].filter(Boolean).length;
  const settingItems: Array<{
    id: NonNullable<typeof activeSettingsPanel>;
    title: string;
    summary: string;
    configured: boolean;
  }> = [
    {
      id: 'size',
      title: '尺寸',
      summary: settingsEstimatedWaterLiters > 0
        ? `${settingsForm.dimensions?.length || '--'}x${settingsForm.dimensions?.width || '--'}x${settingsForm.dimensions?.height || '--'}cm · 约 ${settingsEstimatedWaterLiters}L`
        : '长宽高未完整填写',
      configured: Boolean(settingsForm.dimensions?.length && settingsForm.dimensions?.width && settingsForm.dimensions?.height),
    },
    {
      id: 'parameters',
      title: '参数',
      summary: `${settingsForm.waterType === 'Saltwater' ? '海水' : '淡水'} · ${settingsForm.targetTemperature || '--'}°C`,
      configured: Boolean(settingsForm.waterType && settingsForm.targetTemperature),
    },
    {
      id: 'substrate',
      title: '底砂',
      summary: currentSubstrate !== '无' || selectedHardscapeNames.length > 0
        ? [currentSubstrate !== '无' ? currentSubstrate : null, ...selectedHardscapeNames].filter(Boolean).join('、')
        : '未选择底砂或造景',
      configured: currentSubstrate !== '无' || selectedHardscapeCount > 0,
    },
    {
      id: 'plants',
      title: '水草',
      summary: selectedPlantNames.length > 0 ? selectedPlantNames.join('、') : '未选择水草',
      configured: selectedPlantCount > 0,
    },
    {
      id: 'lighting',
      title: '灯光',
      summary: settingsForm.equipment?.light && settingsForm.equipment.light !== '无' ? settingsForm.equipment.light : '未选择灯光',
      configured: Boolean(settingsForm.equipment?.light && settingsForm.equipment.light !== '无'),
    },
    {
      id: 'equipment',
      title: '设备',
      summary: [
        settingsForm.equipment?.filter && settingsForm.equipment.filter !== '无' ? settingsForm.equipment.filter : null,
        settingsForm.equipment?.heater ? '加热棒' : null,
        settingsForm.equipment?.oxygen ? '氧气/气泡石' : null,
      ].filter(Boolean).join('、') || '未选择过滤或辅助设备',
      configured: Boolean(
        (settingsForm.equipment?.filter && settingsForm.equipment.filter !== '无')
        || settingsForm.equipment?.heater
        || settingsForm.equipment?.oxygen
      ),
    },
  ];
  const renderSettingsPanel = (panel: NonNullable<typeof activeSettingsPanel>) => {
    if (panel === 'size') {
      return (
        <ConfigSection title="尺寸" subtitle="用于估算容量和后续养护建议。">
          <div className="grid grid-cols-3 gap-2">
            {dimensionFields.map(item => (
              <div key={item.key} className="grid gap-1.5">
                <Label className="text-[11px] font-bold text-ink/55">{item.label} (cm)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={(settingsForm.dimensions as any)?.[item.key] || ''}
                  onChange={e => setSettingsForm({
                    ...settingsForm,
                    dimensions: {
                      length: settingsForm.dimensions?.length || '',
                      width: settingsForm.dimensions?.width || '',
                      height: settingsForm.dimensions?.height || '',
                      [item.key]: e.target.value,
                    }
                  })}
                  className="h-10 rounded-[12px] bg-bg text-sm font-bold md:w-[220px]"
                />
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-[14px] bg-emerald-50/70 p-3">
            <div>
              <div className="text-[10px] font-black text-ink/45">理论容量</div>
              <div className="mt-1 text-2xl font-black text-ink">{settingsGrossVolumeLiters > 0 ? `${settingsGrossVolumeLiters}L` : '--'}</div>
            </div>
            <div>
              <div className="text-[10px] font-black text-ink/45">估算实际水量</div>
              <div className="mt-1 text-2xl font-black text-emerald-700">{settingsEstimatedWaterLiters > 0 ? `${settingsEstimatedWaterLiters}L` : '--'}</div>
            </div>
          </div>
        </ConfigSection>
      );
    }

    if (panel === 'parameters') {
      return (
        <ConfigSection title="参数" subtitle="新手优先保持稳定，不要频繁大幅调整。">
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'Freshwater', label: '淡水', description: '常见观赏鱼' },
              { value: 'Saltwater', label: '海水', description: '海水生物' },
              { value: 'Brackish', label: '汽水', description: '暂未支持', disabled: true },
            ].map(option => (
              <SelectableOptionCard
                key={option.value}
                label={option.label}
                description={option.description}
                selected={settingsForm.waterType === option.value}
                disabled={option.disabled}
                onClick={() => updateSettingsWaterType(option.value as NonNullable<Aquarium['waterType']>)}
              />
            ))}
          </div>
          <div className="mt-3 grid gap-1.5">
            <Label className="text-[11px] font-bold text-ink/55">目标温度 (°C)</Label>
            <Input
              type="number"
              value={settingsForm.targetTemperature || ''}
              onChange={e => setSettingsForm({ ...settingsForm, targetTemperature: e.target.value })}
              className="h-10 rounded-[12px] bg-bg text-sm font-bold md:w-[220px]"
            />
          </div>
        </ConfigSection>
      );
    }

    if (panel === 'substrate') {
      return (
        <ConfigSection
          title="底砂 / 造景"
          subtitle="底砂单选，硬景可多选。"
          actionText={isScapeListExpanded ? '收起' : '查看全部'}
          onAction={() => setIsScapeListExpanded(prev => !prev)}
        >
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {visibleScapeOptions.map(option => {
              const currentHardscape = settingsForm.hardscape || [];
              const isSelected = option.type === 'substrate'
                ? option.value === currentSubstrate
                : currentHardscape.includes(option.value);
              return (
                <SelectableOptionCard
                  key={option.id}
                  label={option.label}
                  description={option.type === 'substrate' ? `底砂 · ${option.hint}` : `硬景 · ${option.hint}`}
                  selected={isSelected}
                  mode={option.type === 'substrate' ? 'single' : 'multi'}
                  visual={option.type === 'hardscape' ? (
                    <img src={option.image} alt={option.label} className="h-full w-full object-contain p-0.5" referrerPolicy="no-referrer" />
                  ) : (
                    <span className={`h-6 w-6 rounded-full border ${
                      option.value === '无' ? 'border-dashed border-ink/30 bg-white' :
                      option.value === '水草泥' || option.value === '黑金沙' ? 'border-stone-700 bg-stone-800' :
                      option.value === '溪流砂' || option.value === '碎石' || option.value === '鹅卵石' ? 'border-stone-400 bg-stone-300' :
                      option.value === '珊瑚砂' || option.value === '化妆砂' ? 'border-amber-100 bg-amber-50' :
                      option.value === '陶粒' ? 'border-orange-600 bg-orange-500' :
                      'border-amber-300 bg-amber-200'
                    }`} />
                  )}
                  onClick={() => {
                    if (option.type === 'substrate') {
                      setSettingsForm({ ...settingsForm, substrate: option.value });
                      return;
                    }
                    setSettingsForm({
                      ...settingsForm,
                      hardscape: isSelected
                        ? currentHardscape.filter(value => value !== option.value)
                        : [...currentHardscape, option.value]
                    });
                  }}
                />
              );
            })}
          </div>
        </ConfigSection>
      );
    }

    if (panel === 'plants') {
      return (
        <ConfigSection
          title="水草"
          subtitle="选择当前鱼缸里的水草种类。"
          actionText={isPlantListExpanded ? '收起' : '查看全部'}
          onAction={() => setIsPlantListExpanded(prev => !prev)}
        >
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {visiblePlantOptions.map(plant => {
              const current = settingsForm.plants || [];
              const isSelected = current.includes(plant.id) || current.includes(plant.name);
              return (
                <SelectableOptionCard
                  key={plant.id}
                  label={plant.name}
                  description={plant.scientificName}
                  selected={isSelected}
                  mode="multi"
                  visual={<img src={plant.image} alt={plant.name} className="h-full w-full object-contain p-0.5" referrerPolicy="no-referrer" />}
                  onClick={() => {
                    setSettingsForm({
                      ...settingsForm,
                      plants: isSelected
                        ? current.filter(p => p !== plant.id && p !== plant.name)
                        : [...current, plant.id]
                    });
                  }}
                />
              );
            })}
          </div>
        </ConfigSection>
      );
    }

    if (panel === 'lighting') {
      return (
        <ConfigSection title="灯光" subtitle="选择草缸和观赏所需灯光。">
          <div className="grid grid-cols-2 gap-2">
            {['无', '普通灯', '水草灯', '海水灯'].map(option => (
              <SelectableOptionCard
                key={option}
                label={option}
                selected={(settingsForm.equipment?.light || '普通灯') === option}
                onClick={() => setSettingsForm({
                  ...settingsForm,
                  equipment: { ...(settingsForm.equipment || {}), light: option as any }
                })}
              />
            ))}
          </div>
        </ConfigSection>
      );
    }

    return (
      <ConfigSection title="设备" subtitle="过滤单选，加热与氧气按需开启。">
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            {['无', '瀑布过滤', '桶滤', '上滤', '海绵过滤'].map(option => (
              <SelectableOptionCard
                key={option}
                label={option}
                selected={(settingsForm.equipment?.filter || '瀑布过滤') === option}
                onClick={() => setSettingsForm({
                  ...settingsForm,
                  equipment: { ...(settingsForm.equipment || {}), filter: option as any }
                })}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'heater', label: '加热棒', description: '低温或热带鱼建议开启' },
              { key: 'oxygen', label: '氧气 / 气泡石', description: '高密度或虾缸可开启' },
            ].map(device => {
              const isSelected = Boolean((settingsForm.equipment as any)?.[device.key]);
              return (
                <SelectableOptionCard
                  key={device.key}
                  label={device.label}
                  description={device.description}
                  selected={isSelected}
                  mode="multi"
                  onClick={() => setSettingsForm({
                    ...settingsForm,
                    equipment: {
                      ...(settingsForm.equipment || {}),
                      [device.key]: !isSelected
                    }
                  })}
                />
              );
            })}
          </div>
        </div>
      </ConfigSection>
    );
  };
  const recommendationHint = singleOnlyFishes.length > 0
    ? `缸内有${singleOnlyFishes.slice(0, 2).map(fish => fish.name).join('、')}这类更适合单养的生物，以下只作为同水体低风险参考。`
    : tankVolumeLiters > 0 && currentBioLoadLiters >= tankVolumeLiters * 0.9
      ? `当前鱼缸约 ${tankVolumeLiters}L，负载偏高，以下仅展示较低风险候选，添加前建议先减密度或升级鱼缸。`
      : currentFishesDetails.length > 0
        ? `已根据缸内${recommendationNames}${currentFishesDetails.length > 2 ? '等生物' : ''}的水温、pH、体型、性格和鱼缸容量筛选。`
        : '当前为空缸，优先推荐新手友好、后续好混养的起步生物。';
  const noRecommendationHint = singleOnlyFishes.length > 0
    ? `${singleOnlyFishes.slice(0, 2).map(fish => fish.name).join('、')}更适合单独饲养，当前不建议继续新增混养生物。`
    : tankVolumeLiters > 0 && currentBioLoadLiters >= tankVolumeLiters * 0.9
      ? `当前鱼缸约 ${tankVolumeLiters}L，生物负载已经偏高，先不要继续加鱼会更安全。`
      : '当前鱼缸的水质区间或体型性格组合比较敏感，暂时没有足够安全的新增候选。';
  const archiveOwnedById = new Map<string, {
    fish: Fish;
    quantity: number;
    acquiredDate: string;
    source: 'stocked' | 'plant' | 'hardscape' | 'substrate';
  }>();

  activeAquarium.fishes.forEach(aqFish => {
    const fish = fishData.find(item => item.id === aqFish.fishId);
    if (!fish) return;
    const existing = archiveOwnedById.get(fish.id);
    archiveOwnedById.set(fish.id, {
      fish,
      quantity: (existing?.quantity || 0) + Math.max(1, aqFish.quantity || 1),
      acquiredDate: existing?.acquiredDate || aqFish.entryDate,
      source: 'stocked',
    });
  });

  (activeAquarium.plants || []).forEach(value => {
    const plant = fishData.find(item => (item.id === value || item.name === value) && isAquaticPlantSpecies(item));
    if (!plant || archiveOwnedById.has(plant.id)) return;
    archiveOwnedById.set(plant.id, {
      fish: plant,
      quantity: 1,
      acquiredDate: activeAquarium.lastWaterChangeDate || new Date().toISOString(),
      source: 'plant',
    });
  });

  const substrateSpecies = getSubstrateArchiveSpecies(activeAquarium.substrate);
  if (substrateSpecies && !archiveOwnedById.has(substrateSpecies.id)) {
    archiveOwnedById.set(substrateSpecies.id, {
      fish: substrateSpecies,
      quantity: 1,
      acquiredDate: activeAquarium.lastWaterChangeDate || new Date().toISOString(),
      source: 'substrate',
    });
  }

  (activeAquarium.hardscape || []).forEach(value => {
    const hardscape = fishData.find(item => (item.id === value || item.name === value) && isHardscapeSpecies(item));
    if (!hardscape || archiveOwnedById.has(hardscape.id)) return;
    archiveOwnedById.set(hardscape.id, {
      fish: hardscape,
      quantity: 1,
      acquiredDate: activeAquarium.lastWaterChangeDate || new Date().toISOString(),
      source: 'hardscape',
    });
  });

  const archiveCandidatePool = fishData
    .filter(fish => !archiveOwnedById.has(fish.id))
    .filter(fish => {
      if (activeAquarium.waterType === 'Saltwater') return fish.category === '海水鱼';
      return fish.category !== '海水鱼' && getLifeType(fish) !== 'coral';
    })
    .filter(fish => (
      !isHardscapeSpecies(fish)
      || ['青龙石', '沉木', '杜鹃根', 'ADA风格化妆砂', '火山石板', '水草泥', '溪流砂'].some(name => fish.name.includes(name))
    ));
  const archiveFishCandidates = archiveCandidatePool
    .filter(fish => !isAquaticPlantSpecies(fish) && !isHardscapeSpecies(fish))
    .slice(0, 24);
  const archivePlantCandidates = archiveCandidatePool
    .filter(isAquaticPlantSpecies)
    .slice(0, 18);
  const archiveScapeCandidates = archiveCandidatePool
    .filter(isHardscapeSpecies)
    .slice(0, 14);
  const lockedArchiveItems = Array.from(new Map([
    ...archiveFishCandidates,
    ...archivePlantCandidates,
    ...archiveScapeCandidates,
  ].map(fish => [fish.id, fish])).values())
    .map(fish => ({ fish, quantity: 0, acquiredDate: '', source: 'stocked' as const, locked: true }));
  const tankArchiveItems = [
    ...Array.from(archiveOwnedById.values()).map(item => ({ ...item, locked: false })),
    ...lockedArchiveItems,
  ];
  const archiveCategories = ['全部', '鱼类', '虾螺', '水草', '底砂', '造景'];
  const primaryArchiveCategories = ['全部', '鱼类', '虾螺', '水草'];
  const activeConfiguredSettingCount = [
    activeAquarium.dimensions?.length && activeAquarium.dimensions?.width && activeAquarium.dimensions?.height,
    activeAquarium.waterType,
    activeAquarium.targetTemperature,
    activeAquarium.substrate,
    (activeAquarium.plants || []).length > 0,
    (activeAquarium.hardscape || []).length > 0,
    activeAquarium.equipment?.filter,
    activeAquarium.equipment?.light,
    typeof activeAquarium.equipment?.heater === 'boolean',
    typeof activeAquarium.equipment?.oxygen === 'boolean',
  ].filter(Boolean).length;
  type TankConfiguredContentItem = {
    id: string;
    fish: Fish | null;
    name: string;
    category: string;
    quantity: number;
    acquiredDate: string;
    source: 'stocked' | 'plant' | 'hardscape' | 'substrate' | 'equipment';
    description: string;
  };
  const tankConfiguredContentItems: TankConfiguredContentItem[] = Array.from(archiveOwnedById.values()).map(item => ({
    id: `${item.source}-${item.fish.id}`,
    fish: item.fish,
    name: item.fish.name,
    category: getArchiveCategory(item.fish),
    quantity: item.quantity,
    acquiredDate: item.acquiredDate,
    source: item.source,
    description: item.source === 'stocked'
      ? `数量 ${item.quantity}`
      : item.source === 'plant'
        ? '已配置水草'
        : item.source === 'substrate'
          ? '当前底砂'
          : '已配置造景',
  }));
  if (activeAquarium.substrate && activeAquarium.substrate !== '无' && !tankConfiguredContentItems.some(item => item.category === '底砂')) {
    const substrateMeta = substrateOptions.find(item => item.value === activeAquarium.substrate);
    tankConfiguredContentItems.push({
      id: `substrate-${activeAquarium.substrate}`,
      fish: null,
      name: substrateMeta?.label || activeAquarium.substrate,
      category: '底砂',
      quantity: 1,
      acquiredDate: activeAquarium.lastWaterChangeDate || new Date().toISOString(),
      source: 'substrate',
      description: substrateMeta?.hint ? `当前底砂 · ${substrateMeta.hint}` : '当前底砂配置',
    });
  }
  const equipmentSummaryItems = [
    activeAquarium.equipment?.filter && `过滤：${activeAquarium.equipment.filter}`,
    activeAquarium.equipment?.light && `灯光：${activeAquarium.equipment.light}`,
    typeof activeAquarium.equipment?.heater === 'boolean' && (activeAquarium.equipment.heater ? '加热棒：已开启' : '加热棒：未开启'),
    typeof activeAquarium.equipment?.oxygen === 'boolean' && (activeAquarium.equipment.oxygen ? '氧气：已开启' : '氧气：未开启'),
  ].filter(Boolean) as string[];
  if (equipmentSummaryItems.length > 0) {
    tankConfiguredContentItems.push({
      id: 'equipment-summary',
      fish: null,
      name: '设备配置',
      category: '设备',
      quantity: equipmentSummaryItems.length,
      acquiredDate: activeAquarium.lastWaterChangeDate || new Date().toISOString(),
      source: 'equipment',
      description: equipmentSummaryItems.slice(0, 2).join(' · '),
    });
  }
  const filteredTankContentItems = tankConfiguredContentItems;
  const formatTankContentDate = (dateValue: string) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '时间未知';
    return format(date, 'yyyy/MM/dd');
  };
  const ownedArchivePreviewItems = tankConfiguredContentItems
    .filter(item => item.fish)
    .slice(0, 4);
  const tankContentCount = tankConfiguredContentItems.length;
  const hasAnyTankContent = tankContentCount > 0;
  const hasEnvironmentContent = tankConfiguredContentItems.some(item => ['水草', '底砂', '造景', '设备'].includes(item.category));
  const emptyMessageByCategory: Record<string, string> = {
    全部: '当前还没有配置鱼缸内容，可以先完善配置或套用搭建方案。',
    鱼类: '暂无鱼类。',
    虾螺: '暂无虾螺蟹。',
    水草: '暂无水草配置。',
    底砂: '暂无底砂配置。',
    造景: '暂无造景配置。',
  };
  const deceasedArchiveItems = deceasedRecords
    .map(record => {
      const fish = fishData.find(item => item.id === record.fishId);
      return fish ? { record, fish } : null;
    })
    .filter((item): item is { record: DeceasedRecord; fish: Fish } => Boolean(item))
    .sort((a, b) => new Date(b.record.date).getTime() - new Date(a.record.date).getTime());

  // Water change calculation
  const shortestCycle = currentFishesDetails.length > 0 ? Math.min(...currentFishesDetails.map(f => f.waterChangeCycle)) : 7;
  const lastChangeDate = new Date(activeAquarium.lastWaterChangeDate || new Date());
  const nextChangeDate = addDays(lastChangeDate, shortestCycle);
  const daysUntilChange = differenceInDays(nextChangeDate, new Date());
  const isChangeOverdue = daysUntilChange < 0;

  const calculateHealthScore = () => {
    if (!activeAquarium) return 100;
    let score = 100;
    
    // Deduct for overdue water change
    if (isChangeOverdue) {
      score -= Math.min(Math.abs(daysUntilChange) * 5, 30); // up to 30 points
    }

    // Deduct for conflicts
    if (conflicts.length > 0) {
      score -= conflicts.length * 15;
    }

    // Deduct for temperature mismatch (simplified)
    if (activeAquarium.targetTemperature) {
      const temp = parseInt(activeAquarium.targetTemperature);
      if (temp < 20 || temp > 30) {
        score -= 10;
      }
    }

    return Math.max(0, score);
  };

  const healthScore = calculateHealthScore();
  const waterChangedToday = (activeAquarium.waterChangeHistory || []).includes(format(new Date(), 'yyyy-MM-dd'));
  const waterChangeHistory = activeAquarium.waterChangeHistory || [];
  const latestWaterChangeDate = waterChangeHistory.length > 0
    ? waterChangeHistory[waterChangeHistory.length - 1]
    : activeAquarium.lastWaterChangeDate
      ? format(new Date(activeAquarium.lastWaterChangeDate), 'yyyy-MM-dd')
      : '';
  const nextSuggestedWaterChangeDate = latestWaterChangeDate
    ? format(addDays(new Date(latestWaterChangeDate), shortestCycle), 'yyyy/MM/dd')
    : '暂无';
  const selectedWaterDateHasRecord = waterChangeHistory.includes(selectedWaterChangeDate);
  const totalStockedQuantity = activeAquarium.fishes.reduce((sum, fish) => sum + Math.max(1, fish.quantity || 1), 0);
  const hasStockedAnimals = totalStockedQuantity > 0;
  const hasDimensionConfig = Boolean(
    activeAquarium.dimensions?.length
    && activeAquarium.dimensions?.width
    && activeAquarium.dimensions?.height
  );
  const hasWaterConfig = Boolean(activeAquarium.waterType && activeAquarium.targetTemperature);
  const hasEquipmentConfig = Boolean(
    activeAquarium.equipment?.filter
    || activeAquarium.equipment?.light
    || typeof activeAquarium.equipment?.heater === 'boolean'
    || typeof activeAquarium.equipment?.oxygen === 'boolean'
  );
  const isBasicConfigComplete = hasDimensionConfig && hasWaterConfig && hasEquipmentConfig;
  const hasAppliedBuildPlan = Boolean(
    activeAquarium.substrate
    || (activeAquarium.plants?.length || 0) > 0
    || (activeAquarium.hardscape?.length || 0) > 0
  );
  const configSummaryText = isBasicConfigComplete
    ? `${activeAquarium.dimensions?.length}x${activeAquarium.dimensions?.width}x${activeAquarium.dimensions?.height}cm · ${activeAquarium.waterType === 'Saltwater' ? '海水' : '淡水'} · ${activeAquarium.targetTemperature}℃`
    : '先确认尺寸、水体、温度和设备。';
  const hasFishLikeSpecies = currentFishesDetails.some(fish => ['freshwaterFish', 'saltwaterFish', 'reptile'].includes(getLifeType(fish)));
  const hasOnlyInvertebrates = hasStockedAnimals && !hasFishLikeSpecies && currentFishesDetails.some(fish => getLifeType(fish) === 'invertebrate');
  const tankHealthStatus = healthScore < 60 || conflicts.length > 0 ? '风险' : healthScore < 80 || isChangeOverdue || daysUntilChange <= 1 ? '提醒' : '正常';
  const waterTaskStatus: TodayTaskStatus = waterChangedToday ? '已完成' : isChangeOverdue ? '建议处理' : daysUntilChange <= 1 ? '待处理' : '观察';
  const feedingTaskStatus: TodayTaskStatus = !hasStockedAnimals ? '观察' : fedToday ? '已完成' : '观察';
  const heaterNeedsAttention = heaterSpeciesCount > 0 && !activeAquarium.equipment?.heater;
  const equipmentTaskStatus: TodayTaskStatus = heaterNeedsAttention ? '建议处理' : '已完成';
  const observeTaskStatus: TodayTaskStatus = conflicts.length > 0 ? '建议处理' : '观察';
  const diagnosisTankSummary = getDiagnosisTankSummary();
  const activeDiagnosisProblemType: DiagnosisProblemType = isDiagnosisProblemType(diagnosisIssueType) ? diagnosisIssueType : '巡检';
  const activeDiagnosisQuestions = getDiagnosisQuestions(activeDiagnosisProblemType, diagnosisQuizAnswers);
  const activeDiagnosisQuestion = activeDiagnosisQuestions[diagnosisQuestionIndex];
  const currentDiagnosisAnswer = activeDiagnosisQuestion ? diagnosisQuizAnswers[activeDiagnosisQuestion.id] || '' : '';
  const diagnosisProgressPercent = activeDiagnosisQuestions.length > 0
    ? ((diagnosisQuestionIndex + 1) / activeDiagnosisQuestions.length) * 100
    : 0;
  const recentDiagnosisRecords = diagnosisRecords
    .filter(record => record.aquariumId === diagnosisTankSummary.aquariumId)
    .slice(0, 3);
  const todayTaskCount = [
    waterTaskStatus,
    equipmentTaskStatus,
    observeTaskStatus,
  ]
    .filter(status => status === '待处理' || status === '建议处理').length;
  const waterChangeOverdueDays = isChangeOverdue ? Math.abs(daysUntilChange) : 0;
  const dailyAdviceMissingData = [
    '近期水质数据',
    ...(!latestWaterChangeDate ? ['上次换水记录'] : []),
    ...(!activeAquarium.targetTemperature ? ['当前水温'] : []),
  ];
  const knownRiskLevel = conflicts.length >= 3 ? 'high' : conflicts.length > 0 ? 'medium' : 'none_recorded';
  const dailyAdviceTask: DailyAdviceTask | null = waterChangedToday
    ? null
    : isChangeOverdue || daysUntilChange <= 1
      ? {
        id: `water-change-${activeAquarium.id}`,
        type: 'water_change',
        title: '今天优先完成本次换水',
        priority: isChangeOverdue ? 'high' : 'medium',
        reason: isChangeOverdue
          ? `换水计划已逾期 ${waterChangeOverdueDays} 天。`
          : '换水计划今天需要处理。',
        evidence: latestWaterChangeDate
          ? '上次换水记录与设定的换水周期'
          : '缺少上次换水记录，建议先补充或完成一次换水记录',
        trigger: {
          type: isChangeOverdue ? 'maintenance_overdue' : 'maintenance_due',
          source: latestWaterChangeDate ? 'water_change_record' : 'maintenance_schedule',
          value: {
            overdueDays: waterChangeOverdueDays,
            latestWaterChangeDate: latestWaterChangeDate || '',
            shortestCycle,
          },
        },
        steps: [
          '准备经过处理且温度接近的水。',
          '按当前稳定方案完成换水。',
          '记录本次换水日期。',
          '换水后观察鱼群是否出现明显异常。',
        ],
        observationNote: '换水后进行常规状态观察；只有用户记录了异常时，系统才会显示当前异常。',
      }
      : null;
  const dailyAdviceLevel: AquariumStatusLevel = knownRiskLevel === 'high'
    ? 'urgent'
    : dailyAdviceTask
      ? 'needs_attention'
      : dailyAdviceMissingData.length >= 2 && !hasStockedAnimals
        ? 'insufficient_data'
        : 'normal';
  const dailyAdviceViewModel: DailyAdviceViewModel = {
    level: dailyAdviceLevel,
    label: dailyAdviceLevel === 'urgent'
      ? '需要立即处理'
      : dailyAdviceLevel === 'needs_attention'
        ? '需要处理'
        : dailyAdviceLevel === 'insufficient_data'
          ? '信息不足'
          : '状态稳定',
    sourceLabel: dailyAdviceTask?.trigger.source === 'water_change_record' ? '基于养护记录' : '基于鱼缸记录',
    referenceTank: {
      name: activeAquarium.name,
      waterType: activeAquarium.waterType === 'Saltwater' ? '海水' : '淡水',
      temperature: activeAquarium.targetTemperature ? `${activeAquarium.targetTemperature}°C` : '未设置水温',
    },
    status: {
      pendingTaskCount: dailyAdviceTask ? 1 : 0,
      maintenanceStatus: waterChangedToday ? 'normal' : isChangeOverdue ? 'overdue' : daysUntilChange <= 1 ? 'due' : 'normal',
      knownRiskLevel,
      dataStatus: dailyAdviceMissingData.length === 0 ? 'sufficient' : dailyAdviceMissingData.length >= 2 ? 'insufficient' : 'partial',
      missingData: dailyAdviceMissingData,
    },
    task: dailyAdviceTask,
    statusItems: [
      {
        title: '维护状态',
        value: waterChangedToday
          ? '今日已记录换水'
          : isChangeOverdue
            ? `换水逾期 ${waterChangeOverdueDays} 天`
            : daysUntilChange <= 1
              ? '换水计划到期'
              : `下次换水约 ${nextSuggestedWaterChangeDate}`,
        tone: waterChangedToday || (!isChangeOverdue && daysUntilChange > 1) ? 'normal' : 'warning',
        note: latestWaterChangeDate ? `上次记录：${latestWaterChangeDate}` : '暂无上次换水记录',
      },
      {
        title: '已知异常',
        value: conflicts.length > 0 ? `已记录 ${conflicts.length} 条混养提醒` : '暂无已记录的紧急异常',
        tone: conflicts.length > 0 ? 'danger' : 'normal',
        note: conflicts.length > 0 ? '来自混养规则结果' : '不等于没有风险，仅表示没有异常记录',
      },
      {
        title: '数据状态',
        value: dailyAdviceMissingData.length > 0 ? `缺少${dailyAdviceMissingData.join('、')}` : '关键数据已记录',
        tone: dailyAdviceMissingData.length > 0 ? 'warning' : 'normal',
        note: dailyAdviceMissingData.length > 0 ? '暂无近期数据时不判断水质正常' : '可继续按记录维护',
      },
    ],
    reasoning: [
      dailyAdviceTask
        ? dailyAdviceTask.evidence
        : '今天没有来自养护记录的必须处理任务。',
      conflicts.length > 0
        ? `当前已有 ${conflicts.length} 条混养提醒，需单独查看混养依据。`
        : '暂无已记录的紧急异常；系统不会把未记录当作“无风险”。',
      dailyAdviceMissingData.length > 0
        ? `仍缺少：${dailyAdviceMissingData.join('、')}。`
        : '关键维护数据已有记录。',
    ],
  };
  const localTemperatureHint = weatherStatus === 'ready' && localWeather?.temperatureC !== undefined
    ? `室外约 ${Math.round(localWeather.temperatureC)}°C，`
    : '';
  const feedingDescription = fedToday
    ? `已记录今日喂食，继续观察抢食和残饵。`
    : hasOnlyInvertebrates
      ? '以藻类和残饵为主，少量补充即可，避免过量坏水。'
      : '按鱼只状态少量投喂，2-3 分钟内吃完即可，不必机械固定每天同量。';
  const recommendedActionCandidates: Array<{
    id: string;
    title: string;
    status: ActionCenterStatus;
    description: string;
    actionText: string;
    icon: ReactNode;
    onAction: () => void;
    tone?: 'normal' | 'warning' | 'danger' | 'info' | 'muted';
  }> = hasStockedAnimals
    ? []
    : [
        ...(!isBasicConfigComplete ? [{
          id: 'setupAquarium',
          title: '完善鱼缸配置',
          status: '建议处理' as ActionCenterStatus,
          description: '补齐尺寸、温度和设备。',
          actionText: '去设置',
          icon: <Settings className="h-4 w-4" />,
          onAction: () => openAquariumSettings(),
          tone: 'warning' as const,
        }] : []),
        ...(isBasicConfigComplete ? [{
          id: 'buildPlan',
          title: hasAppliedBuildPlan ? '查看当前方案' : '选择搭建方案',
          status: hasAppliedBuildPlan ? '已完成' as ActionCenterStatus : '观察' as ActionCenterStatus,
          description: hasAppliedBuildPlan ? '可更换或调整方案。' : '先确定底床、设备和生物上限。',
          actionText: hasAppliedBuildPlan ? '查看方案' : '选方案',
          icon: <Layers3 className="h-4 w-4" />,
          onAction: () => setIsBuildPlanOpen(true),
        }] : []),
      ].slice(0, 1);
  const nextStepMessage = !hasStockedAnimals
    ? isBasicConfigComplete && hasAppliedBuildPlan
      ? '当前只保留一个最该做的动作。'
      : isBasicConfigComplete
        ? '先选一个安全搭建方向。'
        : '先把基础配置补齐。'
    : todayTaskCount > 0
      ? `今天有 ${todayTaskCount} 项建议处理。`
      : '今天暂无紧急任务，可以正常观察。';
  const commonActions = [
    {
      id: 'recordWaterChange',
      label: waterChangedToday ? '撤回换水记录' : '记录本次换水',
      description: waterChangedToday ? '今日已记录' : '更新换水周期',
      icon: <Droplets className="h-4 w-4" />,
      onClick: handleTankWaterChange,
      tone: waterChangedToday ? 'normal' as const : waterTaskStatus === '建议处理' || waterTaskStatus === '待处理' ? 'warning' as const : 'info' as const,
      active: waterChangedToday,
    },
    {
      id: 'recordFeeding',
      label: fedToday ? '撤回喂食记录' : '记录本次喂食',
      description: hasStockedAnimals ? (fedToday ? '今日已记录' : '少量投喂') : '添加生物后使用',
      icon: <Heart className="h-4 w-4" />,
      onClick: () => {
        if (!hasStockedAnimals) {
          showToast('鱼缸内还没有生物，添加后才能记录喂食', 'error');
          return;
        }
        setFedToday(prev => {
          const next = !prev;
          const today = format(new Date(), 'yyyy-MM-dd');
          const nextRecords = next
            ? [
              ...feedingRecords,
              {
                id: Math.random().toString(36).substring(2, 9),
                aquariumId: activeId,
                createdAt: new Date().toISOString(),
                type: 'feeding',
                note: '喂食记录',
              },
            ]
            : feedingRecords.filter(record => !(record.aquariumId === activeId && record.createdAt.startsWith(today)));
          setFeedingRecords(nextRecords);
          patchLocalAppState({ feedingRecords: nextRecords }, { debounce: true });
          setTankActionMessage(next ? `已记录喂食：${format(new Date(), 'HH:mm')}` : '已撤回今日喂食记录');
          return next;
        });
      },
      tone: !hasStockedAnimals ? 'muted' as const : fedToday ? 'normal' as const : 'info' as const,
      active: fedToday,
    },
    {
      id: 'addSpecies',
      label: '添加生物',
      description: tankHealthStatus === '风险' ? '先处理风险后添加' : '从图鉴加入鱼缸',
      icon: <Plus className="h-4 w-4" />,
      onClick: () => setIsAddFishOpen(true),
      tone: tankHealthStatus === '风险' ? 'muted' as const : 'normal' as const,
    },
    {
      id: 'smartRecommend',
      label: 'AI 建缸规划',
      description: '先理解目标再筛方案',
      icon: <Sparkles className="h-4 w-4" />,
      onClick: () => openTankBuildCopilot(),
      tone: 'normal' as const,
    },
    {
      id: 'viewRecords',
      label: '查看养护记录',
      description: '养护历史',
      icon: <Calendar className="h-4 w-4" />,
      onClick: () => setIsCalendarOpen(true),
      tone: 'info' as const,
    },
  ];
  const hasPriorityRisk = hasStockedAnimals && (healthScore < 85 || conflicts.length > 0 || observeTaskStatus === '建议处理');
  const markPriorityTask = (id: string, status: string) => {
    setPriorityTaskStatus(prev => {
      const next = { ...prev, [id]: status };
      patchLocalAppState({ riskReminderState: next }, { debounce: true });
      return next;
    });
  };
  const riskReminderCount = Math.max(1, conflicts.length || todayTaskCount || (healthScore < 85 ? 1 : 0));
  const riskReminders = [
    ...(hasStockedAnimals ? [{
      id: 'observeBreathing',
      level: healthScore < 60 ? '紧急' : '建议观察',
      title: '观察鱼的呼吸状态',
      reason: '如果鱼浮头、急促呼吸或趴缸，可能需要处理。',
      actionText: priorityTaskStatus.observeBreathing || '开始观察',
      tone: healthScore < 60 ? 'danger' : 'warning',
      onClick: () => setIsObservationOpen(true),
    }] : []),
    ...(conflicts.length > 0 ? [{
      id: 'viewMixingRisk',
      level: '配置提醒',
      title: '查看混养风险',
      reason: `当前鱼缸内已有 ${totalStockedQuantity} 只/条生物，建议检查体型、性情或空间冲突。`,
      actionText: priorityTaskStatus.viewMixingRisk || '查看混养风险',
      tone: 'warning',
      onClick: () => {
        setIsConflictDialogOpen(true);
        markPriorityTask('viewMixingRisk', '已查看');
      },
    }] : []),
    ...((healthScore < 85 || isChangeOverdue) ? [{
      id: 'checkWater',
      level: '可选排查',
      title: '检查水体状态',
      reason: '如果水发白、发绿、有异味，再进入水质诊断。',
      actionText: priorityTaskStatus.checkWater || '开始水质自查',
      tone: 'info',
      onClick: () => {
        handleOpenDiagnosisWithType('水质异常');
      },
    }] : []),
  ];
  const structuredDiagnosis = diagnosisResult;
  const scrollToDesktopDiscovery = () => {
    void navigateToSection('aquarium-discovery', { updateHash: false });
  };

  return (
    <div className="page-frame-wide aquarium-desktop-layout flex min-w-0 flex-col gap-4 overflow-x-hidden text-[13px] leading-relaxed">
      <aside className="aquarium-side hidden">
        <div className="grid gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAquariumMenuOpen(prev => !prev)}
              className="w-full rounded-[22px] bg-accent px-3 py-3 text-left text-white shadow-[0_14px_30px_rgba(27,77,62,0.18)]"
            >
              <span className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-[15px] bg-white/14">
                  <Droplets className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-black">{activeAquarium?.name || '我的鱼缸'}</span>
                  <span className="block text-[10px] font-bold text-white/62">{aquariums.length} 个鱼缸</span>
                </span>
              </span>
            </button>
            {isAquariumMenuOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-[70] w-[260px] overflow-hidden rounded-[20px] border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)] ring-1 ring-ink/5">
                <div className="border-b border-border/60 px-3 py-2">
                  <div className="text-[11px] font-black text-ink">切换鱼缸</div>
                  <div className="mt-0.5 text-[9px] font-bold text-ink/42">选择当前正在管理的鱼缸</div>
                </div>
                <div className="max-h-[240px] overflow-y-auto p-1.5">
                  {aquariums.map(aq => {
                    const isActiveAquarium = activeId === aq.id;
                    return (
                      <button
                        key={aq.id}
                        type="button"
                        onClick={() => {
                          setActiveId(aq.id);
                          setIsAquariumMenuOpen(false);
                        }}
                        className={`flex w-full min-w-0 items-center gap-2 rounded-[15px] p-1.5 text-left transition-colors ${
                          isActiveAquarium ? 'bg-emerald-50' : 'hover:bg-bg'
                        }`}
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          isActiveAquarium ? 'bg-emerald-700 text-white' : 'bg-bg text-ink/45'
                        }`}>
                          <Droplets className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-black text-ink">{aq.name}</span>
                          <span className="block text-[9px] font-bold text-ink/42">
                            {aq.fishes.length > 0 ? `${aq.fishes.length} 种内容` : '暂无生物'}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsWishlistExpanded(prev => !prev)}
            className="rounded-[20px] bg-white/70 px-3 py-3 text-left text-rose-500 transition-colors hover:bg-white"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Heart className={`h-4 w-4 ${wishlistFishes.length > 0 ? 'fill-current' : ''}`} />
                <span className="text-[13px] font-black">种草图鉴</span>
              </span>
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black">{wishlistFishes.length}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={openLocalDataManager}
            className="rounded-[20px] bg-white/70 px-3 py-3 text-left text-ink/58 transition-colors hover:bg-white hover:text-ink"
          >
            <span className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="text-[13px] font-black">数据保存提醒</span>
            </span>
          </button>
          <button
            type="button"
            onClick={scrollToDesktopDiscovery}
            className="rounded-[20px] bg-white/70 px-3 py-3 text-left text-ink/58 transition-colors hover:bg-white hover:text-accent"
          >
            <span className="block text-[13px] font-black">今日种草</span>
            <span className="mt-0.5 block text-[10px] font-bold text-ink/36">定位到推荐板块</span>
          </button>
        </div>
      </aside>
      {/* Aquarium Tabs */}
      <section className="aquarium-toolbar order-[0] min-w-0 pb-1 pt-[58px] md:pt-0 md:hidden">
        <div className="fixed inset-x-0 top-0 z-[60] mx-auto flex w-full max-w-[430px] min-w-0 items-center gap-2 bg-bg/95 px-3 pb-2 pt-[calc(8px+env(safe-area-inset-top))] shadow-sm backdrop-blur-md md:sticky md:inset-auto md:top-0 md:z-40 md:max-w-[760px] md:rounded-[28px] md:border md:border-white/80 md:bg-white/78 md:px-4 md:py-3 md:shadow-sm">
          <div className="relative min-w-0 flex-1 md:max-w-[360px] md:flex-none">
            <button
              type="button"
              onClick={() => setIsAquariumMenuOpen(prev => !prev)}
              className="flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-full border border-white/80 bg-white px-2.5 text-left shadow-sm ring-1 ring-ink/5 transition-colors hover:border-emerald-100"
              aria-expanded={isAquariumMenuOpen}
              title="切换鱼缸"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <Droplets className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-black leading-tight text-ink">
                    {activeAquarium?.name || '我的鱼缸'}
                  </span>
                  <span className="block text-[9px] font-bold leading-tight text-ink/42">
                    {aquariums.length} 个鱼缸
                  </span>
                </span>
              </span>
              <ChevronRight className={`h-4 w-4 shrink-0 text-ink/38 transition-transform ${isAquariumMenuOpen ? 'rotate-90' : ''}`} />
            </button>

            {isAquariumMenuOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-[70] w-[min(300px,calc(100vw-112px))] overflow-hidden rounded-[20px] border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)] ring-1 ring-ink/5">
                <div className="border-b border-border/60 px-3 py-2">
                  <div className="text-[11px] font-black text-ink">切换鱼缸</div>
                  <div className="mt-0.5 text-[9px] font-bold text-ink/42">选择当前正在管理的鱼缸</div>
                </div>
                <div className="max-h-[240px] overflow-y-auto p-1.5">
                  {aquariums.map(aq => {
                    const isActiveAquarium = activeId === aq.id;
                    return (
                      <div
                        key={aq.id}
                        className={`group flex items-center gap-2 rounded-[15px] p-1.5 transition-colors ${
                          isActiveAquarium ? 'bg-emerald-50' : 'hover:bg-bg'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveId(aq.id);
                            setIsAquariumMenuOpen(false);
                          }}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            isActiveAquarium ? 'bg-emerald-700 text-white' : 'bg-bg text-ink/45'
                          }`}>
                            <Droplets className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[12px] font-black text-ink">{aq.name}</span>
                            <span className="block text-[9px] font-bold text-ink/42">
                              {aq.fishes.length > 0 ? `${aq.fishes.length} 种内容` : '暂无生物'}
                            </span>
                          </span>
                        </button>
                        {isActiveAquarium && (
                          <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-emerald-700 shadow-sm">
                            当前
                          </span>
                        )}
                        <button
                          type="button"
                          aria-label={`删除${aq.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setIsAquariumMenuOpen(false);
                            requestDeleteAquarium(aq.id);
                          }}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink/28 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="删除鱼缸"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleAddAquarium();
                    setIsAquariumMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-center gap-1.5 border-t border-border/60 bg-bg/55 px-3 py-2.5 text-[12px] font-black text-emerald-700 transition-colors hover:bg-emerald-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  新建鱼缸
                </button>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsWishlistExpanded(prev => !prev)}
              className="flex h-8 items-center gap-1 rounded-full border border-rose-100 bg-white px-2.5 text-[11px] font-black text-rose-500 shadow-sm"
              title="查看种草图鉴"
            >
              <Heart className={`h-3.5 w-3.5 ${wishlistFishes.length > 0 ? 'fill-current' : ''}`} />
              <span className="hidden min-[380px]:inline">种草图鉴</span>
              <span>{wishlistFishes.length}</span>
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isWishlistExpanded ? 'rotate-90' : ''}`} />
            </button>
            <button
              type="button"
              onClick={openLocalDataManager}
              aria-label="数据保存提醒"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-ink/50 shadow-sm transition-colors hover:text-ink"
              title="数据保存提醒"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isWishlistExpanded && (
          <div className="mt-2 overflow-hidden rounded-sm border border-rose-100 bg-rose-50/60 shadow-sm">
            {wishlistFishes.length === 0 ? (
              <div className="rounded-sm border border-dashed border-rose-200 bg-white/60 px-3 py-4 text-center text-[11px] font-medium text-ink/50">
                还没有种草，滑动“今天想养哪一种”或在图鉴里点心愿按钮。
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-x-1.5 gap-y-4 bg-[#FBFAF6] px-2.5 py-3 md:grid-cols-7 lg:grid-cols-8 md:gap-2">
                {wishlistFishes.map(fish => (
                  <div key={fish.id} className="group relative min-w-0 text-center">
                    <button
                      type="button"
                      aria-label={`移除${fish.name}`}
                      onClick={() => toggleWishlist(fish.id)}
                      className="absolute right-0 top-0 z-10 rounded-full bg-white/90 p-0.5 text-rose-400 shadow-sm hover:text-rose-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <button
                      id={`aquarium-wishlist-species-${fish.id}`}
                      type="button"
                      onClick={() => openWishlistSpeciesDetail(fish, `aquarium-wishlist-species-${fish.id}`)}
                      className="block w-full rounded-[12px] text-center transition-colors hover:bg-rose-50/55 focus:outline-none focus:ring-2 focus:ring-rose-100"
                      aria-label={`查看${fish.name}详情`}
                    >
                      <div className={`relative mx-auto flex h-[46px] w-full items-end justify-center rounded-[12px] ${getSpeciesImageSurfaceClass(fish)}`}>
                        <img
                          src={getSpeciesDisplayImage(fish)}
                          alt={fish.name}
                          className={`max-h-[44px] max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.04] ${getSpeciesImageClass(fish)}`}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="mt-1.5 truncate text-[10px] font-bold leading-tight text-ink/75 group-hover:text-rose-500">{fish.name}</div>
                      <div className="mt-0.5 truncate text-[9px] font-medium leading-tight text-ink/38">{getArchiveCategory(fish)}</div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <div id="aquarium-overview" className="aquarium-status order-[2] scroll-mt-4 md:order-none">
        <StatusSummaryCard
          advice={dailyAdviceViewModel}
          showDetails={isDailyAdviceDetailsOpen}
          aiAnswer={dailyAdviceAiAnswer}
          aiError={dailyAdviceAiError}
          aiSource={dailyAdviceAiSource}
          isAiLoading={isDailyAdviceAiLoading}
          onAskAI={handleAskDailyAdviceAI}
          onAction={handleDailyAdviceAction}
        />
      </div>

      <section id="aquarium-discovery" className="aquarium-discovery order-[1] scroll-mt-4 overflow-hidden rounded-[18px] border border-white/80 bg-white/65 p-3 shadow-sm md:order-none">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-black text-ink">今日种草</div>
            <div className="text-[10px] font-bold text-ink/45">每天随机 10 个物种，完整模式点卡片进入。</div>
          </div>
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1.5 text-[10px] font-black text-ink/42">
            今日 {discoveryRemainingToday}/10
          </span>
        </div>
        {discoveryFish ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setSelectedDiscoveryFish(discoveryFish)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSelectedDiscoveryFish(discoveryFish);
              }
            }}
            className="grid min-h-[146px] w-full cursor-pointer grid-cols-[38%_1fr] gap-3 rounded-[16px] bg-[#FBFAF6] p-3 text-left shadow-sm transition-transform active:scale-[0.99] md:desktop-split-card md:items-start md:gap-4"
          >
            <div className={`flex h-full min-h-[116px] items-center justify-center rounded-[14px] p-2 ${getSpeciesImageSurfaceClass(discoveryFish)}`}>
              <img
                src={discoveryImageSrc}
                alt={discoveryFish.name}
                className={`max-h-[104px] w-full object-contain ${getSpeciesImageClass(discoveryFish)}`}
                referrerPolicy="no-referrer"
                loading="eager"
                decoding="async"
                onLoad={() => setLoadedDiscoveryImageSrc(discoveryImageSrc)}
              />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-serif text-[18px] italic font-bold leading-tight text-ink">{discoveryFish.name}</h3>
              <div className="mt-1 flex flex-wrap gap-1">
                {[
                  discoveryFish.difficulty === 'Easy' ? '新手友好' : getDifficultyLabel(discoveryFish.difficulty),
                  getToolFunctions(discoveryFish)[0],
                  needsHeaterForSpecies(discoveryFish) ? '需加热' : discoveryFish.housingMode,
                ].filter(Boolean).slice(0, 3).map(tag => (
                  <span key={tag} className="rounded-full border border-border bg-white px-1.5 py-0.5 text-[9px] font-black text-ink/55">{tag}</span>
                ))}
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] font-bold leading-relaxed text-ink/62">{getDiscoveryPositioning(discoveryFish)}</p>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 min-w-0 rounded-full border-border bg-white px-2 text-[11px] font-black text-ink/62"
                  onClick={(event) => {
                    event.stopPropagation();
                    advanceDiscoveryCard('skip');
                  }}
                >
                  换一条
                </Button>
                <Button
                  type="button"
                  className={`h-8 min-w-0 rounded-full px-2 text-[11px] font-black ${
                    wishlistFishIds.has(discoveryFish.id)
                      ? 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                      : 'bg-rose-500 text-white hover:bg-rose-600'
                  }`}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (wishlistFishIds.has(discoveryFish.id)) {
                      setDiscoveryMessage(`${discoveryFish.name} 已在种草图鉴中。`);
                      return;
                    }
                    advanceDiscoveryCard('interest');
                  }}
                >
                  {wishlistFishIds.has(discoveryFish.id) ? '已种草' : '感兴趣'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[16px] border border-rose-100 bg-[#FBFAF6] p-4 text-center">
            <Heart className="mx-auto mb-2 h-7 w-7 fill-rose-400 text-rose-400" />
            <h3 className="font-serif text-base italic font-bold text-ink">
              {isDiscoveryDailyLimitReached ? '今天的 10 款已经看完啦' : '暂时没有新的推荐'}
            </h3>
            <p className="mt-1 text-xs font-medium text-ink/55">
              {isDiscoveryDailyLimitReached ? '明天再来看看新的灵感。' : '稍后再来看看，也许会遇到新的心动物种。'}
            </p>
          </div>
        )}
        {discoveryMessage && (
          <div className="mt-2 rounded-full bg-ink px-3 py-2 text-center text-[11px] font-bold text-white shadow-sm">
            {discoveryMessage}
          </div>
        )}
      </section>

      <section id="aquarium-actions" className="aquarium-actions order-[3] scroll-mt-4 overflow-hidden rounded-[20px] border border-white/80 bg-white/65 p-3 shadow-sm md:order-none">
        <SectionHeader title="常用操作" subtitle="快速记录日常养护。" />
        <div className="mt-3">
          <QuickActionGrid actions={commonActions} />
        </div>
      </section>

      {recommendedActionCandidates.length > 0 && (
      <section id="next-actions" className="aquarium-recommend order-[4] scroll-mt-4 overflow-hidden rounded-[20px] border border-white/80 bg-white/65 p-3 shadow-sm md:order-none">
        <SectionHeader title="下一步行动" subtitle={tankActionMessage || nextStepMessage} />
        <div className="mt-3">
          <div className="grid grid-cols-1 gap-2">
            {recommendedActionCandidates.map(action => (
              <ActionCenterCard
                key={action.id}
                title={action.title}
                status={action.status}
                description={action.description}
                actionText={action.actionText}
                icon={action.icon}
                onAction={action.onAction}
                tone={action.tone}
                size="tool"
              />
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Visual Tank Placeholder */}
      <div id="aquarium-tank" tabIndex={-1} className="aquarium-tank order-[5] relative h-72 w-full scroll-mt-4 overflow-hidden rounded-[18px] border border-white/80 shadow-sm group md:order-none md:h-[min(50dvh,470px)] md:min-h-[360px]">
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-sky-100 to-emerald-100 text-xs font-bold text-accent">
              正在加载鱼缸画面...
            </div>
          }
        >
          <ThreeAquarium
            aquarium={activeAquarium}
            activeSpecies={active3DSpecies}
            onSpeciesSelect={handleAquariumSpeciesSelect}
          />
        </Suspense>
        
        {/* Environment Info Overlay */}
        <div className="absolute left-2 top-2 z-10 flex max-w-[calc(100%-112px)] flex-wrap gap-1.5 pointer-events-none">
          <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded-sm text-[9px] font-bold text-ink shadow-sm border border-white/50">
            {activeAquarium.waterType === 'Saltwater' ? '海水' : '淡水'} | {activeAquarium.targetTemperature || '25'}°C
          </div>
          <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded-sm text-[9px] font-bold text-ink shadow-sm border border-white/50">
            {activeAquarium.dimensions?.length || 60}x{activeAquarium.dimensions?.width || 40}x{activeAquarium.dimensions?.height || 40}cm · 约{tankVolumeLiters}L
          </div>
        </div>

        {/* Species Sidebar Overlay for 3D navigation */}
        {activeAquarium && activeAquarium.fishes.length > 0 && (
          <div className="absolute top-12 left-2 z-10 bg-white/80 backdrop-blur-md border border-white/50 rounded-sm shadow-sm p-1.5 max-h-[60%] overflow-y-auto w-24 sm:w-28 custom-scrollbar flex flex-col gap-1 hidden md:flex">
            <span className="text-[9px] font-bold text-ink/50 uppercase tracking-wider px-1 text-center mb-1">切换镜头</span>
            {Array.from(new Set(activeAquarium.fishes.map(f => f.fishId))).map(uId => {
              const fishInfo = fishData.find(f => f.id === uId);
              if (!fishInfo) return null;
              const qty = activeAquarium.fishes.filter(f => f.fishId === uId).reduce((sum, item) => sum + (item.quantity||1), 0);
              const isActive = active3DSpecies === uId;
              return (
                <button 
                  key={uId} 
                  className={`flex items-center gap-1.5 p-1 rounded transition-colors text-left ${isActive ? 'bg-accent/10 border-accent/30 border text-accent' : 'hover:bg-white/50 border border-transparent blur-0'}`}
                  onClick={() => setActive3DSpecies(isActive ? null : uId)}
                >
                  <img src={getSpeciesDisplayImage(fishInfo)} alt={fishInfo.name} className={`w-4 h-4 rounded-full object-contain ${getSpeciesImageSurfaceClass(fishInfo)} ${getSpeciesImageClass(fishInfo)}`} />
                  <div className="flex flex-col flex-1 truncate">
                    <span className="text-[10px] font-bold truncate pr-1 whitespace-nowrap leading-none">{fishInfo.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Tank Action Toolbar */}
        <div className="absolute right-2 top-2 z-20 flex flex-col gap-2">
          <Button
            aria-label="添加生物"
            title="添加生物"
            onClick={() => setIsAddFishOpen(true)}
            className="h-8 w-8 rounded-full border border-white/50 bg-white/55 p-0 text-ink/55 shadow-none backdrop-blur-sm hover:bg-white hover:text-accent"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            aria-label="全屏预览"
            title="全屏预览"
            onClick={() => setIsTankPreviewOpen(true)}
            className="h-8 w-8 rounded-full border border-white/50 bg-white/55 p-0 text-ink/55 shadow-none backdrop-blur-sm hover:bg-white hover:text-accent"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            aria-label="鱼缸设置"
            title="鱼缸设置"
            onClick={() => openAquariumSettings()}
            className="h-8 w-8 rounded-full border border-white/50 bg-white/55 p-0 text-ink/55 shadow-none backdrop-blur-sm hover:bg-white hover:text-accent"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Floating Conflict Warning Trigger */}
        {conflicts.length > 0 && (
          <div className="absolute bottom-2 right-2 z-10">
            <Button
              variant="destructive"
              className="h-8 rounded-full border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-black text-amber-700 shadow-sm hover:bg-amber-100"
              onClick={() => setIsConflictDialogOpen(true)}
            >
              <AlertTriangle className="mr-1 h-3.5 w-3.5" />
              <span className="font-bold text-xs">风险警告</span>
            </Button>
          </div>
        )}
      </div>

      {/* Tank Species Archive */}
      <section id="aquarium-records" className="aquarium-archive order-[6] scroll-mt-4 overflow-hidden rounded-[18px] border border-white/80 bg-[#F8F7F2] shadow-sm">
        <button
          type="button"
          onClick={() => setIsTankArchiveExpanded(prev => !prev)}
          className="flex w-full items-center justify-between gap-3 bg-[#E9E8E2] px-3 py-3 text-left transition-colors hover:bg-[#E4E2DB]"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[14px] font-black text-ink">
              <BookOpen className="h-4 w-4 text-accent" />
              缸内内容
            </div>
            <div className="mt-0.5 text-[10px] font-bold text-ink/45">
              {hasStockedAnimals
                ? `已养 ${totalStockedQuantity} 只 · 已配置 ${tankContentCount} 项`
                : hasEnvironmentContent
                  ? '暂无鱼虾螺，已配置环境内容'
                  : '当前还没有配置鱼缸内容'}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {ownedArchivePreviewItems.length > 0 && (
              <div className="flex -space-x-2">
                {ownedArchivePreviewItems.map(item => (
                  <span key={item.fish.id} className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white bg-white shadow-sm">
                    <img src={getSpeciesDisplayImage(item.fish)} alt={item.fish.name} className={`h-full w-full object-contain p-0.5 ${getSpeciesImageClass(item.fish)}`} referrerPolicy="no-referrer" />
                  </span>
                ))}
              </div>
            )}
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-[12px] font-black tabular-nums text-ink shadow-sm">
              已配置 {activeConfiguredSettingCount} 项
            </span>
            <ChevronRight className={`h-4 w-4 text-ink/45 transition-transform ${isTankArchiveExpanded ? 'rotate-90' : ''}`} />
          </div>
        </button>

        {isTankArchiveExpanded && (
          <>
        <div className="relative border-b border-[#E6E2D8] bg-[#E9E8E2] px-3 pb-2">
          <div className="hidden items-center justify-between gap-3">
            <button
              type="button"
              aria-label="回到鱼缸画面"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white/85 text-ink/55 shadow-sm transition-colors hover:text-ink"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[20px] font-black leading-none text-ink">
              <BookOpen className="h-4 w-4 text-accent" />
                缸内内容
              </div>
              <div className="mt-1 text-[10px] font-bold text-ink/45">{activeAquarium.name}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[11px] font-bold text-ink/45">配置项</div>
              <div className="mt-1 rounded-full bg-white/80 px-2.5 py-1 text-[13px] font-black tabular-nums text-ink shadow-sm">
                {activeConfiguredSettingCount} 项
              </div>
            </div>
          </div>

        </div>

        <div className="relative bg-[#FBFAF6] px-2.5 pb-4 pt-3 before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_20%_10%,rgba(27,77,62,0.06),transparent_24%),linear-gradient(rgba(26,26,26,0.025)_1px,transparent_1px)] before:bg-[length:100%_100%,18px_18px]">
          {!hasAnyTankContent ? (
            <div className="relative rounded-[16px] bg-white/82 px-4 py-6 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <Plus className="h-6 w-6" />
              </div>
              <div className="text-sm font-black text-ink">当前还没有配置鱼缸内容</div>
              <p className="mx-auto mt-1 max-w-[260px] text-[11px] font-medium leading-relaxed text-ink/50">
                可以先完善配置、添加生物，或套用搭建方案快速起步。
              </p>
              <div className="mt-4 flex justify-center">
                <Button type="button" variant="outline" onClick={() => setIsAddFishOpen(true)} className="h-9 rounded-full text-xs font-black">
                  添加生物
                </Button>
              </div>
            </div>
          ) : filteredTankContentItems.length > 0 ? (
            <div className="relative grid grid-cols-5 gap-x-1.5 gap-y-4 rounded-[16px] bg-[#FBFAF6] px-1 py-2">
              {!hasStockedAnimals && hasEnvironmentContent && tankArchiveCategory === '全部' && (
                <div className="col-span-5 rounded-[14px] border border-sky-100 bg-sky-50/70 px-3 py-2">
                  <div className="text-[12px] font-black text-sky-800">暂无鱼虾螺，已配置环境内容</div>
                  <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-ink/55">
                    你已配置水草、底砂、造景或设备，可以继续添加适合的生物。
                  </p>
                </div>
              )}
              {filteredTankContentItems.map(item => {
                const ownedAqFish = item.fish ? activeAquarium.fishes.find(aqFish => aqFish.fishId === item.fish?.id) : undefined;
                const canOpenDetail = Boolean(item.fish && ownedAqFish && item.source === 'stocked');
                const canOpenSettings = ['equipment', 'substrate', 'plant'].includes(item.source);

                return (
                  <button
                    id={canOpenDetail && item.fish ? `aquarium-archive-species-${item.fish.id}` : undefined}
                    key={item.id}
                    type="button"
                    disabled={!canOpenDetail && !canOpenSettings}
                    onClick={() => {
                      if (canOpenDetail && item.fish && ownedAqFish) {
                        openAquariumSpeciesDetail(
                          item.fish,
                          ownedAqFish,
                          `aquarium-archive-species-${item.fish.id}`,
                        );
                        return;
                      }
                      if (item.source === 'equipment') {
                        openAquariumSettings('equipment');
                      } else if (item.source === 'substrate') {
                        openAquariumSettings('substrate');
                      } else if (item.source === 'plant') {
                        openAquariumSettings('plants');
                      }
                    }}
                    className={`group relative min-w-0 text-center ${canOpenDetail || canOpenSettings ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`relative mx-auto flex h-[52px] w-full items-end justify-center rounded-[12px] ${item.fish ? getSpeciesImageSurfaceClass(item.fish) : ''}`}>
                      {item.fish ? (
                        <img
                          src={getSpeciesDisplayImage(item.fish)}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className={`max-h-[50px] max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.04] ${getSpeciesImageClass(item.fish)}`}
                        />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-accent/70 shadow-sm">
                          <Layers3 className="h-5 w-5" />
                        </span>
                      )}
                      {item.source === 'stocked' && item.quantity > 1 && (
                        <span className="absolute right-0 top-0 rounded-full bg-ink/80 px-1 py-0.5 text-[8px] font-black text-white shadow-sm">
                          x{item.quantity}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 truncate text-[10px] font-bold leading-tight text-ink/75 group-hover:text-accent">{item.name}</div>
                    <div className="mt-0.5 truncate text-[9px] font-medium leading-tight text-ink/38">
                      {formatTankContentDate(item.acquiredDate)}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="relative rounded-sm border border-dashed border-ink/15 bg-white/70 px-4 py-8 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent-light text-accent">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="text-sm font-black text-ink">还没有这一类内容</div>
              <p className="mx-auto mt-1 max-w-[220px] text-[11px] font-medium leading-relaxed text-ink/50">
                {emptyMessageByCategory[tankArchiveCategory] || '暂无内容。'}
              </p>
            </div>
          )}
        </div>
          </>
        )}
      </section>

      {deceasedArchiveItems.length > 0 && (
        <section className="order-[7] overflow-hidden rounded-[18px] border border-white/80 bg-white/70 p-3 shadow-sm">
          <button
            type="button"
            onClick={() => setIsDeceasedArchiveExpanded(prev => !prev)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <div className="flex items-center gap-2 text-[14px] font-black text-ink">
                <Skull className="h-4 w-4 text-ink/45" />
                死亡图鉴
              </div>
              <div className="mt-0.5 text-[10px] font-bold text-ink/45">已记录 {deceasedArchiveItems.length} 次死亡，用于回看和复盘。</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-bg px-2 py-1 text-[10px] font-black text-ink/45">{deceasedArchiveItems.length}</span>
              <ChevronRight className={`h-4 w-4 text-ink/45 transition-transform ${isDeceasedArchiveExpanded ? 'rotate-90' : ''}`} />
            </div>
          </button>
          {isDeceasedArchiveExpanded && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {deceasedArchiveItems.slice(0, 12).map(({ record, fish }) => (
                <div key={record.id} className="min-w-0 rounded-[16px] bg-bg p-2">
                  <div className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-[14px] opacity-70 grayscale ${getSpeciesImageSurfaceClass(fish)}`}>
                    <img src={getSpeciesDisplayImage(fish)} alt={fish.name} className={`max-h-[86%] max-w-[86%] object-contain ${getSpeciesImageClass(fish)}`} referrerPolicy="no-referrer" />
                    <span className="absolute right-1.5 top-1.5 rounded-full bg-ink/75 px-1.5 py-0.5 text-[9px] font-black text-white">死亡</span>
                  </div>
                  <div className="mt-2 truncate text-[12px] font-black text-ink">{fish.name}</div>
                  <div className="mt-0.5 truncate text-[9px] font-bold text-ink/42">{fish.category}</div>
                  <div className="mt-1 text-[9px] font-bold text-ink/38">{format(new Date(record.date), 'yyyy/MM/dd')}</div>
                  <button
                    type="button"
                    onClick={() => handleReAddDeceasedFish(fish)}
                    className="mt-2 h-7 w-full rounded-full bg-white text-[10px] font-black text-emerald-700 shadow-sm ring-1 ring-emerald-100 transition-colors hover:bg-emerald-50 md:w-auto md:max-w-[200px]"
                  >
                    再次加入
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <Dialog open={!!pendingDeleteAquariumId} onOpenChange={(open) => !open && setPendingDeleteAquariumId(null)}>
        <DialogContent className="w-[90vw] max-w-[380px] rounded-[22px] border-red-100 bg-white p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-ink">
              <X className="h-5 w-5 rounded-full bg-red-50 p-1 text-red-600" />
              删除鱼缸
            </DialogTitle>
            <DialogDescription className="text-xs font-medium leading-relaxed text-ink/55">
              {aquariums.length <= 1
                ? '至少需要保留一个鱼缸，当前鱼缸不能删除。'
                : `你将删除「${pendingDeleteAquarium?.name || '当前鱼缸'}」。`}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-[16px] border border-red-100 bg-red-50 px-4 py-3 text-[12px] font-bold leading-relaxed text-red-700">
            {aquariums.length <= 1
              ? '请先新建另一个鱼缸，再删除当前鱼缸。'
              : '删除后，该鱼缸的配置、生物、换水记录等数据不会恢复。'}
          </div>
          <DialogFooter className="mt-2 grid grid-cols-2 gap-2 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full text-sm font-bold"
              onClick={() => setPendingDeleteAquariumId(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              className="h-10 rounded-full bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:bg-red-100 disabled:text-red-300"
              disabled={aquariums.length <= 1}
              onClick={confirmDeleteAquarium}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLocalDataOpen} onOpenChange={setIsLocalDataOpen}>
        <DialogContent className="flex max-h-[86dvh] w-[92vw] max-w-[430px] md:max-w-[600px] flex-col overflow-hidden rounded-[22px] border-border bg-bg p-0">
          <DialogHeader className="shrink-0 border-b border-white bg-white px-5 py-4 text-left">
            <DialogTitle className="text-xl font-black text-ink">数据保存提醒</DialogTitle>
            <DialogDescription className="text-xs font-medium leading-relaxed text-ink/55">
              你的鱼缸记录会保存在当前浏览器里，方便下次继续查看。
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="grid gap-3 text-[13px] font-medium leading-relaxed text-ink/64">
              <div className="rounded-[18px] border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex items-center gap-2 text-[14px] font-black text-emerald-800">
                  <Info className="h-4 w-4" />
                  当前浏览器会记住你的鱼缸
                </div>
                <p className="mt-2">
                  你添加的生物、种草、换水记录和鱼缸设置，都会保存在现在这个浏览器和这个网址下。
                </p>
              </div>
              <div className="rounded-[18px] border border-amber-100 bg-amber-50/70 p-4">
                <div className="text-[14px] font-black text-amber-900">换浏览器后不会自动出现</div>
                <p className="mt-2">
                  如果换手机、换浏览器、清理浏览器数据，之前的鱼缸记录可能看不到。当前版本还没有同步到云端账号。
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-white bg-white px-4 py-3">
            <Button type="button" variant="outline" onClick={() => setIsLocalDataOpen(false)} className="h-10 w-full rounded-full text-sm font-bold md:w-fit md:max-w-[220px]">
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTankPreviewOpen} onOpenChange={setIsTankPreviewOpen}>
        <DialogContent className="h-[92dvh] w-[96vw] max-w-[1180px] overflow-hidden rounded-[24px] border-border p-0 md:h-[calc(100dvh-24px)] md:w-[calc(100vw-32px)] md:max-w-[1480px]">
          <DialogHeader className="sr-only">
            <DialogTitle>鱼缸全屏预览</DialogTitle>
            <DialogDescription>放大查看当前鱼缸 3D 画面。</DialogDescription>
          </DialogHeader>
          <div className="grid h-full w-full bg-[#DDEAE8] md:grid-cols-[minmax(0,1fr)_280px]">
            <div id="aquarium-tank-preview" tabIndex={-1} className="relative min-h-0">
            <Suspense
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-sky-100 to-emerald-100 text-xs font-bold text-accent">
                  正在加载鱼缸画面...
                </div>
              }
            >
              <ThreeAquarium
                aquarium={activeAquarium}
                activeSpecies={active3DSpecies}
                onSpeciesSelect={handleAquariumSpeciesSelect}
              />
            </Suspense>
            <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5 pointer-events-none">
              <div className="bg-white/82 backdrop-blur-sm px-2.5 py-1 rounded-sm text-[10px] font-bold text-ink shadow-sm border border-white/60">
                {activeAquarium.name}
              </div>
              <div className="bg-white/82 backdrop-blur-sm px-2.5 py-1 rounded-sm text-[10px] font-bold text-ink shadow-sm border border-white/60">
                {activeAquarium.waterType === 'Saltwater' ? '海水' : '淡水'} · {activeAquarium.targetTemperature || '25'}°C · 约{tankVolumeLiters}L
              </div>
            </div>
            </div>
            <aside className="hidden min-h-0 border-l border-white/70 bg-white/78 p-4 backdrop-blur md:block">
              <div className="text-[18px] font-black text-ink">{activeAquarium.name}</div>
              <div className="mt-1 text-[12px] font-bold text-ink/48">沉浸式鱼缸视图</div>
              <div className="mt-4 grid gap-2">
                {[
                  `${activeAquarium.waterType === 'Saltwater' ? '海水' : '淡水'} · ${activeAquarium.targetTemperature || '25'}°C`,
                  `${activeAquarium.dimensions?.length || 60}x${activeAquarium.dimensions?.width || 40}x${activeAquarium.dimensions?.height || 40}cm · 约${tankVolumeLiters}L`,
                  `${activeAquarium.fishes.length} 条记录 · ${totalStockedQuantity} 只/条活体`,
                ].map(item => (
                  <div key={item} className="rounded-[16px] bg-white px-3 py-2 text-[12px] font-black text-ink/70 shadow-sm">
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-5 text-[13px] font-black text-ink">镜头切换</div>
              <div className="app-scrollbar-hidden mt-2 grid max-h-[48dvh] gap-2 overflow-y-auto">
                {Array.from(new Set(activeAquarium.fishes.map(f => f.fishId))).map(fishId => {
                  const fishInfo = fishData.find(fish => fish.id === fishId);
                  if (!fishInfo) return null;
                  const isActive = active3DSpecies === fishId;
                  const quantity = activeAquarium.fishes.filter(item => item.fishId === fishId).reduce((sum, item) => sum + (item.quantity || 1), 0);
                  return (
                    <button
                      key={fishId}
                      type="button"
                      onClick={() => setActive3DSpecies(isActive ? null : fishId)}
                      className={`grid grid-cols-[42px_1fr] items-center gap-2 rounded-[16px] border p-2 text-left transition-colors ${
                        isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-border bg-white text-ink/64 hover:border-emerald-100'
                      }`}
                    >
                      <span className={`flex h-10 w-10 items-center justify-center rounded-[12px] ${getSpeciesImageSurfaceClass(fishInfo)}`}>
                        <img src={getSpeciesDisplayImage(fishInfo)} alt={fishInfo.name} className={`max-h-9 max-w-9 object-contain ${getSpeciesImageClass(fishInfo)}`} referrerPolicy="no-referrer" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-black">{fishInfo.name}</span>
                        <span className="block text-[10px] font-bold opacity-55">{quantity} 只/条</span>
                      </span>
                    </button>
                  );
                })}
                {activeAquarium.fishes.length === 0 && (
                  <div className="rounded-[16px] border border-dashed border-border bg-white px-3 py-5 text-center text-[12px] font-bold text-ink/42">
                    还没有活体生物。
                  </div>
                )}
              </div>
            </aside>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDiagnosisOpen} onOpenChange={setIsDiagnosisOpen}>
        <DialogContent className="flex h-[88dvh] max-h-[calc(100dvh-24px)] w-[92vw] max-w-[560px] flex-col overflow-hidden rounded-[20px] border-border bg-bg p-0">
          <DialogHeader className="shrink-0 border-b border-white px-4 pb-3 pt-4">
            <DialogTitle className="flex items-center gap-2 text-xl font-black text-ink">
              <Activity className="h-5 w-5 text-emerald-700" />
              一键诊断
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-ink/60">
              像做一个小测试一样，回答几个问题后生成处理建议。
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="grid gap-4 p-4 pb-24">
              <section className="rounded-[18px] bg-white p-3 shadow-sm">
                <div className="mb-2 text-[12px] font-black text-ink/55">当前鱼缸摘要</div>
                {aquariums.length > 1 && (
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                    {aquariums.map(aquarium => (
                      <button
                        key={aquarium.id}
                        type="button"
                        onClick={() => {
                          setDiagnosisAquariumId(aquarium.id);
                          setDiagnosisResult(null);
                          setDiagnosisSaveMessage('');
                        }}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black transition-colors ${
                          diagnosisTankSummary.aquariumId === aquarium.id
                            ? 'bg-emerald-700 text-white'
                            : 'bg-bg text-ink/55 hover:bg-emerald-50 hover:text-emerald-800'
                        }`}
                      >
                        {aquarium.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '鱼缸', value: diagnosisTankSummary.name },
                    { label: '水体', value: diagnosisTankSummary.water },
                    { label: '温度', value: diagnosisTankSummary.temperature },
                    { label: '水量', value: diagnosisTankSummary.volume },
                    { label: '尺寸', value: diagnosisTankSummary.dimensions },
                    { label: '最近换水', value: diagnosisTankSummary.waterChange },
                    { label: '最近喂食', value: diagnosisTankSummary.recentFeeding },
                    { label: '最近添加', value: diagnosisTankSummary.recentAddedSpecies },
                  ].map(item => (
                    <div key={item.label} className="rounded-[12px] bg-bg px-2.5 py-2">
                      <div className="text-[10px] font-black text-ink/38">{item.label}</div>
                      <div className="mt-0.5 truncate text-[12px] font-black text-ink">{item.value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 rounded-[12px] bg-emerald-50 px-2.5 py-2 text-[11px] font-bold leading-relaxed text-emerald-900">
                  当前活体：{diagnosisTankSummary.stocked}
                </div>
                <div className="mt-2 rounded-[12px] bg-bg px-2.5 py-2 text-[11px] font-bold leading-relaxed text-ink/60">
                  设备：{diagnosisTankSummary.equipment}
                </div>
                <div className="mt-2 text-[10px] font-bold text-ink/42">
                  可选补充：{diagnosisTankSummary.missing.join(' / ')}
                </div>
              </section>

              {careDiagnosisContext && (
                <section className="rounded-[18px] border border-emerald-100 bg-emerald-50 p-3 shadow-sm">
                  <div className="text-[12px] font-black text-emerald-800">来自养护百科：{careDiagnosisContext.title}</div>
                  <p className="mt-1 text-[11px] font-medium leading-relaxed text-emerald-900/70">
                    已帮你带入问题入口。具体处理建议会在完成问答并点击“一键诊断”后生成。
                  </p>
                </section>
              )}

              {diagnosisMode === 'home' && (
                <>
                  {recentDiagnosisRecords.length > 0 && (
                    <section className="grid gap-2 rounded-[18px] bg-white p-3 shadow-sm">
                      <div className="text-[13px] font-black text-ink">最近诊断记录</div>
                      {recentDiagnosisRecords.map(record => (
                        <button
                          key={record.diagnosisId}
                          type="button"
                          onClick={() => {
                            setSelectedDiagnosisRecord(record);
                            setDiagnosisMode('history');
                          }}
                          className="rounded-[14px] bg-bg px-3 py-2 text-left"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12px] font-black text-ink">{format(new Date(record.createdAt), 'yyyy/MM/dd')} {record.problemType}</span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-ink/55">{record.riskLevel}</span>
                          </div>
                          <div className="mt-1 line-clamp-1 text-[11px] font-medium text-ink/55">{record.resultSummary}</div>
                        </button>
                      ))}
                    </section>
                  )}

                  <section className="grid gap-2 rounded-[18px] bg-white p-3 shadow-sm">
                    <div>
                      <div className="text-[13px] font-black text-ink">选择问题类型</div>
                      <p className="mt-0.5 text-[11px] font-medium text-ink/50">点击后进入逐题测试，每次只回答一道题。</p>
                    </div>
                    <div className="grid gap-2">
                      {diagnosisIssueTypes.map(type => {
                        const count = getEstimatedQuestionCount(type.id);
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => handleStartDiagnosisQuiz(type.id)}
                            className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-[16px] bg-bg p-3 text-left transition-colors hover:bg-emerald-50"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-700">{type.icon}</span>
                            <span className="min-w-0">
                              <span className="block text-[13px] font-black text-ink">{type.label}</span>
                              <span className="mt-0.5 line-clamp-1 block text-[10px] font-medium text-ink/48">{type.description}</span>
                            </span>
                            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-ink/45">预计 {count} 题</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </>
              )}

              {diagnosisMode === 'quiz' && activeDiagnosisQuestion && (
                <section className="grid gap-2 rounded-[18px] bg-white p-3 shadow-sm">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[13px] font-black text-ink">{diagnosisIssueType}</div>
                      <div className="text-[11px] font-black text-ink/45">第 {diagnosisQuestionIndex + 1} / {activeDiagnosisQuestions.length} 题</div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
                      <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${diagnosisProgressPercent}%` }} />
                    </div>
                  </div>
                  <div className="rounded-[16px] bg-bg p-3">
                    <div className="text-[16px] font-black leading-relaxed text-ink">{activeDiagnosisQuestion.question}</div>
                    {activeDiagnosisQuestion.id === 'optionalTestData' && (
                      <div className="mt-2 rounded-[12px] bg-blue-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-blue-800">
                        没有也没关系，系统会先根据观察到的现象给出初步判断。
                      </div>
                    )}
                    <div className="mt-3 grid gap-2">
                      {activeDiagnosisQuestion.options.map(option => {
                        const selected = currentDiagnosisAnswer === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleDiagnosisAnswer(activeDiagnosisQuestion.id, option)}
                            className={`rounded-[14px] border px-3 py-3 text-left text-[13px] font-black transition-colors ${
                              selected ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-transparent bg-white text-ink/65 hover:border-emerald-100'
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                    {activeDiagnosisQuestion.optionalText && (
                      <Input
                        value={currentDiagnosisAnswer === '跳过' ? '' : currentDiagnosisAnswer}
                        onChange={(event) => handleDiagnosisAnswer(activeDiagnosisQuestion.id, event.target.value)}
                        placeholder="可选：补充一句症状描述"
                        className="mt-3 h-10 rounded-[12px] bg-white text-sm"
                      />
                    )}
                    {activeDiagnosisQuestion.id === 'optionalTestData' && (
                      <div className="mt-3 grid gap-1.5 rounded-[12px] bg-white px-3 py-2 text-[10px] font-medium leading-relaxed text-ink/55">
                        <div><span className="font-black text-ink/65">pH：</span>水偏酸还是偏碱，很多鱼能适应一定范围，不需要每天测。</div>
                        <div><span className="font-black text-ink/65">氨氮：</span>鱼便、残饵腐烂后产生的有毒废物，新缸或喂多时容易升高。</div>
                        <div><span className="font-black text-ink/65">亚硝酸盐：</span>过滤系统不稳定时容易出现的有害指标，可能导致鱼浮头、趴缸。</div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {diagnosisMode === 'result' && structuredDiagnosis && (
              <>
              <section className="grid gap-3 rounded-[18px] bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-black text-ink">结构化诊断结果</div>
                    <p className="mt-0.5 text-[11px] font-medium text-ink/50">
                      {`基于「${diagnosisIssueType}」测试回答生成。`}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
                    structuredDiagnosis.riskLevel === 'high' ? 'bg-red-50 text-red-700' :
                    structuredDiagnosis.riskLevel === 'medium' ? 'bg-amber-50 text-amber-700' :
                    structuredDiagnosis.riskLevel === 'unknown' ? 'bg-blue-50 text-blue-700' :
                    'bg-emerald-50 text-emerald-700'
                  }`}>
                    {structuredDiagnosis.risk}
                  </span>
                </div>

                <div className={`rounded-[16px] px-3 py-3 ${
                  structuredDiagnosis.riskLevel === 'high' ? 'bg-red-50' :
                  structuredDiagnosis.riskLevel === 'medium' ? 'bg-amber-50' :
                  structuredDiagnosis.riskLevel === 'unknown' ? 'bg-blue-50' :
                  'bg-emerald-50'
                }`}>
                  <div className="text-[10px] font-black text-ink/42">诊断结论</div>
                  <div className="mt-1 text-[14px] font-black leading-relaxed text-ink">{structuredDiagnosis.verdict}</div>
                  <div className="mt-2 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-black text-ink/70">
                    当前建议：{structuredDiagnosis.currentAction}
                  </div>
                </div>

                {structuredDiagnosis.keyMetrics.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {structuredDiagnosis.keyMetrics.map(metric => (
                      <div key={`${metric.label}-${metric.value}`} className="rounded-[14px] bg-bg px-3 py-2">
                        <div className="text-[10px] font-black text-ink/38">{metric.label}</div>
                        <div className="mt-1 text-[13px] font-black leading-tight text-ink">{metric.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {[
                  { title: '依据', items: structuredDiagnosis.evidence },
                  { title: '立即处理', items: structuredDiagnosis.actions },
                  { title: '暂时避免', items: structuredDiagnosis.avoid },
                  { title: '可能原因', items: structuredDiagnosis.reasons },
                  { title: '继续观察', items: structuredDiagnosis.observe },
                ].map(section => (
                  <div key={section.title} className="grid gap-1.5">
                    <div className="text-[12px] font-black text-ink">{section.title}</div>
                    <div className="grid gap-1">
                      {section.items.slice(0, 3).map(item => (
                        <div key={item} className="rounded-[12px] bg-bg px-3 py-2 text-[11px] font-medium leading-relaxed text-ink/70">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {structuredDiagnosis.missing.length > 0 && (
                  <div className="rounded-[14px] border border-blue-100 bg-blue-50 px-3 py-2">
                    <div className="text-[12px] font-black text-blue-800">可选补充</div>
                    <div className="mt-1 text-[11px] font-medium leading-relaxed text-blue-900/75">
                      如果情况没有改善，可以补充：{structuredDiagnosis.missing.join('、')}。
                    </div>
                  </div>
                )}
                {diagnosisSaveMessage && (
                  <div className="rounded-[12px] bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700">
                    {diagnosisSaveMessage}
                  </div>
                )}
              </section>

              <section className="grid gap-2 rounded-[18px] bg-white p-3 shadow-sm">
                <div>
                  <div className="text-[13px] font-black text-ink">继续补充信息</div>
                  <p className="mt-0.5 text-[11px] font-medium text-ink/50">追问会沿着当前问题继续判断，不重新复述鱼缸基础信息。</p>
                </div>
                {diagnosisFollowUps.length > 0 && (
                  <div className="grid gap-2">
                    {diagnosisFollowUps.map((item, index) => (
                      <div key={`${item.question}-${index}`} className="rounded-[14px] bg-bg p-3">
                        <div className="text-[11px] font-black text-ink">问：{item.question}</div>
                        <div className="mt-1 text-[11px] font-medium leading-relaxed text-ink/70">{item.answer}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    value={diagnosisQuestion}
                    onChange={(event) => setDiagnosisQuestion(event.target.value)}
                    placeholder="补充症状、水质数据或最近操作"
                    className="h-10 rounded-[12px] bg-bg text-sm"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleDiagnosisFollowUp();
                    }}
                  />
                  <Button onClick={handleDiagnosisFollowUp} disabled={isDiagnosing || !diagnosisQuestion.trim()} className="h-10 rounded-[12px] bg-emerald-700 px-3 text-sm font-bold text-white hover:bg-emerald-800">
                    追问
                  </Button>
                </div>
              </section>
              </>
              )}

              {diagnosisMode === 'history' && selectedDiagnosisRecord && (
                <section className="grid gap-3 rounded-[18px] bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-black text-ink">{selectedDiagnosisRecord.problemType}</div>
                      <div className="mt-0.5 text-[11px] font-medium text-ink/50">{format(new Date(selectedDiagnosisRecord.createdAt), 'yyyy/MM/dd HH:mm')}</div>
                    </div>
                    <span className="rounded-full bg-bg px-2 py-1 text-[10px] font-black text-ink/55">{selectedDiagnosisRecord.riskLevel}</span>
                  </div>
                  <div className="rounded-[14px] bg-bg px-3 py-2 text-[12px] font-black leading-relaxed text-ink">{selectedDiagnosisRecord.resultSummary}</div>
                  <div>
                    <div className="text-[12px] font-black text-ink">建议动作</div>
                    <div className="mt-1 grid gap-1">
                      {selectedDiagnosisRecord.suggestedActions.map(action => (
                        <div key={action} className="rounded-[12px] bg-bg px-3 py-2 text-[11px] font-medium text-ink/70">{action}</div>
                      ))}
                    </div>
                  </div>
                  {selectedDiagnosisRecord.followUpNotes.length > 0 && (
                    <div>
                      <div className="text-[12px] font-black text-ink">补充记录</div>
                      <div className="mt-1 grid gap-1">
                        {selectedDiagnosisRecord.followUpNotes.map(note => (
                          <div key={note} className="rounded-[12px] bg-bg px-3 py-2 text-[11px] font-medium text-ink/70">{note}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-white bg-white/95 px-4 py-3 shadow-[0_-10px_24px_rgba(27,77,62,0.08)]">
            {diagnosisMode === 'home' && <Button onClick={() => setIsDiagnosisOpen(false)} className="h-10 w-full rounded-full bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800">关闭</Button>}
            {diagnosisMode === 'quiz' && (
              <>
                <Button variant="outline" onClick={handleDiagnosisPrevious} className="h-10 rounded-full text-sm font-bold">上一题</Button>
                <Button onClick={handleDiagnosisNext} disabled={!currentDiagnosisAnswer && !activeDiagnosisQuestion?.optionalText} className="h-10 rounded-full bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800 disabled:bg-ink/15 disabled:text-ink/35">
                  {diagnosisQuestionIndex >= activeDiagnosisQuestions.length - 1 ? '一键诊断' : '下一题'}
                </Button>
              </>
            )}
            {diagnosisMode === 'result' && (
              <>
                <Button variant="outline" onClick={() => setDiagnosisMode('home')} className="h-10 rounded-full text-sm font-bold">重新诊断</Button>
                <Button onClick={handleSaveDiagnosisRecord} disabled={!structuredDiagnosis} className="h-10 rounded-full bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800 disabled:bg-ink/15 disabled:text-ink/35">保存本次诊断</Button>
              </>
            )}
            {diagnosisMode === 'history' && (
              <>
                <Button variant="outline" onClick={() => setDiagnosisMode('home')} className="h-10 rounded-full text-sm font-bold">返回</Button>
                <Button onClick={() => handleStartDiagnosisQuiz(selectedDiagnosisRecord?.problemType || '巡检')} className="h-10 rounded-full bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800">按此问题再诊断</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRiskReminderOpen} onOpenChange={setIsRiskReminderOpen}>
        <DialogContent className="flex max-h-[82dvh] w-[90vw] max-w-[430px] md:max-w-[600px] flex-col overflow-hidden rounded-[20px] border-border bg-bg p-0">
          <DialogHeader className="shrink-0 border-b border-white bg-white px-5 py-4 text-left">
            <DialogTitle className="font-serif text-xl font-bold italic text-ink">全部提醒</DialogTitle>
            <DialogDescription className="text-xs font-medium text-ink/55">
              不是所有提醒都需要立即处理，先完成最明确的一项。
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="grid gap-2">
              {riskReminders.map(task => {
                const toneClass = task.tone === 'danger'
                  ? 'border-red-100 bg-red-50 text-red-700'
                  : task.tone === 'warning'
                    ? 'border-amber-100 bg-amber-50 text-amber-700'
                    : 'border-sky-100 bg-sky-50 text-sky-700';
                const isDone = task.actionText.startsWith('已');
                return (
                  <div key={task.id} className="rounded-[16px] border border-border/70 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black ${isDone ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : toneClass}`}>
                          {isDone ? task.actionText : task.level}
                        </span>
                        <h3 className="mt-2 text-[14px] font-black leading-tight text-ink">{task.title}</h3>
                        <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-ink/58">{task.reason}</p>
                      </div>
                      <Button
                        type="button"
                        variant={isDone ? 'outline' : 'default'}
                        onClick={() => {
                          setIsRiskReminderOpen(false);
                          task.onClick();
                        }}
                        className={`h-8 shrink-0 rounded-full px-3 text-[11px] font-black shadow-none ${
                          isDone
                            ? 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : task.tone === 'danger'
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : task.tone === 'warning'
                                ? 'bg-amber-600 text-white hover:bg-amber-700'
                                : 'bg-sky-600 text-white hover:bg-sky-700'
                        }`}
                      >
                        {task.actionText}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border bg-white p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRiskReminderOpen(false)}
              className="h-10 w-full rounded-full text-sm font-bold md:w-fit md:max-w-[220px]"
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isObservationOpen} onOpenChange={setIsObservationOpen}>
        <DialogContent className="w-[90vw] max-w-[420px] overflow-hidden rounded-[20px] border-border p-0">
          <DialogHeader className="border-b border-border bg-white px-5 py-4 text-left">
            <DialogTitle className="font-serif text-xl font-bold italic text-ink">观察鱼的状态</DialogTitle>
            <DialogDescription className="text-xs font-medium text-ink/55">
              2 分钟内你看到以下情况了吗？
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 px-5 py-4 md:grid-cols-2">
            {['鱼浮在水面', '呼吸明显急促', '趴缸或躲藏', '拒食或抢食异常', '没有明显异常'].map(item => {
              const checked = observationChecks.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setObservationChecks(prev => prev.includes(item) ? prev.filter(value => value !== item) : [...prev, item])}
                  className={`flex items-center justify-between rounded-[14px] border px-3 py-3 text-left text-sm font-black transition-colors ${
                    checked ? 'border-red-100 bg-red-50 text-red-700' : 'border-border bg-bg text-ink/68'
                  }`}
                >
                  <span>{item}</span>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${checked ? 'border-red-300 bg-red-500 text-white' : 'border-ink/20 bg-white text-transparent'}`}>
                    ✓
                  </span>
                </button>
              );
            })}
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2 border-t border-border bg-white md:flex md:gap-2">
            <Button
              variant="outline"
              className="h-10 rounded-full text-sm font-bold"
              onClick={() => {
                setObservationChecks([]);
                markPriorityTask('observeBreathing', '已观察');
                const nextRecords = [
                  ...observationRecords,
                  {
                    id: Math.random().toString(36).substring(2, 9),
                    aquariumId: activeId,
                    createdAt: new Date().toISOString(),
                    type: 'observation',
                    note: '未发现明显呼吸异常',
                  },
                ];
                setObservationRecords(nextRecords);
                patchLocalAppState({ observationRecords: nextRecords }, { debounce: true });
                setTankActionMessage(`已记录观察：${format(new Date(), 'HH:mm')} 未发现明显呼吸异常`);
                setIsObservationOpen(false);
              }}
            >
              没有异常，记录观察
            </Button>
            <Button
              className="h-10 rounded-full bg-red-600 text-sm font-bold text-white hover:bg-red-700"
              onClick={() => {
                markPriorityTask('observeBreathing', '已发现异常');
                const nextRecords = [
                  ...observationRecords,
                  {
                    id: Math.random().toString(36).substring(2, 9),
                    aquariumId: activeId,
                    createdAt: new Date().toISOString(),
                    type: 'observation',
                    note: observationChecks.length > 0 ? observationChecks.join('、') : '发现异常',
                  },
                ];
                setObservationRecords(nextRecords);
                patchLocalAppState({ observationRecords: nextRecords }, { debounce: true });
                setTankActionMessage('已记录呼吸异常，建议继续完成鱼只异常诊断。');
                setIsObservationOpen(false);
                handleOpenDiagnosisWithType('鱼只异常');
              }}
            >
              发现异常，去诊断
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Fish Dialog (Search Based) */}
              <Dialog open={isAddFishOpen} onOpenChange={(open) => {
                setIsAddFishOpen(open);
                if (!open) {
                  setFishSearchTerm('');
                  setSelectedAddFishItems([]);
                  setAddFishSuccess(null);
                  setAddFishDatePicker(null);
                  setAddFishCompatibilityReview(null);
                }
              }}>
        <DialogContent className="flex h-[88dvh] max-h-[calc(100dvh-24px)] w-[92vw] max-w-[520px] flex-col overflow-hidden rounded-[20px] border-border bg-bg p-0">
          <DialogHeader className="shrink-0 border-b border-white px-4 pb-3 pt-4">
            <DialogTitle className="text-xl font-black text-ink">添加生物到鱼缸</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-ink/60">
              先选择生物，再填写数量和入缸日期。
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="grid gap-4 p-4 pb-24">
              {addFishSuccess ? (
                <div className="grid gap-4 rounded-[22px] border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
                      <CheckCircle2 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-lg font-black text-emerald-800">已添加到当前鱼缸</div>
                      <p className="mt-1 text-[12px] font-bold leading-relaxed text-emerald-900/70">
                        已加入 {addFishSuccess.aquariumName}，你可以回到鱼缸查看，也可以继续添加其他生物。
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    {addFishSuccess.items.map(item => (
                      <div key={item.fishId} className="grid grid-cols-[44px_1fr] gap-3 rounded-[16px] bg-white/82 p-2 shadow-sm">
                        <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[14px] bg-[#FBFAF6]">
                          {item.image && <img src={item.image} alt={item.name} className="h-full w-full object-contain p-1" referrerPolicy="no-referrer" />}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-ink">{item.name} x {item.quantity}</div>
                          <div className="mt-0.5 text-[11px] font-bold text-ink/48">入缸日期：{formatAddFishDateLabel(item.entryDate)}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" onClick={handleViewTankAfterAdd} className="h-11 rounded-full bg-white text-sm font-black">
                      查看我的鱼缸
                    </Button>
                    <Button type="button" onClick={handleContinueAddFish} className="h-11 rounded-full bg-emerald-700 text-sm font-black text-white hover:bg-emerald-800">
                      继续添加
                    </Button>
                  </div>
                </div>
              ) : (
                <>

              <section className="grid gap-3 rounded-[18px] bg-white p-3 shadow-sm">
                <div>
                  <div className="text-[13px] font-black text-ink">第 1 步：选择生物</div>
                  <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-ink/50">{addFishIntro}</p>
                </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
                <Input 
                  placeholder="搜索鱼、虾、螺或学名" 
                  className="h-10 rounded-[14px] border-border bg-bg pl-9 text-sm font-medium text-ink"
                  value={fishSearchTerm}
                          onChange={(e) => {
                            setFishSearchTerm(e.target.value);
                            setAddFishSuccess(null);
                            setAddFishDatePicker(null);
                            setAddFishCompatibilityReview(null);
                          }}
                />
              </div>

                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-black text-ink/55">{fishSearchTerm.trim() ? '搜索结果' : '智能推荐'}</div>
                  {!fishSearchTerm.trim() && <span className="text-[10px] font-bold text-ink/35">基于当前鱼缸</span>}
                </div>

                <div className="grid max-h-[300px] gap-2 overflow-y-auto pr-1">
                  {addFishList.map(fish => {
                    const isSelected = selectedAddFishItems.some(item => item.fishId === fish.id);
                    return (
                    <button
                      key={fish.id}
                      onClick={() => toggleSelectedAddFish(fish)}
                      className={`grid grid-cols-[54px_1fr] gap-3 rounded-[16px] border p-2 text-left transition-colors ${
                        isSelected ? 'border-emerald-300 bg-emerald-50 shadow-sm' : 'border-transparent bg-bg/70 hover:border-emerald-200 hover:bg-white'
                      }`}
                    >
                      <span className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-[14px] ${getSpeciesImageSurfaceClass(fish)}`}>
                        <img src={getSpeciesDisplayImage(fish)} alt={fish.name} className={`h-full w-full object-contain p-1 ${getSpeciesImageClass(fish)}`} referrerPolicy="no-referrer" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-black text-ink">{fish.name}</span>
                            <span className="block truncate text-[10px] font-medium text-ink/45">{fish.scientificName || fish.category}</span>
                          </span>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${
                            isSelected ? 'bg-emerald-600 text-white' : 'bg-white text-ink/45'
                          }`}>
                            {isSelected ? '已选择' : '选择'}
                          </span>
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          {getAddFishTags(fish).map(tag => (
                            <span key={tag} className="rounded-full bg-white px-2 py-0.5 text-[9px] font-black text-emerald-700">{tag}</span>
                          ))}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-[10px] font-medium leading-relaxed text-ink/55">
                          {getAddFishReason(fish)}
                        </span>
                      </span>
                    </button>
                    );
                  })}
                  {fishSearchTerm.trim() && searchResults.length === 0 && (
                    <div className="rounded-[14px] bg-bg px-3 py-5 text-center text-xs font-medium text-ink/50">没有找到相关生物</div>
                  )}
                  {!fishSearchTerm.trim() && recommendedFishes.length === 0 && (
                    <div className="rounded-[14px] bg-amber-50 p-3 text-xs font-medium leading-relaxed text-amber-800">
                      {noRecommendationHint}
                    </div>
                  )}
                </div>
              </section>

              <section className={`grid gap-3 rounded-[18px] bg-white p-3 shadow-sm ${selectedAddSpeciesCount > 0 ? '' : 'opacity-80'}`}>
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[13px] font-black text-ink">第 2 步：确认已选生物</div>
                    {selectedAddSpeciesCount > 0 && (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
                        已选择 {selectedAddSpeciesCount} 种
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-ink/50">
                    {selectedAddSpeciesCount > 0 ? '确认每种生物的数量和入缸日期后再添加。' : '还没有选择生物，请先从上方搜索或推荐中选择。'}
                  </p>
                </div>

                {selectedAddSpeciesCount > 0 ? (
                  <>
                    <div className="grid gap-2">
                      {selectedAddFishDetails.map(item => {
                        const isDatePickerOpen = addFishDatePicker?.fishId === item.fishId;
                        const datePickerMonth = isDatePickerOpen ? addFishDatePicker.month : new Date(item.entryDate);
                        const monthStartOffset = getDay(startOfMonth(datePickerMonth));
                        return (
                        <div key={item.fishId} className="grid gap-3 rounded-[16px] bg-bg p-2">
                          <div className="grid grid-cols-[46px_1fr_auto] gap-2">
                            <span className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-[14px] ${getSpeciesImageSurfaceClass(item.fish)}`}>
                              <img src={getSpeciesDisplayImage(item.fish)} alt={item.fish.name} className={`h-full w-full object-contain p-1 ${getSpeciesImageClass(item.fish)}`} referrerPolicy="no-referrer" />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black text-ink">{item.fish.name}</div>
                              <div className="mt-0.5 truncate text-[10px] font-medium text-ink/45">{item.fish.category}</div>
                              <div className="mt-1 text-[10px] font-bold text-emerald-700">建议先少量加入，观察 3-7 天。</div>
                            </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAddFishCompatibilityReview(null);
                                        setSelectedAddFishItems(prev => prev.filter(selected => selected.fishId !== item.fishId));
                                      }}
                                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-ink/45"
                              aria-label={`移除 ${item.fish.name}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="grid gap-2 md:grid-cols-[0.78fr_1.22fr]">
                            <div className="rounded-[14px] bg-white p-2">
                              <Label className="text-[10px] font-black text-ink/48">数量</Label>
                              <div className="mt-1 grid h-10 grid-cols-[34px_1fr_34px] items-center gap-1 rounded-full bg-bg p-1">
                                <button
                                  type="button"
                                  onClick={() => updateSelectedAddFishItem(item.fishId, { quantity: Math.max(1, item.quantity - 1) })}
                                  disabled={item.quantity <= 1}
                                  className="flex h-8 items-center justify-center rounded-full bg-white text-lg font-black text-ink/55 shadow-sm disabled:text-ink/18"
                                  aria-label={`减少 ${item.fish.name} 数量`}
                                >
                                  -
                                </button>
                                <div className="text-center text-[20px] font-black text-ink">{item.quantity}</div>
                                <button
                                  type="button"
                                  onClick={() => updateSelectedAddFishItem(item.fishId, { quantity: item.quantity + 1 })}
                                  className="flex h-8 items-center justify-center rounded-full bg-white text-lg font-black text-emerald-700 shadow-sm"
                                  aria-label={`增加 ${item.fish.name} 数量`}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <div className="rounded-[14px] bg-white p-2">
                              <Label className="text-[10px] font-black text-ink/48">入缸日期</Label>
                              <button
                                type="button"
                                onClick={() => setAddFishDatePicker(prev => (
                                  prev?.fishId === item.fishId
                                    ? null
                                    : { fishId: item.fishId, month: new Date(item.entryDate) }
                                ))}
                                className="mt-1 grid h-10 w-full grid-cols-[auto_1fr] items-center gap-1 rounded-full bg-bg px-3 text-left"
                              >
                                <Calendar className="h-3.5 w-3.5 text-ink/35" />
                                <span className="truncate text-center text-[12px] font-black text-ink">{formatAddFishDateLabel(item.entryDate)}</span>
                              </button>
                            </div>
                          </div>

                          {isDatePickerOpen && (
                            <div className="rounded-[16px] bg-white p-3 shadow-sm ring-1 ring-emerald-100">
                              <div className="flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => setAddFishDatePicker({ fishId: item.fishId, month: subMonths(datePickerMonth, 1) })}
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-bg text-ink/55"
                                  aria-label="上个月"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </button>
                                <div className="text-sm font-black text-ink">{format(datePickerMonth, 'yyyy年 M月')}</div>
                                <button
                                  type="button"
                                  onClick={() => setAddFishDatePicker({ fishId: item.fishId, month: addMonths(datePickerMonth, 1) })}
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-bg text-ink/55 disabled:text-ink/18"
                                  disabled={startOfMonth(addMonths(datePickerMonth, 1)) > new Date()}
                                  aria-label="下个月"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] font-black text-ink/35">
                                {['日', '一', '二', '三', '四', '五', '六'].map(day => <span key={day}>{day}</span>)}
                              </div>
                              <div className="mt-1 grid grid-cols-7 gap-1">
                                {Array.from({ length: monthStartOffset }).map((_, index) => <span key={`empty-${index}`} />)}
                                {eachDayOfInterval({ start: startOfMonth(datePickerMonth), end: endOfMonth(datePickerMonth) }).map(date => {
                                  const dateStr = format(date, 'yyyy-MM-dd');
                                  const isSelected = item.entryDate === dateStr;
                                  const isToday = isSameDay(date, new Date());
                                  const isFuture = date > new Date() && !isToday;
                                  return (
                                    <button
                                      key={dateStr}
                                      type="button"
                                      disabled={isFuture}
                                      onClick={() => {
                                        updateSelectedAddFishItem(item.fishId, { entryDate: dateStr });
                                        setAddFishDatePicker(null);
                                      }}
                                      className={`flex h-8 items-center justify-center rounded-full text-[11px] font-black ${
                                        isSelected
                                          ? 'bg-emerald-700 text-white'
                                          : isToday
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : isFuture
                                              ? 'text-ink/18'
                                              : 'bg-bg text-ink/62'
                                      }`}
                                    >
                                      {format(date, 'd')}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                      })}
                            </div>

                            {addFishCompatibilityReview && (
                              <div className={`rounded-[16px] border p-3 text-[12px] font-bold leading-relaxed ${
                                addFishCompatibilityReview.status === 'not_recommended'
                                  ? 'border-red-200 bg-red-50 text-red-800'
                                  : addFishCompatibilityReview.status === 'insufficient_data'
                                    ? 'border-sky-100 bg-sky-50 text-sky-900'
                                    : 'border-amber-100 bg-amber-50 text-amber-900'
                              }`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-[12px] font-black">添加前混养预检</div>
                                    <p className="mt-1">
                                      {addFishCompatibilityReview.status === 'not_recommended'
                                        ? '命中阻断风险，默认不能加入当前鱼缸。'
                                        : addFishCompatibilityReview.status === 'insufficient_data'
                                          ? '关键信息不足，不能显示“适合”。可先补信息，或确认后谨慎少量加入。'
                                          : '存在需要确认的混养风险，确认后才会写入鱼缸。'}
                                    </p>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-white/75 px-2 py-1 text-[10px] font-black">
                                    {getTankCompatibilityStatusLabel(addFishCompatibilityReview.status)}
                                  </span>
                                </div>
                                <div className="mt-2 grid gap-1">
                                  {addFishCompatibilityReview.evaluations.map(evaluation => (
                                    <div key={evaluation.fish.id} className="flex items-center justify-between gap-2 rounded-full bg-white/70 px-2 py-1">
                                      <span className="truncate">{evaluation.fish.name} x {evaluation.quantity}</span>
                                      <span className="shrink-0 text-[10px] font-black">{getTankCompatibilityStatusLabel(evaluation.result.status)}</span>
                                    </div>
                                  ))}
                                </div>
                                {addFishCompatibilityReview.keyRules.length > 0 && (
                                  <div className="mt-2 grid gap-1 rounded-[12px] bg-white/55 p-2">
                                    {addFishCompatibilityReview.keyRules.map(rule => (
                                      <div key={`${rule.code}-${rule.title}-${rule.evidence}`} className="text-[10px] leading-relaxed">
                                        <span className="font-black">{rule.title}</span>
                                        <span className="ml-1 opacity-75">{rule.evidence}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
        
                            <div className="rounded-[16px] border border-emerald-100 bg-emerald-50 p-3 text-[12px] font-bold leading-relaxed text-emerald-900">
                      {selectedAddSpeciesCount === 1 ? (
                        <>
                          将添加：{selectedAddFishDetails[0].fish.name} x {selectedAddFishDetails[0].quantity}
                        </>
                      ) : (
                        <>
                          将添加：{selectedAddSpeciesCount} 种生物，共 {selectedAddTotalQuantity} 只/条
                          <div className="mt-1 grid gap-0.5 text-[10px] font-bold text-emerald-900/70">
                            {selectedAddFishDetails.slice(0, 4).map(item => (
                              <span key={item.fishId}>{item.fish.name} x {item.quantity}</span>
                            ))}
                            {selectedAddFishDetails.length > 4 && <span>还有 {selectedAddFishDetails.length - 4} 种...</span>}
                          </div>
                        </>
                      )}
                      <div className="mt-1 text-[10px] font-bold text-emerald-900/65">
                        默认入缸日期为今天，可分别修改。
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-[16px] border border-dashed border-ink/12 bg-bg px-3 py-6 text-center text-[12px] font-bold text-ink/42">
                    还没有选择生物，请先从上方搜索或推荐中选择。
                  </div>
                )}
              </section>
                </>
              )}
            </div>
          </div>
                  {!addFishSuccess && (
                    <DialogFooter className="shrink-0 border-t border-white bg-white/95 px-4 py-3 shadow-[0_-10px_24px_rgba(27,77,62,0.08)]">
                      <Button
                        variant="outline"
                        className="h-10 rounded-full text-sm font-bold text-ink"
                        onClick={() => {
                          if (addFishCompatibilityReview) {
                            setAddFishCompatibilityReview(null);
                            return;
                          }
                          setIsAddFishOpen(false);
                        }}
                      >
                        {addFishCompatibilityReview ? '返回调整' : '取消'}
                      </Button>
                      <div className="grid gap-1">
                        {selectedAddSpeciesCount === 0 && <div className="text-center text-[10px] font-bold text-ink/38">从上方搜索或推荐中选择要加入鱼缸的生物</div>}
                        <Button
                          className="h-10 rounded-full bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800 disabled:bg-ink/15 disabled:text-ink/35"
                          onClick={addFishCompatibilityReview
                            ? getTankCompatibilityAddPolicy(addFishCompatibilityReview.status) === 'block'
                              ? () => setAddFishCompatibilityReview(null)
                              : handleConfirmAddFishAfterReview
                            : handleAddFish}
                          disabled={selectedAddSpeciesCount === 0}
                        >
                          {selectedAddSpeciesCount === 0
                            ? '请先选择生物'
                            : addFishCompatibilityReview
                              ? getTankCompatibilityAddPolicy(addFishCompatibilityReview.status) === 'block'
                                ? '返回调整组合'
                                : getTankCompatibilityAddPolicy(addFishCompatibilityReview.status) === 'complete_information'
                                  ? '先补充鱼缸信息'
                                  : '确认风险后加入'
                              : '确认添加到鱼缸'}
                        </Button>
                      </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isTankCopilotOpen} onOpenChange={setIsTankCopilotOpen}>
        <DialogContent className="flex max-h-[88dvh] w-[94vw] max-w-[780px] flex-col overflow-hidden rounded-[24px] border-border bg-white p-0">
          <DialogHeader className="shrink-0 border-b border-border/70 px-5 py-4 text-left">
            <DialogTitle className="flex items-center gap-2 text-xl font-black text-ink">
              <Sparkles className="h-5 w-5 text-accent" />
              AI 建缸规划
            </DialogTitle>
            <DialogDescription className="text-xs font-medium leading-relaxed text-ink/55">
              AI 理解目标，本地规则筛安全边界；不会直接改鱼缸数据。
            </DialogDescription>
          </DialogHeader>
          <div className="app-scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { step: 1, title: '说目标', note: '输入方向' },
                  { step: 2, title: '补信息', note: '最多 3 问' },
                  { step: 3, title: '看方案', note: '执行下一步' },
                ].map(item => {
                  const isActive = tankCopilotStep === item.step;
                  const isDone = tankCopilotStep > item.step;
                  return (
                    <div
                      key={item.step}
                      className={`rounded-[16px] border px-3 py-2 ${
                        isActive
                          ? 'border-accent/30 bg-emerald-50 text-accent'
                          : isDone
                            ? 'border-emerald-100 bg-white text-emerald-700'
                            : 'border-border bg-white text-ink/35'
                      }`}
                    >
                      <div className="text-xs font-black">{item.step}. {item.title}</div>
                      <div className="mt-0.5 text-[10px] font-bold opacity-75">{isDone ? '已完成' : item.note}</div>
                    </div>
                  );
                })}
              </div>

              <section className="rounded-[20px] border border-border bg-bg/70 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-black text-ink">你想建什么样的缸？</div>
                    <div className="text-[11px] font-bold text-ink/45">
                      当前参考：{activeAquarium.name} · {activeAquarium.waterType === 'Saltwater' ? '海水' : '淡水'} · {activeAquarium.targetTemperature || 25}°C
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-ink/45">
                    最多 3 步到方案
                  </span>
                </div>
                <div>
                  <Input
                    value={tankCopilotGoal}
                    onChange={(event) => {
                      setTankCopilotGoal(event.target.value);
                      setTankCopilotError('');
                    }}
                    placeholder="例如：新手小型淡水缸、低维护草缸、虾缸"
                    className="h-11 rounded-full border-border bg-white px-4 text-sm font-bold"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['新手小型淡水缸', '低维护草缸', '虾缸', '观赏鱼群游缸'].map(goal => (
                    <button
                      key={goal}
                      type="button"
                      className="rounded-full border border-border bg-white px-3 py-1.5 text-[11px] font-black text-ink/58 hover:border-accent/40 hover:text-accent"
                      onClick={() => {
                        setTankCopilotGoal(goal);
                        setTankCopilotResult(null);
                        setTankCopilotAnswers({});
                        setTankCopilotError('');
                      }}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
                {tankCopilotError && (
                  <div className="mt-3 rounded-[14px] bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                    {tankCopilotError}
                  </div>
                )}
              </section>

              {tankCopilotResult ? (
                <>
                  <section className="rounded-[20px] border border-emerald-100 bg-emerald-50/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-black text-accent">目标理解</div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${
                        tankCopilotResult.source === 'model'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {tankCopilotResult.source === 'model' ? '模型回复' : '本地模板'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold leading-relaxed text-ink">
                      {tankCopilotResult.source === 'model'
                        ? tankCopilotResult.goalUnderstanding
                        : 'AI 暂不可用，系统规则仍可使用。'}
                    </p>
                    {tankCopilotNeedsAnswers && (
                      <div className="mt-3 rounded-[16px] bg-white/85 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-black text-amber-700">第 2 步：补充关键信息</div>
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">
                            {tankCopilotMissingQuestions.length} 项
                          </span>
                        </div>
                        <div className="mt-3 grid gap-3">
                          {tankCopilotMissingQuestions.map((question, index) => (
                            <label key={question.id} className="grid gap-1.5">
                              <span className="text-[11px] font-black text-ink/60">
                                {index + 1}. {question.prompt}
                              </span>
                              <Input
                                value={tankCopilotAnswers[question.id] || ''}
                                onChange={(event) => {
                                  const nextValue = event.target.value;
                                  setTankCopilotAnswers(prev => ({
                                    ...prev,
                                    [question.id]: nextValue,
                                  }));
                                }}
                                placeholder="不知道也可以写“不确定”"
                                className="h-10 rounded-full border-border bg-white px-3 text-xs font-bold"
                              />
                            </label>
                          ))}
                        </div>
                        <p className="mt-3 text-[11px] font-bold leading-relaxed text-ink/45">
                          补完后重新生成，方案会更贴近你的鱼缸；不会直接修改真实鱼缸。
                        </p>
                      </div>
                    )}
                  </section>

                  {!tankCopilotNeedsAnswers && Boolean(tankCopilotResult.planSummary?.trim()) && (
                    <section className="rounded-[20px] border border-border bg-white p-4">
                      <div className="text-sm font-black text-ink">推荐方向</div>
                      <div className="mt-3 rounded-[14px] bg-bg px-3 py-2 text-xs font-bold leading-relaxed text-ink/65">
                        {tankCopilotResult.planSummary}
                      </div>
                    </section>
                  )}

                  {!tankCopilotNeedsAnswers && tankCopilotAllowedCandidates.length > 0 && (
                    <section className="rounded-[20px] border border-border bg-white p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-black text-ink">候选生物</div>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                          本地规则允许
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {tankCopilotAllowedCandidates.map(candidate => (
                          <div key={candidate.speciesId} className="rounded-[16px] bg-bg p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="truncate text-sm font-black text-ink">{candidate.name}</div>
                              {candidate.recommendedQuantity > 0 && (
                                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-accent">
                                  x{candidate.recommendedQuantity}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-relaxed text-ink/50">
                              {candidate.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {!tankCopilotNeedsAnswers && tankCopilotResult.selectedCandidateIds.length > 0 && tankCopilotAllowedCandidates.length === 0 && (
                    <section className="rounded-[20px] border border-amber-100 bg-amber-50/70 p-4">
                      <div className="text-sm font-black text-amber-800">暂无可执行候选</div>
                      <p className="mt-2 text-xs font-bold leading-relaxed text-amber-700">
                        模型或模板给出的候选没有通过本地规则候选池校验。请重新描述目标，或先完善鱼缸信息。
                      </p>
                    </section>
                  )}

                  {!tankCopilotNeedsAnswers && tankCopilotHiddenCandidateCount > 0 && (
                    <div className="rounded-[16px] border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700">
                      已隐藏 {tankCopilotHiddenCandidateCount} 个未通过本地规则候选池校验的候选。
                    </div>
                  )}

                  {!tankCopilotNeedsAnswers && (
                  <section className="rounded-[20px] border border-border bg-white p-4">
                    <div className="text-sm font-black text-ink">下一步动作</div>
                    <div className="mt-3 rounded-[16px] bg-emerald-50 px-3 py-3">
                      <div className="text-xs font-black text-emerald-700">建议先做</div>
                      <div className="mt-1 text-sm font-black text-ink">{tankCopilotActionView.label}</div>
                      <div className="mt-1 text-[11px] font-bold leading-relaxed text-ink/55">
                        {tankCopilotActionView.description}
                      </div>
                    </div>
                    {tankCopilotResult.blockedExplanation.length > 0 && (
                      <details className="mt-3 rounded-[14px] bg-rose-50/70 px-3 py-2 text-xs font-bold text-rose-700">
                        <summary className="cursor-pointer">查看不建议方向</summary>
                        <div className="mt-2 grid gap-1.5">
                          {tankCopilotResult.blockedExplanation.map(reason => (
                            <div key={reason}>• {reason}</div>
                          ))}
                        </div>
                      </details>
                    )}
                  </section>
                  )}
                </>
              ) : (
                <section className="rounded-[20px] border border-dashed border-border bg-white p-5 text-center">
                  <div className="text-sm font-black text-ink">还没有生成方案</div>
                  <p className="mt-2 text-xs font-bold leading-relaxed text-ink/45">
                    输入一个目标后，系统会先用本地规则筛掉不安全方向，再让 AI 组织成可执行方案。
                  </p>
                </section>
              )}

              <div className="rounded-[16px] bg-bg px-4 py-3 text-[11px] font-bold leading-relaxed text-ink/45">
                系统结论由规则生成，AI 负责理解目标、解释方案和生成行动建议。
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border/70 px-5 pb-5 pt-4 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full px-6 text-sm font-black"
              onClick={() => setIsTankCopilotOpen(false)}
            >
              关闭
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full bg-accent px-6 text-sm font-black text-white"
              disabled={isTankCopilotPrimaryDisabled}
              onClick={handleTankCopilotPrimaryAction}
              title={tankCopilotNeedsAnswers && !tankCopilotHasAnswer ? '先补充至少一项信息' : undefined}
            >
              {tankCopilotPrimaryLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSmartRecommendOpen} onOpenChange={(open) => {
        setIsSmartRecommendOpen(open);
        if (!open) {
          setSmartSimulation(null);
          setSmartCandidateScopeIds(null);
        }
      }}>
        <DialogContent className="flex max-h-[88dvh] w-[94vw] max-w-[920px] flex-col overflow-hidden rounded-[24px] border-border bg-white p-0">
          <DialogHeader className="shrink-0 border-b border-border/70 px-5 py-4 text-left">
            <DialogTitle className="flex items-center gap-2 text-xl font-black text-ink">
              <Sparkles className="h-5 w-5 text-accent" />
              缸内生物智能推荐
            </DialogTitle>
            <DialogDescription className="text-xs font-medium leading-relaxed text-ink/55">
              系统规则先筛安全边界，AI 只做解释和排序辅助。
            </DialogDescription>
          </DialogHeader>
          <div className="app-scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="grid gap-4">
              <div className="grid gap-2 rounded-[20px] bg-bg p-2 sm:grid-cols-2">
                {[
                  { id: 'existing_livestock' as RecommendationMode, title: '已有生物推荐', desc: '基于当前缸内生物补充' },
                  { id: 'empty_tank' as RecommendationMode, title: '空缸搭配', desc: '生成完整组合方案' },
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      setSmartRecommendMode(mode.id);
                      setSmartSimulation(null);
                    }}
                    className={`rounded-[16px] px-4 py-3 text-left transition-colors ${
                      smartRecommendMode === mode.id ? 'bg-accent text-white shadow-sm' : 'bg-white text-ink hover:bg-white/80'
                    }`}
                  >
                    <span className="block text-sm font-black">{mode.title}</span>
                    <span className={`mt-1 block text-[11px] font-bold ${smartRecommendMode === mode.id ? 'text-white/68' : 'text-ink/45'}`}>{mode.desc}</span>
                  </button>
                ))}
              </div>

              <div className="grid gap-3 rounded-[20px] border border-emerald-100 bg-emerald-50/60 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="text-sm font-black text-ink">当前鱼缸画像</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black">
                    <span className="rounded-full bg-white px-2.5 py-1 text-accent">负载 {smartRecommendation.profile.load.loadRate}%</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-ink/58">剩余 {smartRecommendation.profile.load.remainingCapacity} 负载</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-ink/58">已有 {smartRecommendation.profile.livestock.length} 种活体</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-ink/58">可补水层 {smartRecommendation.profile.availableNiches.length || 0} 个</span>
                  </div>
                </div>
                <div className="rounded-[16px] bg-white px-4 py-3 text-[12px] font-bold text-ink/62">
                  {smartRecommendation.localSummary}
                </div>
              </div>

              <div className="grid gap-2 rounded-[18px] border border-border/70 bg-white p-3">
                <Label className="text-[12px] font-black text-ink">偏好关键词</Label>
                <div className="flex flex-wrap gap-2">
                  {['新手友好', '低维护', '群游', '清洁工具', '草缸友好'].map(keyword => (
                    <button
                      key={keyword}
                      type="button"
                      onClick={() => setSmartPreference(prev => prev.includes(keyword) ? prev.replace(keyword, '').trim() : `${prev} ${keyword}`.trim())}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-black ${
                        smartPreference.includes(keyword) ? 'border-accent bg-emerald-50 text-accent' : 'border-border bg-white text-ink/55'
                      }`}
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
                <Input
                  value={smartPreference}
                  onChange={event => setSmartPreference(event.target.value)}
                  className="h-10 rounded-full bg-bg text-sm font-bold"
                  placeholder="例如：想要低维护、颜色明显、适合新手"
                />
              </div>

              {smartRecommendation.needsMoreInfo && (
                <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                  推荐前建议先补充：{smartRecommendation.infoRequests.join('、')}。
                </div>
              )}

              {!smartCandidateScope && smartRecommendation.mode === 'empty_tank' && smartRecommendation.emptyPlans.length > 0 && (
                <section className="grid gap-3">
                  <div className="text-sm font-black text-ink">空缸组合方案</div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {smartRecommendation.emptyPlans.map(plan => (
                      <div key={plan.id} className="rounded-[20px] border border-border/70 bg-bg/45 p-4">
                        <div className="text-base font-black text-ink">{plan.name}</div>
                        <div className="mt-1 text-[11px] font-bold text-ink/50">{plan.audience}</div>
                        <div className="mt-3 space-y-1.5">
                          {plan.species.map(item => (
                            <div key={item.speciesId} className="flex justify-between rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-ink/62">
                              <span>{item.name}</span>
                              <span>x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 text-[11px] font-bold text-ink/50">预计负载 {plan.estimatedLoadRate}% · 维护 {plan.maintenanceLevel}</div>
                        <Button
                          type="button"
                          className="mt-3 h-9 w-full rounded-full bg-accent text-xs font-black text-white"
                          onClick={() => {
                            const first = plan.species[0];
                            const candidate = [...smartRecommendation.direct, ...smartRecommendation.adjustable].find(item => item.speciesId === first.speciesId);
                            if (candidate) openSmartSimulation({ ...candidate, recommendedQuantity: first.quantity });
                          }}
                        >
                          加入模拟鱼缸
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(smartCandidateScope || smartRecommendation.mode === 'existing_livestock') && (
                <section className="grid gap-4">
                  {[
                    { title: '可以直接加入', items: visibleSmartDirect, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
                    { title: '调整后可以加入', items: visibleSmartAdjustable, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
                    { title: '不建议加入', items: visibleSmartBlocked, tone: 'text-rose-700 bg-rose-50 border-rose-100' },
                  ].map(group => (
                    <div key={group.title} className="grid gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-black text-ink">{group.title}</h4>
                        <span className="text-[11px] font-black text-ink/38">{group.items.length} 个</span>
                      </div>
                      {group.items.length === 0 ? (
                        <div className="rounded-[16px] border border-dashed border-border bg-bg/50 px-4 py-3 text-xs font-bold text-ink/45">
                          暂无候选。
                        </div>
                      ) : (
                        <div className="grid gap-2 md:grid-cols-2">
                          {group.items.map(candidate => {
                            const fish = fishData.find(item => item.id === candidate.speciesId);
                            return (
                              <button
                                key={candidate.speciesId}
                                type="button"
                                disabled={candidate.status === 'blocked'}
                                onClick={() => openSmartSimulation(candidate)}
                                className="grid grid-cols-[64px_1fr] gap-3 rounded-[18px] border border-border/70 bg-white p-3 text-left shadow-sm transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                <span className={`flex h-16 w-16 items-center justify-center rounded-[16px] ${fish ? getSpeciesImageSurfaceClass(fish) : 'bg-bg'}`}>
                                  {fish && <img src={getSpeciesDisplayImage(fish)} alt={candidate.name} className={`max-h-14 max-w-14 object-contain ${getSpeciesImageClass(fish)}`} referrerPolicy="no-referrer" />}
                                </span>
                                <span className="min-w-0">
                                  <span className="flex items-center justify-between gap-2">
                                    <span className="truncate text-sm font-black text-ink">{candidate.name}</span>
                                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${group.tone}`}>
                                      {candidate.status === 'direct' ? '可加入' : candidate.status === 'adjustable' ? '需调整' : '不建议'}
                                    </span>
                                  </span>
                                  <span className="mt-1 block text-[11px] font-bold text-ink/52">建议 x{candidate.recommendedQuantity} · 适配 {candidate.fitScore}</span>
                                  <span className="mt-1 line-clamp-2 block text-[11px] font-medium leading-relaxed text-ink/55">{candidate.reason}</span>
                                  {(candidate.risks[0] || candidate.requiredAdjustments[0]) && (
                                    <span className="mt-1 block truncate text-[10px] font-black text-amber-700">
                                      {candidate.risks[0] || candidate.requiredAdjustments[0]}
                                    </span>
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </section>
              )}

              {!smartCandidateScope && smartRecommendation.blockedSummary.length > 0 && (
                <div className="rounded-[18px] border border-rose-100 bg-rose-50 p-4 text-xs font-bold leading-relaxed text-rose-700">
                  {smartRecommendation.blockedSummary.slice(0, 3).map(item => <div key={item}>• {item}</div>)}
                </div>
              )}

              {smartSimulation && (
                <div className="rounded-[22px] border border-accent/20 bg-emerald-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-ink">模拟添加：{smartSimulation.candidate.name}</div>
                      <div className="mt-1 text-[11px] font-bold text-ink/55">{smartSimulation.conclusion}</div>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-white px-2 py-1">
                      <button type="button" onClick={() => updateSmartSimulationQuantity(smartAddQuantity - 1)} className="h-7 w-7 rounded-full bg-bg text-sm font-black">-</button>
                      <span className="min-w-8 text-center text-sm font-black">{smartAddQuantity}</span>
                      <button type="button" onClick={() => updateSmartSimulationQuantity(smartAddQuantity + 1)} className="h-7 w-7 rounded-full bg-emerald-50 text-sm font-black text-accent">+</button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-[16px] bg-white px-3 py-2">
                      <div className="text-[10px] font-black text-ink/38">添加前负载</div>
                      <div className="text-xl font-black text-ink">{smartSimulation.beforeLoadRate}%</div>
                    </div>
                    <div className="rounded-[16px] bg-white px-3 py-2">
                      <div className="text-[10px] font-black text-ink/38">添加后负载</div>
                      <div className="text-xl font-black text-accent">{smartSimulation.afterLoadRate}%</div>
                    </div>
                    <div className="rounded-[16px] bg-white px-3 py-2">
                      <div className="text-[10px] font-black text-ink/38">设备支持</div>
                      <div className="text-sm font-black text-ink">{smartSimulation.equipmentStillFits ? '仍满足' : '需确认'}</div>
                    </div>
                  </div>
                  {smartSimulation.newRisks.length > 0 && (
                    <div className="mt-3 rounded-[16px] bg-white px-3 py-2 text-[11px] font-bold text-amber-700">
                      {smartSimulation.newRisks.slice(0, 3).join(' / ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border/70 bg-white px-6 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4">
            {smartSimulation ? (
              <div className="grid w-full gap-2 sm:grid-cols-[1fr_1fr]">
                <Button type="button" variant="outline" onClick={() => setSmartSimulation(null)} className="h-11 rounded-full text-sm font-black">
                  取消模拟
                </Button>
                <Button type="button" onClick={confirmSmartSimulationAdd} className="h-11 rounded-full bg-accent text-sm font-black text-white">
                  确认加入当前鱼缸
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => setIsSmartRecommendOpen(false)} className="ml-auto h-11 rounded-full px-6 text-sm font-black">
                关闭
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCalendarOpen} onOpenChange={(open) => {
        setIsCalendarOpen(open);
        if (open) {
          setSelectedWaterChangeDate(format(new Date(), 'yyyy-MM-dd'));
          setWaterChangeFeedback('');
        }
      }}>
        <DialogContent className="flex h-[86dvh] max-h-[calc(100dvh-24px)] w-[92vw] max-w-[430px] md:max-w-[600px] flex-col overflow-hidden rounded-[20px] border-border bg-bg p-0">
          <DialogHeader className="shrink-0 border-b border-white px-4 pb-3 pt-4">
            <DialogTitle className="text-xl font-black text-ink">换水记录</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-ink/60">
              记录换水日期，系统会据此更新下次提醒。
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="grid gap-4 p-4 pb-6">
              <section className="rounded-[18px] bg-white p-3 shadow-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[14px] bg-bg px-3 py-2">
                    <div className="text-[10px] font-black text-ink/42">最近换水</div>
                    <div className="mt-1 text-[12px] font-black text-ink">{latestWaterChangeDate ? format(new Date(latestWaterChangeDate), 'yyyy/MM/dd') : '暂无记录'}</div>
                  </div>
                  <div className="rounded-[14px] bg-bg px-3 py-2">
                    <div className="text-[10px] font-black text-ink/42">下次建议</div>
                    <div className="mt-1 text-[12px] font-black text-ink">{nextSuggestedWaterChangeDate}</div>
                  </div>
                  <div className="rounded-[14px] bg-bg px-3 py-2">
                    <div className="text-[10px] font-black text-ink/42">周期</div>
                    <div className="mt-1 text-[12px] font-black text-ink">约 {shortestCycle} 天</div>
                  </div>
                  <div className={`rounded-[14px] px-3 py-2 ${waterChangedToday ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                    <div className="text-[10px] font-black opacity-60">今日状态</div>
                    <div className="mt-1 text-[12px] font-black">{waterChangedToday ? '今天已记录' : '今天未记录'}</div>
                  </div>
                </div>
                {waterChangeFeedback && (
                  <div className="mt-3 rounded-[14px] bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
                    {waterChangeFeedback}
                  </div>
                )}
              </section>

              <section className="rounded-[18px] bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-center">
                    <div className="text-sm font-black text-ink">{format(calendarMonth, 'yyyy年 MM月')}</div>
                    <button type="button" onClick={() => setCalendarMonth(new Date())} className="mt-0.5 text-[10px] font-bold text-accent">
                      回到今天
                    </button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mb-3 rounded-[14px] bg-sky-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-sky-800">
                  点击日期先选中，再用底部按钮记录或取消该日换水。
                </div>
                <div className="mb-2 grid grid-cols-7 gap-1 text-center">
                  {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                    <div key={d} className="text-[10px] font-bold text-ink/45">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: getDay(startOfMonth(calendarMonth)) }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-9" />
                  ))}
                  {eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) }).map(date => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const isChanged = waterChangeHistory.includes(dateStr);
                    const isToday = isSameDay(date, new Date());
                    const isSelected = selectedWaterChangeDate === dateStr;
                    const isFuture = date > new Date() && !isToday;
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => {
                          setSelectedWaterChangeDate(dateStr);
                          setWaterChangeFeedback('');
                        }}
                        className={`relative flex h-9 items-center justify-center rounded-full text-xs font-black transition-colors ${
                          isChanged ? 'bg-emerald-700 text-white' :
                          isSelected ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-300' :
                          isToday ? 'border border-emerald-500 text-emerald-700' :
                          isFuture ? 'text-ink/25 hover:bg-bg' :
                          'text-ink hover:bg-bg'
                        }`}
                      >
                        {format(date, 'd')}
                        {isChanged && <Droplets className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 opacity-70" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-white bg-white/90 px-4 py-3">
            <Button variant="outline" className="h-10 rounded-full text-sm font-bold" onClick={() => setIsCalendarOpen(false)}>
              {selectedWaterDateHasRecord ? '关闭' : '取消'}
            </Button>
            <Button
              className={`h-10 rounded-full text-sm font-bold text-white ${selectedWaterDateHasRecord ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-700 hover:bg-emerald-800'}`}
              onClick={() => {
                const wasRecorded = selectedWaterDateHasRecord;
                handleToggleWaterChangeDate(selectedWaterChangeDate);
                setWaterChangeFeedback(wasRecorded
                  ? `已取消 ${format(new Date(selectedWaterChangeDate), 'yyyy/MM/dd')} 的换水记录。`
                  : `已记录换水，下次建议约 ${shortestCycle} 天后。`
                );
              }}
            >
              {selectedWaterDateHasRecord ? '取消这天记录' : '记录这天换水'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tank Build Plan Modal */}
      <Dialog open={isBuildPlanOpen} onOpenChange={setIsBuildPlanOpen}>
        <DialogContent className="flex h-[90dvh] max-h-[calc(100dvh-24px)] w-[94vw] max-w-[620px] flex-col overflow-hidden rounded-[20px] border-border bg-bg p-0">
          <DialogHeader className="shrink-0 border-b border-white px-4 pb-3 pt-4">
            <DialogTitle className="flex items-center gap-2 text-xl font-black text-ink">
              <Layers3 className="h-5 w-5 text-emerald-700" />
              鱼缸搭建方案
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-ink/60">
              方案会先根据当前鱼缸水量、长度、已有生物和设备生成安全适配版，再允许应用。
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="grid gap-4 p-4 pb-6">
              <div className="grid grid-cols-5 gap-1.5">
                {['新手', '草缸', '虾缸', '低维护', '进阶'].map(filter => (
                  <span key={filter} className="rounded-full bg-white px-2 py-1 text-center text-[11px] font-black text-ink/55 shadow-sm">
                    {filter}
                  </span>
                ))}
              </div>

              <section className="grid gap-2 rounded-[18px] bg-white p-3 shadow-sm">
                <div>
                  <div className="text-[13px] font-black text-ink">先选择方案名称</div>
                  <p className="mt-0.5 text-[11px] font-medium text-ink/45">选中方案后，下方会展示这个鱼缸的图片、尺寸、环境、造景和生物组合。</p>
                </div>
                <div className="grid gap-2">
                  {adaptedBuildPlans.map(plan => {
                    const template = plan.template;
                    const isSelected = selectedBuildTemplate.id === template.id;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedBuildTemplateId(template.id)}
                        className={`flex items-center justify-between gap-3 rounded-[14px] border px-3 py-2 text-left transition-colors ${
                          isSelected
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm'
                            : 'border-border/70 bg-bg/60 text-ink hover:border-emerald-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-black">{template.name}</div>
                          <div className="mt-0.5 truncate text-[10px] font-bold opacity-55">
                            当前 {plan.currentVolumeLiters}L / {plan.currentLengthCm || '未设长度'}cm · 要求 {template.minVolumeLiters}L+ / {template.minLengthCm}cm+
                          </div>
                          <div className="mt-1 line-clamp-1 text-[10px] font-bold opacity-70">
                            {plan.coreConfigSummary} · {plan.livestockSummary}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${plan.statusTone}`}>
                            {plan.statusLabel}
                          </span>
                          {isSelected && <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-black text-white">已选</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="overflow-hidden rounded-[20px] bg-white shadow-sm">
                <div className="relative aspect-[16/9] overflow-hidden" style={{ background: selectedBuildTemplate.visualGradient }}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.72),transparent_28%),linear-gradient(to_top,rgba(0,0,0,0.36),transparent_64%)]" />
                  <div className="absolute inset-x-4 top-6 flex items-end justify-center gap-3">
                    {getTemplateVisualImages(selectedBuildTemplate).slice(0, 5).map((src, index) => (
                      <span key={`${src}-detail-${index}`} className="flex h-20 w-20 items-end justify-center rounded-full bg-white/16 backdrop-blur-[1px]">
                        <img src={src} alt="" className="max-h-20 max-w-full object-contain drop-shadow-[0_12px_16px_rgba(0,0,0,0.2)]" referrerPolicy="no-referrer" />
                      </span>
                    ))}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {selectedBuildTemplate.benefitTags.map(tag => (
                        <span key={tag} className="rounded-full bg-white/84 px-2.5 py-1 text-[10px] font-black text-emerald-800 backdrop-blur-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-[19px] font-black leading-tight text-white drop-shadow-sm">{selectedBuildTemplate.name}</h3>
                        <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-white/82">{selectedBuildTemplate.tagline}</p>
                      </div>
                      <TagPill tone={selectedBuildTemplate.difficulty === '新手' ? 'normal' : 'warning'}>{selectedBuildTemplate.difficulty}</TagPill>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 p-3">
                  {[
                    { label: '适配状态', value: selectedAdaptedBuildPlan.statusLabel },
                    { label: '当前鱼缸', value: `${selectedAdaptedBuildPlan.currentVolumeLiters}L · ${selectedAdaptedBuildPlan.currentLengthCm || '长度未设置'}cm` },
                    { label: '环境参数', value: getTemplateEnvironmentSummary(selectedBuildTemplate) },
                    { label: '适配生物', value: selectedAdaptedBuildPlan.livestockSummary },
                  ].map(item => (
                    <div key={item.label} className="rounded-[14px] bg-bg px-3 py-2">
                      <div className="text-[10px] font-black text-ink/42">{item.label}</div>
                      <div className="mt-1 text-[12px] font-black leading-snug text-ink">{item.value}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-3 rounded-[18px] bg-white p-3 shadow-sm">
                <div>
                  <h3 className="text-[14px] font-black text-ink">A. 当前鱼缸适配结果</h3>
                  <p className="mt-0.5 text-[11px] font-medium text-ink/50">{selectedAdaptedBuildPlan.summary}</p>
                </div>
                <div className={`grid gap-2 rounded-[16px] p-3 ${selectedAdaptedBuildPlan.status === 'unsuitable' ? 'bg-red-50' : selectedAdaptedBuildPlan.status === 'caution' ? 'bg-amber-50' : 'bg-emerald-50/70'}`}>
                  {[
                    { title: '最低要求', value: `${selectedBuildTemplate.minVolumeLiters}L+ · ${selectedBuildTemplate.minLengthCm}cm+` },
                    { title: '推荐水量', value: `${selectedBuildTemplate.recommendedVolumeLiters}L` },
                    { title: '自动修正', value: selectedAdaptedBuildPlan.autoFixes.join(' ') || '当前无需额外缩减。' },
                    { title: '应用前风险', value: selectedAdaptedBuildPlan.riskItems.join(' ') || '适配方案未发现高风险。' },
                  ].map(item => (
                    <div key={item.title} className="grid gap-0.5">
                      <div className="text-[10px] font-black text-emerald-800/55">{item.title}</div>
                      <div className="text-[12px] font-black leading-snug text-ink">{item.value}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-3 rounded-[18px] bg-white p-3 shadow-sm">
                <div>
                  <h3 className="text-[14px] font-black text-ink">B. 综合方案摘要</h3>
                  <p className="mt-0.5 text-[11px] font-medium text-ink/50">这里展示会真正应用到当前鱼缸的适配结果。</p>
                </div>
                <div className="grid gap-2 rounded-[16px] bg-emerald-50/70 p-3">
                  {[
                    { title: '基础配置', value: selectedAdaptedBuildPlan.coreConfigSummary },
                    { title: '水体环境', value: getTemplateEnvironmentSummary(selectedBuildTemplate) },
                    { title: '造景结构', value: getTemplateLayoutSummary(selectedBuildTemplate) },
                    { title: '推荐生物', value: selectedAdaptedBuildPlan.livestockSummary },
                  ].map(item => (
                    <div key={item.title} className="grid gap-0.5">
                      <div className="text-[10px] font-black text-emerald-800/55">{item.title}</div>
                      <div className="text-[12px] font-black leading-snug text-ink">{item.value}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-3 rounded-[18px] bg-white p-3 shadow-sm">
                <details>
                  <summary className="cursor-pointer list-none text-[14px] font-black text-ink">
                    C. 配置明细
                    <span className="ml-2 text-[11px] font-bold text-ink/45">点击展开</span>
                  </summary>
                  <p className="mt-1 text-[11px] font-medium text-ink/50">需要确认或微调时，再看具体底砂、水草、硬景、设备和维护提醒。</p>
                  <div className="mt-3 grid gap-3">
                {[
                  { title: '底砂', items: [selectedBuildTemplate.baseSubstrate] },
                  { title: '水草', items: selectedBuildTemplate.basePlants },
                  { title: '硬景', items: selectedBuildTemplate.baseHardscape },
                  { title: '设备', items: selectedBuildTemplate.baseEquipment },
                  { title: '生物推荐', items: selectedAdaptedBuildPlan.appliedSpecies.length > 0 ? selectedAdaptedBuildPlan.appliedSpecies.map(item => `${item.name} ${item.quantity}`) : ['当前适配方案暂不新增生物'] },
                  { title: '维护提醒', items: selectedBuildTemplate.maintenance },
                ].map(section => (
                    <div key={section.title} className="grid gap-1.5">
                      <div className="text-[12px] font-black text-ink">{section.title}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {section.items.map(item => (
                          <span key={`${section.title}-${item}`} className="rounded-full bg-bg px-2.5 py-1 text-[11px] font-bold text-ink/64">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  </div>
                </details>
                <div className="rounded-[14px] border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-amber-900">
                  <span className="font-black">主要提醒：</span>{selectedBuildTemplate.caution}
                </div>
              </section>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-white bg-white/90 px-4 py-3">
            <Button variant="outline" onClick={() => setIsBuildPlanOpen(false)} className="h-10 rounded-full text-sm font-bold">暂不应用</Button>
            <Button
              onClick={() => handleApplyBuildTemplate(selectedAdaptedBuildPlan)}
              disabled={!selectedAdaptedBuildPlan.canApply}
              className={`h-10 rounded-full text-sm font-bold text-white ${
                selectedAdaptedBuildPlan.status === 'unsuitable'
                  ? 'bg-ink/30'
                  : selectedAdaptedBuildPlan.status === 'caution'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {selectedAdaptedBuildPlan.ctaLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="flex h-[90dvh] max-h-[calc(100dvh-24px)] w-[92vw] max-w-[760px] flex-col overflow-hidden rounded-[20px] border-border bg-bg p-0">
          <DialogHeader className="shrink-0 border-b border-white px-4 pb-3 pt-4">
            <DialogTitle className="text-xl font-black text-ink">鱼缸设置</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-ink/60">
              调整尺寸、水质、设备与环境配置
            </DialogDescription>
            <div className="mt-3 grid grid-cols-2 gap-1.5 min-[390px]:grid-cols-4">
              {[
                settingsForm.waterType === 'Saltwater' ? '海水' : '淡水',
                `${settingsForm.targetTemperature || 25}°C`,
                settingsEstimatedWaterLiters > 0 ? `约 ${settingsEstimatedWaterLiters}L` : '水量未设置',
                `已配置 ${configuredSettingCount} 项`,
              ].map(item => (
                <span key={item} className="rounded-full bg-white px-2.5 py-1 text-center text-[11px] font-black text-ink/58 shadow-sm">
                  {item}
                </span>
              ))}
            </div>
          </DialogHeader>
          <div ref={settingsBodyRef} className="app-scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth">
            <div className="grid gap-5 p-4 pb-7">
              <section className="grid gap-2">
                {settingItems.map(item => {
                  const isActive = activeSettingsPanel === item.id;
                  return (
                    <div key={item.id} ref={node => { settingPanelRefs.current[item.id] = node; }} className="grid scroll-mt-4 gap-2">
                      <button
                        type="button"
                        onClick={() => openSettingsPanel(item.id)}
                        className={`flex items-center justify-between gap-3 rounded-[16px] border bg-white px-3 py-3 text-left shadow-sm transition-colors ${
                          isActive ? 'border-accent/40 ring-2 ring-accent-light' : 'border-white hover:border-accent/25'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="text-[15px] font-black text-ink">{item.title}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                              item.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {item.configured ? '已配置' : '待配置'}
                            </span>
                          </span>
                          <span className="mt-1 block truncate text-[11px] font-medium text-ink/48">{item.summary}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-[11px] font-black text-accent">
                          修改
                          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                        </span>
                      </button>
                      {isActive && (
                        <div className="pl-2">
                          {renderSettingsPanel(item.id)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>

              {false && activeSettingsPanel === 'size' && (
              <ConfigSection title="尺寸" subtitle="用于估算容量和后续养护建议。">
                <div className="grid grid-cols-3 gap-2">
                  {dimensionFields.map(item => (
                    <div key={item.key} className="grid gap-1.5">
                      <Label className="text-[11px] font-bold text-ink/55">{item.label} (cm)</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={(settingsForm.dimensions as any)?.[item.key] || ''}
                        onChange={e => setSettingsForm({
                          ...settingsForm,
                          dimensions: {
                            length: settingsForm.dimensions?.length || '',
                            width: settingsForm.dimensions?.width || '',
                            height: settingsForm.dimensions?.height || '',
                            [item.key]: e.target.value,
                          }
                        })}
                        className="h-10 rounded-[12px] bg-bg text-sm font-bold md:w-[220px]"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-[14px] bg-emerald-50/70 p-3 md:flex md:flex-wrap md:gap-2">
                  <div>
                    <div className="text-[10px] font-black text-ink/45">理论容量</div>
                    <div className="mt-1 text-2xl font-black text-ink">{settingsGrossVolumeLiters > 0 ? `${settingsGrossVolumeLiters}L` : '--'}</div>
                    <div className="text-[10px] font-medium text-ink/42">长 x 宽 x 高 / 1000</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-ink/45">估算实际水量</div>
                    <div className="mt-1 text-2xl font-black text-emerald-700">{settingsEstimatedWaterLiters > 0 ? `${settingsEstimatedWaterLiters}L` : '--'}</div>
                    <div className="text-[10px] font-medium text-ink/42">按约 85% 水位估算</div>
                  </div>
                </div>
              </ConfigSection>
              )}

              {false && activeSettingsPanel === 'parameters' && (
              <ConfigSection title="参数" subtitle="新手优先保持稳定，不要频繁大幅调整。">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'Freshwater', label: '淡水', description: '常见观赏鱼' },
                    { value: 'Saltwater', label: '海水', description: '海水生物' },
                    { value: 'Brackish', label: '汽水', description: '暂未支持', disabled: true },
                  ].map(option => (
                    <SelectableOptionCard
                      key={option.value}
                      label={option.label}
                      description={option.description}
                      selected={settingsForm.waterType === option.value}
                      disabled={option.disabled}
                      onClick={() => updateSettingsWaterType(option.value as NonNullable<Aquarium['waterType']>)}
                    />
                  ))}
                </div>
                <div className="mt-3 grid gap-1.5">
                  <Label className="text-[11px] font-bold text-ink/55">目标温度 (°C)</Label>
                  <Input
                    type="number"
                    value={settingsForm.targetTemperature || ''}
                    onChange={e => setSettingsForm({ ...settingsForm, targetTemperature: e.target.value })}
                    className="h-10 rounded-[12px] bg-bg text-sm font-bold md:w-[220px]"
                  />
                </div>
              </ConfigSection>
              )}

              {false && (activeSettingsPanel === 'substrate' || activeSettingsPanel === 'plants') && (
              <section className="overflow-hidden rounded-[22px] border border-white bg-white shadow-sm">
                <div className="border-b border-bg px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-black leading-tight text-ink">{activeSettingsPanel === 'substrate' ? '底砂 / 造景' : '水草'}</h3>
                      <p className="mt-1 text-[11px] font-medium leading-relaxed text-ink/48">{activeSettingsPanel === 'substrate' ? '底砂单选，硬景可多选' : '选择当前鱼缸里的水草种类'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeSettingsPanel === 'substrate') {
                          setIsScapeListExpanded(prev => !prev);
                        } else {
                          setIsPlantListExpanded(prev => !prev);
                        }
                      }}
                      className="shrink-0 rounded-full bg-bg px-3 py-1 text-[11px] font-bold text-accent hover:bg-accent-light"
                    >
                      {(activeSettingsPanel === 'substrate' ? isScapeListExpanded : isPlantListExpanded) ? '收起' : '查看全部'}
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-[14px] bg-bg px-3 py-2">
                      <div className="text-[10px] font-black text-ink/38">已选底砂 / 硬景</div>
                      <div className="mt-1 truncate text-[12px] font-black text-ink">{currentSubstrate}{selectedHardscapeNames.length > 0 ? ` / ${selectedHardscapeNames.join('、')}` : ''}</div>
                    </div>
                    <div className="rounded-[14px] bg-bg px-3 py-2">
                      <div className="text-[10px] font-black text-ink/38">已选水草</div>
                      <div className="mt-1 truncate text-[12px] font-black text-ink">{selectedPlantNames.length > 0 ? selectedPlantNames.join('、') : '暂无'}</div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 px-4 py-4">
                  {activeSettingsPanel === 'substrate' && (
                  <div className="grid gap-2 rounded-[18px] bg-bg/55 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[13px] font-black text-ink">底砂 / 硬景</div>
                        <div className="mt-0.5 text-[10px] font-medium text-ink/42">常用选项预览</div>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-ink/42">已选 {selectedScapeCount}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {visibleScapeOptions.map(option => {
                        const currentHardscape = settingsForm.hardscape || [];
                        const isSelected = option.type === 'substrate'
                          ? option.value === currentSubstrate
                          : currentHardscape.includes(option.value);
                        return (
                          <SelectableOptionCard
                            key={option.id}
                            label={option.label}
                            description={option.type === 'substrate' ? `底砂 · ${option.hint}` : `硬景 · ${option.hint}`}
                            selected={isSelected}
                            mode={option.type === 'substrate' ? 'single' : 'multi'}
                            visual={option.type === 'hardscape' ? (
                              <img src={option.image} alt={option.label} className="h-full w-full object-contain p-0.5" referrerPolicy="no-referrer" />
                            ) : (
                              <span className={`h-6 w-6 rounded-full border ${
                                option.value === '无' ? 'border-dashed border-ink/30 bg-white' :
                                option.value === '水草泥' || option.value === '黑金沙' ? 'border-stone-700 bg-stone-800' :
                                option.value === '溪流砂' || option.value === '碎石' || option.value === '鹅卵石' ? 'border-stone-400 bg-stone-300' :
                                option.value === '珊瑚砂' || option.value === '化妆砂' ? 'border-amber-100 bg-amber-50' :
                                option.value === '陶粒' ? 'border-orange-600 bg-orange-500' :
                                'border-amber-300 bg-amber-200'
                              }`} />
                            )}
                            onClick={() => {
                              if (option.type === 'substrate') {
                                setSettingsForm({ ...settingsForm, substrate: option.value });
                                return;
                              }
                              setSettingsForm({
                                ...settingsForm,
                                hardscape: isSelected
                                  ? currentHardscape.filter(value => value !== option.value)
                                  : [...currentHardscape, option.value]
                              });
                            }}
                          />
                        );
                      })}
                    </div>
                    {!isScapeListExpanded && hiddenScapeCount > 0 && (
                      <button type="button" onClick={() => setIsScapeListExpanded(true)} className="justify-self-start text-[11px] font-bold text-accent">
                        查看全部 {hiddenScapeCount + visibleScapeOptions.length} 个底砂/硬景
                      </button>
                    )}
                  </div>
                  )}

                  {activeSettingsPanel === 'plants' && (
                  <div className="grid gap-2 rounded-[18px] bg-bg/55 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[13px] font-black text-ink">水草种类</div>
                        <div className="mt-0.5 text-[10px] font-medium text-ink/42">已选和常用水草</div>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-ink/42">已选 {selectedPlantCount}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {visiblePlantOptions.map(plant => {
                        const current = settingsForm.plants || [];
                        const isSelected = current.includes(plant.id) || current.includes(plant.name);
                        return (
                          <SelectableOptionCard
                            key={plant.id}
                            label={plant.name}
                            description={plant.scientificName}
                            selected={isSelected}
                            mode="multi"
                            visual={<img src={plant.image} alt={plant.name} className="h-full w-full object-contain p-0.5" referrerPolicy="no-referrer" />}
                            onClick={() => {
                              setSettingsForm({
                                ...settingsForm,
                                plants: isSelected
                                  ? current.filter(p => p !== plant.id && p !== plant.name)
                                  : [...current, plant.id]
                              });
                            }}
                          />
                        );
                      })}
                    </div>
                    {!isPlantListExpanded && hiddenPlantCount > 0 && (
                      <button type="button" onClick={() => setIsPlantListExpanded(true)} className="justify-self-start text-[11px] font-bold text-accent">
                        查看全部 {hiddenPlantCount + visiblePlantOptions.length} 种水草
                      </button>
                    )}
                  </div>
                  )}
                </div>
              </section>
              )}

              {false && (activeSettingsPanel === 'lighting' || activeSettingsPanel === 'equipment') && (
              <section className="overflow-hidden rounded-[22px] border border-white bg-white shadow-sm">
                <div className="border-b border-bg px-4 py-3">
                  <h3 className="text-[16px] font-black leading-tight text-ink">{activeSettingsPanel === 'lighting' ? '灯光' : '设备'}</h3>
                  <p className="mt-1 text-[11px] font-medium leading-relaxed text-ink/48">{activeSettingsPanel === 'lighting' ? '选择草缸和观赏所需灯光' : '过滤单选，加热与氧气按需开启'}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[
                      settingsForm.equipment?.filter || '瀑布过滤',
                      settingsForm.equipment?.light || '普通灯',
                      settingsForm.equipment?.heater ? '加热棒' : '未开加热',
                      settingsForm.equipment?.oxygen ? '氧气/气泡石' : '未开氧气',
                    ].map(item => (
                      <span key={item} className="rounded-full bg-bg px-2.5 py-1 text-[10px] font-bold text-ink/52">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 px-4 py-4">
                  {activeSettingsPanel === 'equipment' && (
                  <div className="grid gap-2 rounded-[18px] bg-bg/55 p-3">
                    <div>
                      <div className="text-[13px] font-black text-ink">过滤系统</div>
                      <div className="mt-0.5 text-[10px] font-medium text-ink/42">决定水体稳定和维护压力</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {['无', '瀑布过滤', '桶滤', '上滤', '海绵过滤'].map(option => (
                        <SelectableOptionCard
                          key={option}
                          label={option}
                          selected={(settingsForm.equipment?.filter || '瀑布过滤') === option}
                          onClick={() => setSettingsForm({
                            ...settingsForm,
                            equipment: { ...(settingsForm.equipment || {}), filter: option as any }
                          })}
                        />
                      ))}
                    </div>
                  </div>
                  )}
                  {activeSettingsPanel === 'lighting' && (
                  <div className="grid gap-2 rounded-[18px] bg-bg/55 p-3">
                    <div>
                      <div className="text-[13px] font-black text-ink">灯光</div>
                      <div className="mt-0.5 text-[10px] font-medium text-ink/42">草缸和观赏效果的基础配置</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {['无', '普通灯', '水草灯', '海水灯'].map(option => (
                        <SelectableOptionCard
                          key={option}
                          label={option}
                          selected={(settingsForm.equipment?.light || '普通灯') === option}
                          onClick={() => setSettingsForm({
                            ...settingsForm,
                            equipment: { ...(settingsForm.equipment || {}), light: option as any }
                          })}
                        />
                      ))}
                    </div>
                  </div>
                  )}
                  {activeSettingsPanel === 'equipment' && (
                  <div className="grid gap-2 rounded-[18px] bg-bg/55 p-3">
                    <div>
                      <div className="text-[13px] font-black text-ink">辅助设备</div>
                      <div className="mt-0.5 text-[10px] font-medium text-ink/42">按生物和季节需求开启</div>
                    </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'heater', label: '加热棒', description: '低温或热带鱼建议开启' },
                      { key: 'oxygen', label: '氧气 / 气泡石', description: '高密度或虾缸可开启' },
                    ].map(device => {
                      const isSelected = Boolean((settingsForm.equipment as any)?.[device.key]);
                      return (
                        <SelectableOptionCard
                          key={device.key}
                          label={device.label}
                          description={device.description}
                          selected={isSelected}
                          mode="multi"
                          onClick={() => setSettingsForm({
                            ...settingsForm,
                            equipment: {
                              ...(settingsForm.equipment || {}),
                              [device.key]: !isSelected
                            }
                          })}
                        />
                      );
                    })}
                  </div>
                  </div>
                  )}
                </div>
              </section>
              )}

              {false && activeSettingsPanel && (
              <ConfigSummaryCard
                items={[
                  { label: '水体', value: settingsForm.waterType === 'Saltwater' ? '海水' : '淡水' },
                  { label: '温度', value: `${settingsForm.targetTemperature || 25}°C` },
                  { label: '水量', value: settingsEstimatedWaterLiters > 0 ? `约 ${settingsEstimatedWaterLiters}L` : '未设置' },
                  { label: '底砂', value: currentSubstrate },
                  { label: '过滤', value: settingsForm.equipment?.filter || '瀑布过滤' },
                  { label: '灯光', value: settingsForm.equipment?.light || '普通灯' },
                ]}
                note={`${(settingsForm.plants || []).length} 种水草，${(settingsForm.hardscape || []).length} 个硬景配置会一起保存。`}
              />
              )}
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-white bg-white/95 px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3 md:px-6">
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)} className="h-10 min-w-[112px] rounded-full text-sm font-bold">取消</Button>
            <Button onClick={() => {
              const updated = aquariums.map(a => a.id === activeId ? { ...a, ...settingsForm } : a);
              saveAquariums(updated);
              setIsSettingsOpen(false);
            }} className="h-10 min-w-[128px] rounded-full bg-accent text-sm font-bold text-white hover:bg-accent/90">保存设置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guide Modal */}
      <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
        <DialogContent className="w-[90vw] max-w-[500px] rounded-sm border-border p-5">
          <DialogHeader>
            <DialogTitle className="font-serif italic text-xl text-ink font-bold flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-accent" />
              换水与囤水提示
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="relative h-28 overflow-hidden rounded-sm border border-accent/15 bg-gradient-to-b from-sky-50 to-emerald-50">
              <div className="absolute left-5 top-5 h-12 w-10 animate-bounce rounded-b-lg rounded-t-sm border-2 border-accent/35 bg-white/70">
                <div className="absolute -right-4 top-4 h-2 w-8 rotate-[-18deg] rounded-full bg-accent/30" />
              </div>
              <div className="absolute left-20 top-7 h-12 w-24 rounded-sm border-2 border-accent/25 bg-white/60">
                <div className="absolute inset-x-1 bottom-1 h-5 animate-pulse rounded-sm bg-sky-200/70" />
                <div className="absolute left-4 top-5 h-2 w-2 animate-ping rounded-full bg-accent/40" />
                <div className="absolute right-5 top-4 h-2 w-2 animate-ping rounded-full bg-accent/30 [animation-delay:500ms]" />
              </div>
              <div className="absolute right-5 top-5 h-14 w-8 rounded-full border-2 border-ink/15 bg-white/70">
                <div className="absolute bottom-2 left-1/2 h-7 w-2 -translate-x-1/2 animate-pulse rounded-full bg-red-400/70" />
              </div>
              <div className="absolute bottom-3 left-4 right-4 text-[10px] font-bold text-ink/50">
                囤水 → 除氯 → 对温 → 少量换水
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-sm border border-blue-100">
              <h4 className="text-sm font-bold text-blue-800 mb-1 flex items-center gap-1"><Info className="w-4 h-4 text-blue-600" /> 囤水小贴士</h4>
              <p className="text-xs text-blue-900/80 leading-relaxed font-medium">换水前建议提前 24 小时囤水，除氯并调到接近缸内水温后再换。冬季或温差较大时，优先保证新水温度稳定。</p>
            </div>
            <div className="bg-bg p-3 rounded-sm border border-border">
              <h4 className="text-sm font-bold text-ink mb-1 flex items-center gap-1"><Info className="w-4 h-4 text-accent" /> 新鱼入缸换水方法</h4>
              <p className="text-xs text-ink/80 leading-relaxed font-medium">新鱼入缸前需严格过温过水。建议入缸后前三天不喂食、不换水，保持水质稳定，减少应激。第四天可进行第一次少量换水（约10%）。</p>
            </div>
            <div className="bg-bg p-3 rounded-sm border border-border">
              <h4 className="text-sm font-bold text-ink mb-1 flex items-center gap-1"><Info className="w-4 h-4 text-accent" /> 周期换水方法</h4>
              <p className="text-xs text-ink/80 leading-relaxed font-medium">根据过滤系统能力和生物密度，建议每周或每两周换水 20%-30%。切忌一次性全缸换水，以免破坏硝化系统。</p>
            </div>
            <div className="bg-bg p-3 rounded-sm border border-border">
              <h4 className="text-sm font-bold text-ink mb-1 flex items-center gap-1"><Info className="w-4 h-4 text-accent" /> 温度控制</h4>
              <p className="text-xs text-ink/80 leading-relaxed font-medium">换水时，新水温度应与缸内水温尽量保持一致，温差不应超过 1-2°C。冬季换水建议提前加热新水。</p>
            </div>
          </div>
          <DialogFooter>
            <Button className="rounded-sm bg-ink text-white font-bold w-full" onClick={() => setIsGuideOpen(false)}>我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedDiscoveryFish} onOpenChange={(open) => !open && setSelectedDiscoveryFish(null)}>
        <DialogContent className="flex max-h-[86dvh] w-[92vw] max-w-[430px] md:max-w-[600px] flex-col overflow-hidden rounded-[22px] border-border bg-bg p-0">
          {selectedDiscoveryFish && (
            <>
              <DialogHeader className="shrink-0 border-b border-white px-5 pb-3 pt-5">
                <DialogTitle className="font-serif text-2xl italic font-bold text-ink">{selectedDiscoveryFish.name}</DialogTitle>
                <DialogDescription className="text-xs font-medium text-ink/55">{selectedDiscoveryFish.scientificName}</DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                <div className="rounded-[20px] bg-white p-4">
                  <div className="flex h-44 items-center justify-center rounded-[18px] bg-[#FBFAF6]">
                    <img
                      src={getSpeciesDisplayImage(selectedDiscoveryFish)}
                      alt={selectedDiscoveryFish.name}
                      className={`h-full w-full object-contain p-4 ${getSpeciesImageSurfaceClass(selectedDiscoveryFish)} ${getSpeciesImageClass(selectedDiscoveryFish)}`}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {[
                      selectedDiscoveryFish.difficulty === 'Easy' ? '新手友好' : getDifficultyLabel(selectedDiscoveryFish.difficulty),
                      getToolFunctions(selectedDiscoveryFish)[0],
                      needsHeaterForSpecies(selectedDiscoveryFish) ? '需加热' : selectedDiscoveryFish.housingMode,
                    ].filter(Boolean).slice(0, 3).map(tag => (
                      <TagPill key={tag} tone={tag === '需加热' ? 'warning' : 'normal'}>{tag}</TagPill>
                    ))}
                  </div>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-ink/70">
                    {selectedDiscoveryFish.description}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    ['水温', selectedDiscoveryFish.waterTemperature],
                    ['pH', selectedDiscoveryFish.phLevel],
                    ['最小缸体', selectedDiscoveryFish.tankSize],
                    ['性情', selectedDiscoveryFish.temperament === 'Peaceful' ? '温和' : selectedDiscoveryFish.temperament === 'Aggressive' ? '凶猛' : '领地意识强'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[16px] bg-white px-3 py-3">
                      <div className="text-[10px] font-black text-ink/38">{label}</div>
                      <div className="mt-1 text-sm font-black text-ink">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-[18px] border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <div className="text-xs font-black text-emerald-800">适合谁</div>
                  <p className="mt-1 text-xs font-bold leading-relaxed text-emerald-900/75">
                    {getDiscoveryFitText(selectedDiscoveryFish).suitable}
                  </p>
                </div>
                <div className="mt-2 rounded-[18px] border border-amber-100 bg-amber-50 px-4 py-3">
                  <div className="text-xs font-black text-amber-800">加入前注意</div>
                  <p className="mt-1 text-xs font-bold leading-relaxed text-amber-900/75">
                    {getDiscoveryFitText(selectedDiscoveryFish).unsuitable}
                  </p>
                </div>
              </div>
              <DialogFooter className="shrink-0 border-t border-white bg-white/95 px-4 py-3 shadow-[0_-10px_24px_rgba(27,77,62,0.08)]">
                <Button
                  variant="outline"
                  className="h-10 rounded-full text-sm font-bold"
                  onClick={() => toggleWishlist(selectedDiscoveryFish.id)}
                >
                  <Heart className={`mr-1 h-4 w-4 ${wishlistFishIds.has(selectedDiscoveryFish.id) ? 'fill-current text-rose-500' : ''}`} />
                  {wishlistFishIds.has(selectedDiscoveryFish.id) ? '已种草' : '加入种草'}
                </Button>
                <Button
                  className="h-10 rounded-full bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800"
                  onClick={() => {
                    setSelectedAddFishItems(prev => (
                      prev.some(item => item.fishId === selectedDiscoveryFish.id)
                        ? prev
                        : [...prev, { fishId: selectedDiscoveryFish.id, quantity: 1, entryDate: format(new Date(), 'yyyy-MM-dd') }]
                    ));
                    setFishSearchTerm('');
                    setSelectedDiscoveryFish(null);
                    setIsAddFishOpen(true);
                  }}
                >
                  添加到鱼缸
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Unified species detail for aquarium and wishlist entries */}
      <SpeciesDetailDialog
        fish={selectedAqFish?.fish || selectedWishlistFish}
        open={!!selectedAqFish || !!selectedWishlistFish}
        source="aquarium"
        aquariumContext={activeAquarium}
        imageSrc={selectedAqFish ? getSpeciesDisplayImage(selectedAqFish.fish) : selectedWishlistFish ? getSpeciesDisplayImage(selectedWishlistFish) : ''}
        owned={Boolean(selectedAqFish)}
        inCalculator={(selectedAqFish || selectedWishlistFish) ? selectedAddFishItems.some(item => item.fishId === (selectedAqFish?.fish.id || selectedWishlistFish?.id)) : false}
        inWishlist={(selectedAqFish || selectedWishlistFish) ? wishlistFishIds.has(selectedAqFish?.fish.id || selectedWishlistFish?.id || '') : false}
        detailFeedback={tankActionMessage}
        onOpenChange={(open) => {
          if (!open) closeAquariumSpeciesDetail();
        }}
        onAddToCalculator={(fish) => {
          setSelectedAddFishItems(prev => (
            prev.some(item => item.fishId === fish.id)
              ? prev.filter(item => item.fishId !== fish.id)
              : [...prev, { fishId: fish.id, quantity: 1, entryDate: format(new Date(), 'yyyy-MM-dd') }]
          ));
          setTankActionMessage(selectedAddFishItems.some(item => item.fishId === fish.id) ? `已撤回 ${fish.name} 的混养计算选择。` : `已选择 ${fish.name} 参与混养计算。`);
        }}
        onToggleWishlist={(fishId) => toggleWishlist(fishId)}
        onRecordDeath={selectedAqFish ? (fish) => {
          if (!selectedAqFish) return;
          const nextDeceasedRecords = [
            ...deceasedRecords,
            { id: Math.random().toString(36).substring(2, 9), fishId: fish.id, date: new Date().toISOString() }
          ];
          setDeceasedRecords(nextDeceasedRecords);
          localStorage.setItem('deceasedRecords', JSON.stringify(nextDeceasedRecords));
          patchLocalAppState({ deceasedRecords: nextDeceasedRecords }, { debounce: true });
          if ((selectedAqFish.aqFish.quantity || 1) > 1) {
            handleUpdateQuantity(selectedAqFish.aqFish.id, (selectedAqFish.aqFish.quantity || 1) - 1);
          } else {
            handleRemoveFish(selectedAqFish.aqFish.id);
            closeAquariumSpeciesDetail();
          }
        } : undefined}
      />

      {/* Legacy fish detail modal is intentionally disabled; aquarium entries now use SpeciesDetailDialog. */}
      <Dialog open={false} onOpenChange={(open) => !open && setSelectedAqFish(null)}>
        <DialogContent className="w-[90vw] max-w-[600px] p-0 overflow-hidden border-border rounded-sm">
          {selectedAqFish && (
            <ScrollArea className="max-h-[85vh]">
              <div className="h-[180px] md:h-[240px] bg-bg relative border-b border-border">
                <img 
                  src={getSpeciesDisplayImage(selectedAqFish.fish)} 
                  alt={selectedAqFish.fish.name} 
                  className="object-contain w-full h-full p-4 opacity-95"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-5 md:p-8 flex flex-col gap-5 bg-white">
                <div>
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <DialogTitle className="font-serif text-2xl md:text-3xl italic text-ink font-bold">{selectedAqFish.fish.name}</DialogTitle>
                      <DialogDescription className="text-xs text-ink/70 mt-1 font-medium">{selectedAqFish.fish.scientificName}</DialogDescription>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-1 bg-accent-light text-accent rounded-sm whitespace-nowrap border border-accent/20">
                      {getDifficultyLabel(selectedAqFish.fish.difficulty)}
                    </span>
                  </div>
                </div>

                <p className="text-sm md:text-[14px] leading-relaxed text-ink font-medium">
                  {selectedAqFish.fish.description}
                </p>

                <div className="grid grid-cols-2 gap-3 text-[12px] border-t border-b border-border py-4 bg-bg/50 px-3 rounded-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">水温</span>
                    <span className="text-ink font-bold">{selectedAqFish.fish.waterTemperature}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">酸碱度 (pH)</span>
                    <span className="text-ink font-bold">{selectedAqFish.fish.phLevel}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">换水周期</span>
                    <span className="text-ink font-bold">约 {selectedAqFish.fish.waterChangeCycle} 天</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">鱼缸尺寸</span>
                    <span className="text-ink font-bold">{selectedAqFish.fish.tankSize}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">性情</span>
                    <span className="text-ink font-bold">{selectedAqFish.fish.temperament === 'Peaceful' ? '温和' : selectedAqFish.fish.temperament === 'Aggressive' ? '凶猛' : '领地意识强'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">体型</span>
                    <span className="text-ink font-bold">{selectedAqFish.fish.size === 'Small' ? '小型' : selectedAqFish.fish.size === 'Medium' ? '中型' : '大型'}</span>
                  </div>
                </div>

                <div className="border border-amber-200 bg-amber-50/60 p-4 rounded-sm">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h4 className="text-[11px] uppercase tracking-[1px] text-amber-800 font-bold">饮食习惯</h4>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 text-amber-800 border border-amber-200">
                      {selectedAqFish.fish.feedingProfile?.feedingType || '杂食性'}
                    </span>
                  </div>
                  <div className="grid gap-3 text-sm md:text-[14px] text-ink">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink/55 font-bold mb-1">推荐食物</div>
                      <p className="font-medium leading-relaxed">{selectedAqFish.fish.feedingProfile?.recommendedFoods || selectedAqFish.fish.diet}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-ink/55 font-bold mb-1">喂食频率</div>
                        <p className="font-medium leading-relaxed">{selectedAqFish.fish.feedingProfile?.feedingFrequency || '每天1-2次'}</p>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-ink/55 font-bold mb-1">投喂量</div>
                        <p className="font-medium leading-relaxed">{selectedAqFish.fish.feedingProfile?.portionRule || '2-3分钟内吃完，残饵及时清理'}</p>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink/55 font-bold mb-1">禁忌</div>
                      <p className="font-medium leading-relaxed">{selectedAqFish.fish.feedingProfile?.avoidFoods || '过量投喂；变质饲料；长期残饵'}</p>
                    </div>
                    {selectedAqFish.fish.feedingProfile?.specialNotes && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-ink/55 font-bold mb-1">特殊提醒</div>
                        <p className="font-medium leading-relaxed">{selectedAqFish.fish.feedingProfile.specialNotes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-accent-light/30 border border-accent/20 p-4 rounded-sm flex flex-col gap-3">
                  <h4 className="text-[11px] uppercase tracking-[1px] text-ink/60 font-bold">入缸管理</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] text-ink/60 font-bold mb-1 block">入缸日期</Label>
                      <Input 
                        type="date" 
                        className="h-9 text-sm bg-white" 
                        value={format(new Date(selectedAqFish.aqFish.entryDate), 'yyyy-MM-dd')} 
                        onChange={(e) => handleUpdateEntryDate(selectedAqFish.aqFish.id, e.target.value)}
                        max={format(new Date(), 'yyyy-MM-dd')}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-ink/60 font-bold mb-1 block">数量 (条/只)</Label>
                      <Input 
                        type="number" 
                        min="1"
                        className="h-9 text-sm bg-white" 
                        value={selectedAqFish.aqFish.quantity || 1} 
                        onChange={(e) => handleUpdateQuantity(selectedAqFish.aqFish.id, parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-ink bg-white/50 p-2 rounded-sm mt-1">
                    <span>已入缸时间:</span>
                    <span className="font-serif text-lg">{differenceInDays(new Date(), new Date(selectedAqFish.aqFish.entryDate))} 天</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      variant="ghost" 
                      className="flex-1 text-ink/70 hover:bg-gray-100 hover:text-ink text-xs font-bold border border-border"
                      onClick={() => {
                        const nextDeceasedRecords = [
                          ...deceasedRecords,
                          {
                          id: Math.random().toString(36).substring(2, 9),
                          fishId: selectedAqFish.fish.id,
                          date: new Date().toISOString()
                          }
                        ];
                        setDeceasedRecords(nextDeceasedRecords);
                        localStorage.setItem('deceasedRecords', JSON.stringify(nextDeceasedRecords));
                        patchLocalAppState({ deceasedRecords: nextDeceasedRecords }, { debounce: true });
                        
                        // Decrease quantity or remove fish
                        if ((selectedAqFish.aqFish.quantity || 1) > 1) {
                          handleUpdateQuantity(selectedAqFish.aqFish.id, (selectedAqFish.aqFish.quantity || 1) - 1);
                        } else {
                          handleRemoveFish(selectedAqFish.aqFish.id);
                          setSelectedAqFish(null);
                        }
                      }}
                    >
                      <Skull className="w-4 h-4 mr-2" /> 记录死亡
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="flex-1 text-[#D32F2F] hover:bg-[#FFF4F4] hover:text-[#D32F2F] text-xs font-bold border border-[#FFD6D6]"
                      onClick={() => {
                        handleRemoveFish(selectedAqFish.aqFish.id);
                        setSelectedAqFish(null);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> 移出鱼缸
                    </Button>
                  </div>
                </div>
                
                <Button 
                  className="w-full rounded-sm bg-ink hover:bg-ink/90 text-white mt-2 font-bold h-12"
                  onClick={() => setSelectedAqFish(null)}
                >
                  关闭
                </Button>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isConflictDialogOpen} onOpenChange={setIsConflictDialogOpen}>
        <DialogContent className="max-w-[425px] rounded-[22px] p-0 border-yellow-200 bg-bg overflow-hidden backdrop-blur-md">
          <DialogHeader className="mb-2">
            <div className="border-b border-white bg-white px-5 py-4">
             <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                <DialogTitle className="text-xl font-bold font-serif">鱼缸风险提示</DialogTitle>
             </div>
             <DialogDescription className="mt-1 text-amber-700/80 text-xs">
               {activeAquarium && (activeAquarium as Aquarium & { buildTemplateMeta?: { name: string } }).buildTemplateMeta
                 ? '基础搭建方案已记录，当前提示会优先区分是推荐配置本身，还是后续加入的生物数量或组合带来的风险。'
                 : '当前提示按容量、水质参数和混养组合分组展示。'}
             </DialogDescription>
            </div>
          </DialogHeader>
          <div className="flex max-h-[58vh] flex-col gap-3 overflow-y-auto px-4 pb-3">
            {activeAquarium && (activeAquarium as Aquarium & { buildTemplateMeta?: { name: string; capacityGuidance?: TankBuildTemplate['capacityGuidance'] } }).buildTemplateMeta && (
              <div className="rounded-[16px] border border-emerald-100 bg-emerald-50 p-3 text-[12px] font-medium leading-relaxed text-emerald-900/78">
                <div className="font-black text-emerald-800">
                  基础搭建方案：{(activeAquarium as Aquarium & { buildTemplateMeta?: { name: string } }).buildTemplateMeta?.name}
                </div>
                <div className="mt-1">
                  基础配置本身不等于风险；如果出现容量或混养提示，通常来自当前动物数量、后续加入生物或组合超出建议范围。
                </div>
              </div>
            )}
            {tankRiskItems.map((item, index) => (
              <div
                key={`${item.group}-${item.title}-${index}`}
                className={`rounded-[16px] border p-3 ${
                  item.severity === 'danger'
                    ? 'border-red-100 bg-red-50 text-red-900'
                    : item.severity === 'warning'
                      ? 'border-amber-100 bg-amber-50 text-amber-900'
                      : 'border-sky-100 bg-sky-50 text-sky-900'
                }`}
              >
                <div className="text-[10px] font-black opacity-60">{item.group}</div>
                <div className="mt-1 text-[13px] font-black">{item.title}</div>
                <p className="mt-1 text-[12px] font-medium leading-relaxed opacity-80">{item.detail}</p>
                <p className="mt-2 rounded-[12px] bg-white/70 px-2.5 py-2 text-[11px] font-bold leading-relaxed opacity-85">
                  下一步：{item.nextStep}
                </p>
              </div>
            ))}
          </div>
          <details className="mx-4 mb-4 mt-1 rounded-[14px] border border-yellow-100 bg-white/50 px-3 py-2 text-xs font-medium leading-relaxed text-ink/70">
            <summary className="cursor-pointer font-bold text-yellow-700">
              让 AI 帮我解读
            </summary>
            <div className="mt-2 rounded-[12px] bg-yellow-50/70 px-3 py-2 text-[11px] font-bold text-ink/55">
              系统结论由规则生成，AI 仅负责解释，不会改变风险等级。
            </div>
            {aiReasoning ? (
              <div className="mt-2 space-y-1">
                <div className={`mb-2 w-fit rounded-full px-2.5 py-1 text-[10px] font-black ${
                  aiReasoningSource === 'model'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {aiReasoningSource === 'model' ? '模型回复' : '本地模板'}
                </div>
                {aiReasoning.split('\n').map((line, idx) => <p key={idx}>{line}</p>)}
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleAskAIAboutConflicts}
                disabled={isRecommending}
                variant="outline"
                className="mt-3 h-9 rounded-full px-4 text-xs font-black"
              >
                {isRecommending ? '正在解读...' : <><Sparkles className="mr-2 h-3.5 w-3.5" />生成解释</>}
              </Button>
            )}
          </details>
        </DialogContent>
      </Dialog>

      <FilterBottomSheet
        open={isTankContentFilterOpen}
        title="选择鱼缸内容分类"
        subtitle="切换查看鱼类、虾螺、水草、底砂和造景。"
        groups={[
          {
            title: '缸内内容',
            selected: draftTankArchiveCategory,
            onSelect: setDraftTankArchiveCategory,
            options: archiveCategories.map(label => ({ label })),
          },
        ]}
        onClose={() => setIsTankContentFilterOpen(false)}
        onReset={() => {
          setDraftTankArchiveCategory('全部');
          setTankArchiveCategory('全部');
          setIsTankContentFilterOpen(false);
        }}
        onApply={() => {
          setTankArchiveCategory(draftTankArchiveCategory);
          setIsTankContentFilterOpen(false);
        }}
      />
    </div>
  );
}
