import { useState, useEffect, useMemo, useRef } from 'react';
import type { PointerEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Fish, Aquarium } from '../types';
import { fishData } from '../data/fishData';
import { encyclopediaService } from '../modules/encyclopedia/encyclopedia.service';
import {
  getCareTaxonomyPath,
  getLifeType,
  getSecondaryCategory,
  getSpeciesFilterTags,
  getSpeciesFunctionTags,
  getSpeciesRoleLabel as getSpeciesRole,
  getToolFunctions,
  isSaltwaterSpecies,
} from '../modules/species/species.service';
import type { DiscoveryDeckState } from '../modules/recommendation/recommendation.schema';
import {
  DISCOVERY_DAILY_LIMIT,
  DISCOVERY_STORAGE_KEY,
  normalizeDiscoveryState,
  recommendationService,
} from '../modules/recommendation/recommendation.service';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Heart, HeartOff, Skull, Thermometer, CheckCircle2, Plus, ChevronRight, SlidersHorizontal, AlertTriangle, Info, MoreHorizontal } from 'lucide-react';
import { CompatibilityRiskCalculator } from '../components/CompatibilityRiskCalculator';
import { loadAppStateFromStorage, patchLocalAppState } from '../services/storage/local-app-state';
import { FilterBottomSheet } from '../components/common/FilterBottomSheet';
import { ImagePreviewModal, type PreviewImage } from '../components/common/ImagePreviewModal';
import { SpeciesDetailDialog } from '../components/SpeciesDetailDialog';
import { getSpeciesDisplayImage, getSpeciesImageClass, getSpeciesImageSurfaceClass } from '../lib/speciesVisual';
import {
  evaluateSpeciesForAquarium,
  getCurrentLivestockForAquarium,
  type SpeciesFitEvaluation,
} from '../lib/speciesFitEngine';
import {
  evaluateTankCompatibility,
  getTankCompatibilityAddPolicy,
  getTankCompatibilityStatusLabel,
  type TankCompatibilityResult,
} from '../lib/tankCompatibilityEngine';
import {
  executeSpeciesAddition,
  reviewSpeciesAdditions,
} from '../services/aquarium/species-addition.service';
import { getSpeciesFavoriteIds, setSpeciesFavoriteIds, subscribeToFavorites } from '../services/favorites/favorites.service';
import {
  buildAtlasDisplayItems,
  deriveSpeciesGroups,
  getVariantLabel,
  speciesMatchesKeyword,
  type SpeciesGroup,
} from '../lib/speciesGrouping';

const difficulties = [
  { id: 'Easy', label: '新手适宜' },
  { id: 'Medium', label: '进阶挑战' },
  { id: 'Hard', label: '骨灰级玩家' }
];

const temperatureBands = [
  { id: 'Coldwater', label: '冷水', hint: '低温/不用加热' },
  { id: 'Tropical', label: '热带', hint: '多数需加热' },
  { id: 'BroadRange', label: '广温', hint: '适应范围较宽' },
];

const sizeFilters = [
  { id: 'Small', label: '小型', hint: '小缸/群游' },
  { id: 'Medium', label: '中型', hint: '中等缸位' },
  { id: 'Large', label: '大型', hint: '大缸/慎混' },
];

const temperamentFilters = [
  { id: 'Peaceful', label: '温和', hint: '性格稳定' },
  { id: 'Territorial', label: '领地', hint: '注意躲避' },
  { id: 'Aggressive', label: '凶猛', hint: '高风险' },
];

const housingModes: Array<NonNullable<Fish['housingMode']>> = ['适合混养', '谨慎混养', '建议单养'];

const lifeTypes = [
  { id: 'freshwaterFish', label: '淡水鱼', hint: '草缸/冷水/热带鱼' },
  { id: 'saltwaterFish', label: '海水鱼', hint: '海缸观赏鱼' },
  { id: 'invertebrate', label: '虾螺蟹', hint: '工具生物' },
  { id: 'reptile', label: '龟 / 两栖', hint: '单养优先' },
  { id: 'coral', label: '珊瑚 / 海葵', hint: '海水无脊椎' },
  { id: 'plant', label: '水草', hint: '前景/中景/浮草' },
];

const getEncyclopediaImage = getSpeciesDisplayImage;

const loadDiscoveryState = () => {
  try {
    return normalizeDiscoveryState(JSON.parse(localStorage.getItem(DISCOVERY_STORAGE_KEY) || 'null'));
  } catch {
    return normalizeDiscoveryState();
  }
};

const saveDiscoveryState = (state: DiscoveryDeckState) => {
  localStorage.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify(state));
  patchLocalAppState({ discoveryState: state }, { debounce: true });
};

const loadWishlistIds = () => {
  return new Set(getSpeciesFavoriteIds());
};

const getFishTemperatureTheme = (tempString: string) => {
  const match = tempString.match(/(\d+)-(\d+)/);
  if (!match) return { type: 'general', needsHeater: false, bgTheme: 'bg-orange-50', borderTheme: 'border-orange-100 hover:border-orange-300' };

  const min = parseInt(match[1]);
  const max = parseInt(match[2]);

  if (min >= 20) {
     return { type: 'tropical', needsHeater: true, bgTheme: 'bg-red-50', borderTheme: 'border-red-100 hover:border-red-300' };
  } else if (min < 20 && max > 25) {
     return { type: 'general', needsHeater: false, bgTheme: 'bg-orange-50', borderTheme: 'border-orange-100 hover:border-orange-300' };
  } else {
     return { type: 'cold', needsHeater: false, bgTheme: 'bg-blue-50', borderTheme: 'border-blue-100 hover:border-blue-300' };
  }
};

const getDifficultyBadgeClass = (difficulty: string) => {
  switch (difficulty) {
    case 'Easy':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Medium':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Hard':
      return 'bg-red-50 text-red-600 border-red-200';
    default:
      return 'bg-white text-ink border-border';
  }
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

const getAquariumSnapshots = () => {
  try {
    const appState = loadAppStateFromStorage();
    if (appState.aquariums.length > 0) return appState.aquariums;
    const aquariums = JSON.parse(localStorage.getItem('aquariums') || '[]');
    return Array.isArray(aquariums) ? aquariums as Aquarium[] : [];
  } catch {
    return [] as Aquarium[];
  }
};

const getTemperamentLabel = (temperament: Fish['temperament']) => (
  temperament === 'Peaceful' ? '温和' : temperament === 'Aggressive' ? '凶猛' : '领地意识强'
);

const getSizeLabel = (size: Fish['size']) => (
  size === 'Small' ? '小型' : size === 'Medium' ? '中型' : '大型'
);

const getFitStatusClass = (status: 'ok' | 'warning' | 'danger' | 'info') => {
  switch (status) {
    case 'ok':
      return 'border-emerald-100 bg-emerald-50 text-emerald-700';
    case 'warning':
      return 'border-amber-100 bg-amber-50 text-amber-700';
    case 'danger':
      return 'border-red-100 bg-red-50 text-red-600';
    default:
      return 'border-sky-100 bg-sky-50 text-sky-700';
  }
};

const getFitCurrentClass = (status: 'ok' | 'warning' | 'danger' | 'info') => {
  switch (status) {
    case 'warning':
      return 'text-amber-700';
    case 'danger':
      return 'text-red-600';
    case 'info':
      return 'text-sky-700';
    default:
      return 'text-emerald-700';
  }
};

const getFitStatusLabel = (status: 'ok' | 'warning' | 'danger' | 'info') => {
  switch (status) {
    case 'ok':
      return '匹配';
    case 'warning':
      return '需调整';
    case 'danger':
      return '风险';
    default:
      return '信息不足';
  }
};

const getSpeciesReminder = (fish: Fish) => {
  const tools = getToolFunctions(fish);
  if (fish.name.includes('红莲灯') || fish.name.includes('灯')) return '建议成群饲养，状态更稳定。';
  if (fish.housingMode === '谨慎混养') return '加入前建议先做混养计算。';
  if (fish.housingMode === '建议单养') return '更适合作为单独规划的主题生物。';
  if (tools.includes('除藻') && getLifeType(fish) === 'invertebrate') return '避免含铜药剂，保持水质稳定。';
  if (fish.difficulty === 'Hard') return '对水质和环境稳定性要求较高。';
  return '';
};

const matchesFunctionFilter = (
  fish: Fish,
  functionTag: string | null,
  fitEvaluation?: SpeciesFitEvaluation,
  compatibilityEvaluation?: TankCompatibilityResult,
) => {
  if (!functionTag || functionTag === '全部') return true;
  if (functionTag === '适合当前鱼缸') {
    return compatibilityEvaluation?.status === 'compatible' || compatibilityEvaluation?.status === 'caution';
  }
  const tags = getSpeciesFilterTags(fish);
  if (functionTag === '清洁工具') {
    return tags.functionTags.includes('清洁工具') || tags.functionTags.includes('工具生物') || tags.functionTags.includes('除藻') || tags.functionTags.includes('清残饵');
  }
  return tags.functionTags.includes(functionTag) || tags.difficultyTags.includes(functionTag) || tags.housingTags.includes(functionTag);
};

const matchesKeyword = (fish: Fish, keyword: string) => {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return true;

  const aliases = getSpeciesAliases(fish);
  const name = fish.name.toLowerCase();
  const scientificName = fish.scientificName.toLowerCase();
  const category = fish.category.toLowerCase();

  if (normalized === '草') {
    return getLifeType(fish) === 'plant'
      || category.includes('水草')
      || category === 'plant'
      || name.includes('草')
      || aliases.some(alias => alias.includes('草'));
  }

  const tags = getSpeciesFilterTags(fish);
  return name.includes(normalized)
    || aliases.some(alias => alias.includes(normalized))
    || scientificName.includes(normalized)
    || category.includes(normalized)
    || tags.searchKeywords.some(keyword => keyword.includes(normalized));
};

const getSpeciesAliases = (fish: Fish) => {
  const maybeAliases = (fish as Fish & { aliases?: unknown; alias?: unknown; commonNames?: unknown }).aliases
    || (fish as Fish & { alias?: unknown }).alias
    || (fish as Fish & { commonNames?: unknown }).commonNames;
  if (Array.isArray(maybeAliases)) return maybeAliases.map(alias => String(alias).toLowerCase()).filter(Boolean);
  if (typeof maybeAliases === 'string') return maybeAliases.split(/[、,，/]/).map(alias => alias.trim().toLowerCase()).filter(Boolean);
  return [];
};

const getSearchRank = (fish: Fish, keyword: string) => {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return 0;
  const aliases = getSpeciesAliases(fish);
  const name = fish.name.toLowerCase();
  const scientificName = fish.scientificName.toLowerCase();
  const category = fish.category.toLowerCase();
  const isPlant = getLifeType(fish) === 'plant' || category.includes('水草') || category === 'plant';

  if (normalized === '草') {
    if (isPlant && name.includes('草')) return 0;
    if (isPlant) return 1;
    if (name.includes('草')) return 2;
    if (aliases.some(alias => alias.includes('草'))) return 3;
    return 99;
  }

  if (name === normalized) return 0;
  if (name.includes(normalized)) return 1;
  if (aliases.some(alias => alias.includes(normalized))) return 2;
  if (scientificName.includes(normalized)) return 3;
  if (category.includes(normalized)) return 4;
  return 99;
};

const matchesEnvironmentFilter = (fish: Fish, environment: string | null) => (
  !environment || environment === '全部' || getSpeciesFilterTags(fish).environmentTags.includes(environment)
);

const getFilteredSpecies = (
  allSpecies: Fish[],
  filters: ActiveFilters,
  fitEvaluations: Map<string, SpeciesFitEvaluation> = new Map(),
  compatibilityEvaluations: Map<string, TankCompatibilityResult> = new Map(),
) => {
  const keyword = filters.keyword.trim();
  return allSpecies
    .filter(fish =>
      matchesKeyword(fish, keyword)
      && matchesFunctionFilter(fish, filters.functionTag, fitEvaluations.get(fish.id), compatibilityEvaluations.get(fish.id))
      && matchesEnvironmentFilter(fish, filters.environment)
    )
    .sort((a, b) => {
      if (filters.functionTag === '适合当前鱼缸') {
        const compatibilityRank = { compatible: 3, caution: 2, insufficient_data: 1, not_recommended: 0 };
        const compatibilityDiff = (compatibilityRank[compatibilityEvaluations.get(b.id)?.status || 'not_recommended'] || 0)
          - (compatibilityRank[compatibilityEvaluations.get(a.id)?.status || 'not_recommended'] || 0);
        if (compatibilityDiff !== 0) return compatibilityDiff;
        const scoreDiff = (fitEvaluations.get(b.id)?.score || 0) - (fitEvaluations.get(a.id)?.score || 0);
        if (scoreDiff !== 0) return scoreDiff;
      }
      const rankDiff = getSearchRank(a, keyword) - getSearchRank(b, keyword);
      if (rankDiff !== 0) return rankDiff;
      return a.name.localeCompare(b.name, 'zh-Hans-CN');
    });
};

const getSpeciesFitText = (fish: Fish) => {
  const suitable = [
    fish.difficulty === 'Easy' ? '新手' : '有一定经验的玩家',
    fish.size === 'Small' ? '小型缸或草缸' : fish.size === 'Medium' ? '中型鱼缸' : '大缸',
    ...(getToolFunctions(fish).slice(0, 1)),
  ].filter(Boolean);
  const unsuitable = [
    fish.housingMode === '建议单养' ? '混养缸' : null,
    fish.temperament !== 'Peaceful' ? '长鳍慢游鱼' : null,
    getFishTemperatureTheme(fish.waterTemperature).needsHeater ? '无加热设备的低温缸' : null,
  ].filter(Boolean);
  return {
    suitable: suitable.join(' / '),
    unsuitable: unsuitable.length > 0 ? unsuitable.join(' / ') : '大型攻击性混养',
  };
};

const propertyExplanations = [
  { label: '谨慎混养', text: '可以尝试混养，但需要确认同缸生物的性情、体型和躲避空间。' },
  { label: '需加热', text: '长期维持稳定水温更合适，建议使用加热棒和温度计。' },
  { label: '新手友好', text: '饲养难度较低、容错较高，但仍需要稳定换水和少量投喂。' },
];

type ActiveFilters = {
  keyword: string;
  functionTag: string | null;
  environment: string | null;
};

const emptyActiveFilters: ActiveFilters = {
  keyword: '',
  functionTag: null,
  environment: null,
};

const functionFilterOptions = ['全部', '新手好养', '清洁工具', '除藻', '清残饵', '观赏鱼', '工具生物', '适合草缸', '小缸适合'];
const environmentFilterOptions = ['全部', '淡水', '海水', '草缸', '小缸', '需加热', '不需加热'];
const difficultyFilterOptions = ['全部', '简单', '中等', '困难'];
const housingFilterOptions = ['全部', '适合混养', '谨慎混养', '建议单养'];
const primaryFunctionFilterOptions = ['新手好养', '清洁工具', '适合当前鱼缸'];
const defaultRecentFilterOptions = ['适合草缸', '小缸适合', '淡水'];
const FILTER_USAGE_STORAGE_KEY = 'aquarium_filter_usage';

type FilterUsageState = Record<string, { count: number; lastUsedAt: string }>;

const loadFilterUsage = (): FilterUsageState => {
  try {
    const parsed = JSON.parse(localStorage.getItem(FILTER_USAGE_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const saveFilterUsage = (usage: FilterUsageState) => {
  try {
    localStorage.setItem(FILTER_USAGE_STORAGE_KEY, JSON.stringify(usage));
  } catch {
    // Ignore local persistence failures so filtering stays usable.
  }
};

function AnimatedFishBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 mix-blend-multiply">
      {/* CSS animations for fish swimming */}
      <style>{`
        @keyframes swim-right {
          0% { transform: translateX(-100%) translateY(0) scaleX(-1); }
          50% { transform: translateX(50vw) translateY(-20px) scaleX(-1); }
          100% { transform: translateX(100vw) translateY(10px) scaleX(-1); }
        }
        @keyframes swim-left {
          0% { transform: translateX(100vw) translateY(0); }
          50% { transform: translateX(50vw) translateY(20px); }
          100% { transform: translateX(-100%) translateY(-10px); }
        }
        .fish-1 { animation: swim-right 15s linear infinite; top: 20%; }
        .fish-2 { animation: swim-left 20s linear infinite; top: 50%; animation-delay: -5s; }
        .fish-3 { animation: swim-right 25s linear infinite; top: 70%; animation-delay: -10s; }
        .fish-4 { animation: swim-left 18s linear infinite; top: 30%; animation-delay: -2s; }
      `}</style>
      <div className="absolute fish-1 text-4xl">🐟</div>
      <div className="absolute fish-2 text-5xl">🐠</div>
      <div className="absolute fish-3 text-3xl">🐡</div>
      <div className="absolute fish-4 text-4xl">🐟</div>
    </div>
  );
}

export default function Encyclopedia() {
  const location = useLocation();
  const [viewMode, setViewMode] = useState<'browse' | 'compatibility'>('browse');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(emptyActiveFilters);
  const [selectedFish, setSelectedFish] = useState<Fish | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<SpeciesGroup | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const [ownedFishIds, setOwnedFishIds] = useState<Set<string>>(new Set());
  const [wishlistFishIds, setWishlistFishIds] = useState<Set<string>>(() => loadWishlistIds());
  const [discoveryState, setDiscoveryState] = useState<DiscoveryDeckState>(() => loadDiscoveryState());
  const [discoveryDragStartX, setDiscoveryDragStartX] = useState<number | null>(null);
  const [discoveryDragX, setDiscoveryDragX] = useState(0);
  const [discoveryMessage, setDiscoveryMessage] = useState('');
  const [loadedDiscoveryImageSrc, setLoadedDiscoveryImageSrc] = useState('');
  const [isWishlistExpanded, setIsWishlistExpanded] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isMoreFilterOpen, setIsMoreFilterOpen] = useState(false);
  const [draftFunctionTag, setDraftFunctionTag] = useState<string | null>(null);
  const [draftEnvironment, setDraftEnvironment] = useState<string | null>(null);
  const [filterSheetMessage, setFilterSheetMessage] = useState('');
  const [filterUsage, setFilterUsage] = useState<FilterUsageState>(() => loadFilterUsage());
  const [activeFilterGroup, setActiveFilterGroup] = useState<'life' | 'size' | 'housing' | 'water' | 'difficulty' | 'temperament'>('life');
  const [currentAquarium, setCurrentAquarium] = useState<Aquarium | null>(null);
  const [pendingTankFish, setPendingTankFish] = useState<Fish | null>(null);
  const [targetAquariumId, setTargetAquariumId] = useState('');
  const [pendingTankAddConfirmed, setPendingTankAddConfirmed] = useState(false);
  const [calculatorSpeciesIds, setCalculatorSpeciesIds] = useState<string[]>([]);
  const [calculatorFeedback, setCalculatorFeedback] = useState('');
  const [calculatorPulse, setCalculatorPulse] = useState(false);
  const [flyingThumbnail, setFlyingThumbnail] = useState<{
    id: string;
    src: string;
    name: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
    active: boolean;
  } | null>(null);
  const [detailFeedback, setDetailFeedback] = useState('');
  const [lastAddedToTankMessage, setLastAddedToTankMessage] = useState('');
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [resultPage, setResultPage] = useState(0);
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);
  const atlasGridTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const appState = loadAppStateFromStorage();
    const aquariums = appState.aquariums.length > 0
      ? appState.aquariums
      : JSON.parse(localStorage.getItem('aquariums') || '[]') as Aquarium[];
    if (Array.isArray(aquariums)) {
      const ids = new Set<string>();
      aquariums.forEach(aq => {
        aq.fishes.forEach(f => ids.add(f.fishId));
      });
      setOwnedFishIds(ids);
      const current = appState.currentAquariumId
        ? aquariums.find(aq => aq.id === appState.currentAquariumId)
        : aquariums[0];
      setCurrentAquarium(current || null);
    }

    setWishlistFishIds(loadWishlistIds());
  }, []);

  const syncWishlistFishIds = (next: Set<string>) => {
    setWishlistFishIds(next);
    setSpeciesFavoriteIds(next);
  };

  useEffect(() => {
    const refreshWishlist = () => setWishlistFishIds(loadWishlistIds());
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

  const encyclopediaCatalog = useMemo(
    () => encyclopediaService.search({ limit: 500 }),
    []
  );
  const allFishes = encyclopediaCatalog.allItems;
  const wishlistFishes = useMemo(
    () => Array.from(wishlistFishIds)
      .map(id => fishData.find(fish => fish.id === id))
      .filter(Boolean) as Fish[],
    [wishlistFishIds]
  );
  const discoveryPool = useMemo(
    () => allFishes,
    [allFishes]
  );

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
  const discoveryTaxonomy = discoveryFish ? getCareTaxonomyPath(discoveryFish) : null;
  const nextDiscoveryFish = useMemo(
    () => discoveryPool.find(fish => fish.id === discoveryState.queueIds[1]) || null,
    [discoveryPool, discoveryState.queueIds]
  );
  const discoveryImageSrc = discoveryFish ? getEncyclopediaImage(discoveryFish) : '';
  const nextDiscoveryImageSrc = nextDiscoveryFish ? getEncyclopediaImage(nextDiscoveryFish) : '';
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
      preload.src = getEncyclopediaImage(fish);
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

  const resetFilterState = () => {
    setShowWishlistOnly(false);
    setSearchTerm('');
    setActiveFilters(emptyActiveFilters);
    setResultPage(0);
  };

  const clearFilters = () => {
    resetFilterState();
  };

  const recordFilterUsage = (label: string) => {
    if (!label || label === '全部') return;
    setFilterUsage(prev => {
      const next = {
        ...prev,
        [label]: {
          count: (prev[label]?.count || 0) + 1,
          lastUsedAt: new Date().toISOString(),
        },
      };
      saveFilterUsage(next);
      return next;
    });
  };

  const applyFilterLabel = (label: string) => {
    if (functionFilterOptions.includes(label)) {
      applyFunctionFilter(label);
      return;
    }
    if (environmentFilterOptions.includes(label)) {
      applyEnvironmentFilter(label);
    }
  };

  const recentFilterOptions = Object.entries(filterUsage)
    .sort((a, b) => {
      if (b[1].count !== a[1].count) return b[1].count - a[1].count;
      return new Date(b[1].lastUsedAt).getTime() - new Date(a[1].lastUsedAt).getTime();
    })
    .map(([label]) => label)
    .filter(label => label !== '全部' && (functionFilterOptions.includes(label) || environmentFilterOptions.includes(label)))
    .slice(0, 3);
  const secondaryFilterOptions = recentFilterOptions.length > 0 ? recentFilterOptions : defaultRecentFilterOptions;

  const resultFilterLabels = [
    activeFilters.keyword.trim() && `搜索：“${activeFilters.keyword.trim()}”`,
    activeFilters.functionTag,
    activeFilters.environment,
  ].filter(Boolean) as string[];
  const isSuitableCurrentTankFilter = activeFilters.functionTag === '适合当前鱼缸';
  const hasAnyActiveCriteria = resultFilterLabels.length > 0;
  const currentLivestock = useMemo(
    () => getCurrentLivestockForAquarium(currentAquarium, allFishes),
    [currentAquarium, allFishes]
  );
  const fitEvaluations = useMemo(() => {
    const map = new Map<string, SpeciesFitEvaluation>();
    allFishes.forEach(fish => {
      map.set(fish.id, evaluateSpeciesForAquarium(fish, currentAquarium, currentLivestock));
    });
    return map;
  }, [allFishes, currentAquarium, currentLivestock]);
  const compatibilityEvaluations = useMemo(() => {
    const existingSpecies = currentLivestock.map(item => ({
      species: item.species,
      record: { quantity: item.record.quantity },
    }));
    const map = new Map<string, TankCompatibilityResult>();
    allFishes.forEach(fish => {
      map.set(fish.id, evaluateTankCompatibility({
        tank: currentAquarium,
        existingSpecies,
        candidateSpecies: fish,
        candidateQuantity: 1,
      }));
    });
    return map;
  }, [allFishes, currentAquarium, currentLivestock]);
  const getDraftFilterCount = (nextFilters: Partial<ActiveFilters>) => (
    getFilteredSpecies(
      allFishes,
      {
        keyword: '',
        functionTag: draftFunctionTag,
        environment: draftEnvironment,
        ...nextFilters,
      },
      fitEvaluations,
      compatibilityEvaluations
    ).length
  );
  const makeFilterOption = (label: string, nextFilters: Partial<ActiveFilters>, hint?: string) => {
    const count = getDraftFilterCount(nextFilters);
    return {
      label,
      hint,
      count,
      disabled: label !== '全部' && count === 0,
    };
  };
  const allSpeciesGroups = useMemo(() => deriveSpeciesGroups(allFishes), [allFishes]);
  const filteredFishes = useMemo(() => {
    if (showWishlistOnly) return wishlistFishes;

    const baseFiltered = getFilteredSpecies(allFishes, activeFilters, fitEvaluations, compatibilityEvaluations);
    const keyword = activeFilters.keyword.trim();
    if (!keyword) return baseFiltered;

    const matchedIds = new Set(baseFiltered.map(fish => fish.id));
    allSpeciesGroups.forEach(group => {
      const matchedInGroup = group.variants.some(variant => matchedIds.has(variant.id));
      if (!matchedInGroup) return;
      group.variants.forEach(variant => matchedIds.add(variant.id));
    });

    return allFishes.filter(fish => matchedIds.has(fish.id));
  }, [activeFilters, allFishes, allSpeciesGroups, compatibilityEvaluations, fitEvaluations, showWishlistOnly, wishlistFishes]);
  const atlasDisplayItems = useMemo(
    () => buildAtlasDisplayItems(filteredFishes),
    [filteredFishes]
  );
  const resultTitle = isSuitableCurrentTankFilter
    ? `适合当前鱼缸 · ${filteredFishes.length} 种`
    : showWishlistOnly
      ? `种草图鉴 · ${filteredFishes.length} 种`
      : resultFilterLabels.length > 0 ? resultFilterLabels.join(' · ') : '全部结果';
  const resultPageSize = 20;
  const resultItemCount = atlasDisplayItems.length;
  const resultPageCount = Math.max(1, Math.ceil(resultItemCount / resultPageSize));
  const currentResultPage = Math.min(resultPage, resultPageCount - 1);
  const pagedAtlasItems = atlasDisplayItems.slice(currentResultPage * resultPageSize, (currentResultPage + 1) * resultPageSize);
  const selectedGroupVariant = selectedGroup
    ? selectedGroup.variants.find(variant => variant.id === selectedVariantId) || selectedGroup.representativeSpecies
    : null;
  const selectedTaxonomy = selectedFish ? getCareTaxonomyPath(selectedFish) : null;

  useEffect(() => {
    setResultPage(0);
  }, [activeFilters, showWishlistOnly, resultItemCount]);

  const goToResultPage = (page: number, options: { scrollToGrid?: boolean } = {}) => {
    const nextPage = Math.max(0, Math.min(resultPageCount - 1, page));
    setResultPage(nextPage);
    if (options.scrollToGrid === false) return;
    if (typeof window === 'undefined' || window.innerWidth < 768) return;
    window.requestAnimationFrame(() => {
      atlasGridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '极易';
      case 'Medium': return '中等';
      case 'Hard': return '困难';
      default: return difficulty;
    }
  };

  const getSpeciesFitAssessment = (fish: Fish, aquarium?: Aquarium | null) => {
    const tempRange = parseRange(fish.waterTemperature);
    const phRange = parseRange(fish.phLevel);
    const tankLiters = getTankVolumeLiters(aquarium);
    const minLiters = getMinimumTankLiters(fish);
    const currentTemperature = aquarium?.targetTemperature ? Number(aquarium.targetTemperature) : null;
    const isSaltwaterSpecies = fish.category.includes('海水') || getCareTaxonomyPath(fish).waterType.includes('海水');
    const waterTypeMismatch = !!aquarium && ((aquarium.waterType === 'Saltwater') !== isSaltwaterSpecies);
    const needsHeater = getFishTemperatureTheme(fish.waterTemperature).needsHeater;
    const heaterMissing = needsHeater && aquarium?.equipment?.heater === false;

    const items = [
      {
        label: '温度',
        current: currentTemperature ? `${currentTemperature}℃` : '未设置',
        requirement: fish.waterTemperature,
        status: !aquarium || !currentTemperature || !tempRange
          ? 'info'
          : currentTemperature >= tempRange.min && currentTemperature <= tempRange.max
            ? 'ok'
            : 'warning',
        advice: !aquarium || !currentTemperature
          ? '先在鱼缸设置中补充目标温度。'
          : currentTemperature >= (tempRange?.min || 0) && currentTemperature <= (tempRange?.max || 99)
            ? '当前温度在需求范围内。'
            : `建议调整到 ${fish.waterTemperature} 并保持稳定。`,
      },
      {
        label: 'pH',
        current: '未记录',
        requirement: phRange ? fish.phLevel : '资料不足',
        status: 'info',
        advice: phRange ? '当前鱼缸暂无 pH 数据，建议测试后再判断。' : '该物种缺少明确 pH 范围，可先按稳定水质管理。',
      },
      {
        label: '缸体大小',
        current: tankLiters ? `约 ${tankLiters}L` : '未设置',
        requirement: fish.tankSize,
        status: !tankLiters || !minLiters ? 'info' : tankLiters >= minLiters ? 'ok' : 'warning',
        advice: !tankLiters || !minLiters ? '先完善鱼缸尺寸，才能判断空间是否足够。' : tankLiters >= minLiters ? '空间基本满足最低建议。' : '当前水体偏小，建议先升级缸体或减少饲养密度。',
      },
      {
        label: '性情 / 混养',
        current: aquarium?.fishes.length ? `已有 ${aquarium.fishes.length} 种生物` : '暂无生物',
        requirement: fish.housingMode || '需观察',
        status: fish.housingMode === '建议单养' ? 'danger' : fish.housingMode === '谨慎混养' ? 'warning' : 'ok',
        advice: fish.housingReason || '建议加入混养计算后再确认组合风险。',
      },
      {
        label: '养护难度',
        current: '新手参考',
        requirement: getDifficultyLabel(fish.difficulty),
        status: fish.difficulty === 'Hard' ? 'danger' : fish.difficulty === 'Medium' ? 'warning' : 'ok',
        advice: fish.difficulty === 'Easy' ? '适合作为入门选择。' : fish.difficulty === 'Medium' ? '需要稳定水质和观察。' : '不建议新手直接尝试。',
      },
      {
        label: '设备需求',
        current: aquarium?.equipment?.heater ? '已配置加热棒' : '加热棒未确认',
        requirement: needsHeater ? '建议加热棒' : '无特殊加热需求',
        status: !needsHeater ? 'ok' : heaterMissing ? 'warning' : aquarium?.equipment?.heater ? 'ok' : 'info',
        advice: needsHeater ? '建议使用加热棒和温度计维持稳定水温。' : '按常规过滤、换水和观察即可。',
      },
    ] as Array<{ label: string; current: string; requirement: string; status: 'ok' | 'warning' | 'danger' | 'info'; advice: string }>;

    if (waterTypeMismatch) {
      items.unshift({
        label: '水体类型',
        current: aquarium?.waterType === 'Saltwater' ? '海水' : '淡水',
        requirement: isSaltwaterSpecies ? '海水' : '淡水',
        status: 'danger',
        advice: '当前鱼缸水体类型与该物种需求不一致，不建议直接加入。',
      });
    }

    const dangerCount = items.filter(item => item.status === 'danger').length;
    const warningCount = items.filter(item => item.status === 'warning').length;
    const infoCount = items.filter(item => item.status === 'info').length;
    const status = !aquarium || infoCount >= 3 ? 'unknown' : dangerCount > 0 ? 'risk' : warningCount > 0 ? 'warning' : 'suitable';
    const conclusion = status === 'suitable'
      ? '适合当前鱼缸，可以少量加入并观察 3-7 天。'
      : status === 'warning'
        ? '当前鱼缸有部分条件需要确认或调整，建议先看风险原因。'
        : status === 'risk'
          ? '不建议直接加入当前鱼缸，可能存在水体、空间或混养风险。'
          : '需要先完善鱼缸设置，才能判断适配度。';

    return {
      status,
      conclusion,
      items,
      risks: items.filter(item => item.status === 'warning' || item.status === 'danger'),
      infoCount,
    };
  };

  const addFishToAquarium = (fish: Fish, aquariumId: string, confirmedCaution = false) => {
    const appState = loadAppStateFromStorage();
    const aquariums = appState.aquariums.length > 0
      ? appState.aquariums
      : JSON.parse(localStorage.getItem('aquariums') || '[]') as Aquarium[];
    if (!Array.isArray(aquariums) || aquariums.length === 0) {
      setLastAddedToTankMessage('请先在“我的鱼缸”页面创建一个鱼缸。');
      return;
    }
    const aquarium = aquariums.find(item => item.id === aquariumId) || aquariums[0];
    const execution = executeSpeciesAddition({
      aquariums,
      aquarium,
      items: [{ fishId: fish.id, quantity: 1 }],
      speciesCatalog: fishData,
      confirmedCaution,
    });
    if (!execution.added) {
      if (execution.reason === 'confirmation_required') {
        setPendingTankAddConfirmed(true);
      } else if (execution.reason === 'missing_information') {
        setLastAddedToTankMessage('鱼缸信息不足，请先补充尺寸、水温或设备信息。');
      } else if (execution.reason === 'blocked') {
        setLastAddedToTankMessage('当前条件下不建议加入该生物，请先调整鱼缸或更换物种。');
      }
      return;
    }

    localStorage.setItem('aquariums', JSON.stringify(execution.aquariums));
    patchLocalAppState({ aquariums: execution.aquariums, currentAquariumId: aquarium.id }, { debounce: true });
    setOwnedFishIds(prev => new Set(prev).add(fish.id));
    setLastAddedToTankMessage(`已将 ${fish.name} 添加到 ${aquarium.name}。建议接下来观察 3-7 天。`);
    setSelectedFish(null);
    setPendingTankFish(null);
    setTargetAquariumId('');
    setPendingTankAddConfirmed(false);
  };

  const addCompatibilitySpeciesToAquarium = async (items: { fishId: string; quantity: number }[]) => {
    const appState = loadAppStateFromStorage();
    const aquariums: Aquarium[] = appState.aquariums.length > 0
      ? appState.aquariums
      : JSON.parse(localStorage.getItem('aquariums') || '[]');
    if (!Array.isArray(aquariums) || aquariums.length === 0) {
      throw new Error('请先在“我的鱼缸”页面创建一个鱼缸。');
    }

    const activeId = currentAquarium?.id || targetAquariumId || appState.currentAquariumId || aquariums[0].id;
    const activeAquarium = aquariums.find(item => item.id === activeId) || aquariums[0];
    const normalizedItems = items
      .filter(item => fishData.some(fish => fish.id === item.fishId))
      .map(item => ({
        fishId: item.fishId,
        quantity: Math.max(1, Number(item.quantity) || 1),
      }));

    if (normalizedItems.length === 0) {
      throw new Error('没有可加入当前鱼缸的新增生物。');
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
        : '当前组合不允许加入鱼缸。');
    }

    localStorage.setItem('aquariums', JSON.stringify(execution.aquariums));
    patchLocalAppState({ aquariums: execution.aquariums, currentAquariumId: activeAquarium.id });

    const updatedActiveAquarium = execution.aquariums.find(item => item.id === activeAquarium.id) || activeAquarium;
    setCurrentAquarium(updatedActiveAquarium);
    setTargetAquariumId(activeAquarium.id);
    setOwnedFishIds(prev => {
      const next = new Set(prev);
      normalizedItems.forEach(item => next.add(item.fishId));
      return next;
    });

    const addedNames = normalizedItems
      .map(item => fishData.find(fish => fish.id === item.fishId)?.name)
      .filter(Boolean)
      .join('、');
    const message = `已加入 ${normalizedItems.length} 种生物到 ${activeAquarium.name}${addedNames ? `：${addedNames}` : ''}。`;
    setLastAddedToTankMessage(message);
    setCalculatorFeedback(message);
    return { message };
  };

  const handleAddToTank = (fish: Fish) => {
    const appState = loadAppStateFromStorage();
    const aquariums: Aquarium[] = appState.aquariums.length > 0
      ? appState.aquariums
      : JSON.parse(localStorage.getItem('aquariums') || '[]');
    if (!Array.isArray(aquariums) || aquariums.length === 0) {
      setDetailFeedback('请先在“我的鱼缸”页面创建一个鱼缸。');
      return;
    }

    setPendingTankFish(fish);
    setTargetAquariumId(aquariums[0].id);
    setPendingTankAddConfirmed(false);
  };

  const openSpeciesPreview = (fish: Fish) => {
    setPreviewImages([{ src: getEncyclopediaImage(fish), title: fish.name }]);
    setPreviewIndex(0);
    setIsPreviewOpen(true);
  };

  const runCalculatorAddAnimation = (fish: Fish, origin?: HTMLElement | null) => {
    if (!origin || typeof window === 'undefined') return;
    const card = origin.closest('[data-species-card]');
    const image = card?.querySelector('[data-species-image]') as HTMLElement | null;
    const sourceRect = (image || origin).getBoundingClientRect();
    const targetRect = (
      document.getElementById('calculator-tab-target')
      || document.getElementById('calculator-sticky-target')
    )?.getBoundingClientRect();
    const target = targetRect
      ? { x: targetRect.left + targetRect.width - 44, y: targetRect.top + targetRect.height / 2 - 22 }
      : { x: window.innerWidth - 96, y: 22 };

    const animationId = `${fish.id}-${Date.now()}`;
    setFlyingThumbnail({
      id: animationId,
      src: getEncyclopediaImage(fish),
      name: fish.name,
      from: { x: sourceRect.left + sourceRect.width / 2 - 28, y: sourceRect.top + sourceRect.height / 2 - 28 },
      to: target,
      active: false,
    });
    window.setTimeout(() => {
      setFlyingThumbnail(prev => prev?.id === animationId ? { ...prev, active: true } : prev);
    }, 24);
    window.setTimeout(() => setFlyingThumbnail(prev => prev?.id === animationId ? null : prev), 920);
  };

  const triggerCalculatorPulse = () => {
    setCalculatorPulse(true);
    window.setTimeout(() => setCalculatorPulse(false), 900);
  };

  const handleAddToCalculator = (fish: Fish, origin?: HTMLElement | null) => {
    if (calculatorSpeciesIds.includes(fish.id)) {
      setCalculatorSpeciesIds(prev => prev.filter(id => id !== fish.id));
      setCalculatorFeedback(`已撤回 ${fish.name} 的混养计算选择。`);
      setDetailFeedback(`已撤回 ${fish.name} 的混养计算选择。`);
      triggerCalculatorPulse();
      return;
    }

    const nextCount = calculatorSpeciesIds.length + 1;
    runCalculatorAddAnimation(fish, origin);
    triggerCalculatorPulse();
    setCalculatorFeedback(nextCount >= 2 ? `已加入 ${nextCount} 种生物，可以查看混养风险。` : `已加入混养计算：${fish.name}，可继续添加其他生物。`);
    setDetailFeedback(nextCount >= 2 ? `已加入 ${nextCount} 种生物，去混养计算查看风险。` : '已加入混养计算，可继续添加其他生物。');
    setCalculatorSpeciesIds(prev => prev.includes(fish.id) ? prev : [...prev, fish.id]);
  };

  const applyFunctionFilter = (label: string) => {
    recordFilterUsage(label);
    setShowWishlistOnly(false);
    setSearchTerm('');
    setResultPage(0);
    setActiveFilters(prev => (
      (label === '全部' || prev.functionTag === label)
        ? emptyActiveFilters
        : { ...prev, keyword: '', functionTag: label }
    ));
  };

  const applyEnvironmentFilter = (label: string) => {
    recordFilterUsage(label);
    setShowWishlistOnly(false);
    setResultPage(0);
    setActiveFilters(prev => ({
      ...prev,
      environment: label === '全部' || prev.environment === label ? null : label,
    }));
  };

  useEffect(() => {
    if (!location.hash) return;
    if (location.hash === '#compatibility') {
      setShowWishlistOnly(false);
      setViewMode('compatibility');
      return;
    }
    if (location.hash === '#browse') {
      setShowWishlistOnly(false);
      setViewMode('browse');
      return;
    }
    if (location.hash === '#wishlist') {
      setViewMode('browse');
      setSearchTerm('');
      setActiveFilters(emptyActiveFilters);
      setShowWishlistOnly(true);
      setResultPage(0);
      return;
    }
    if (location.hash === '#suitable-current-tank') {
      setShowWishlistOnly(false);
      setViewMode('browse');
      setSearchTerm('');
      setActiveFilters(prev => ({ ...prev, keyword: '', functionTag: '适合当前鱼缸' }));
      setResultPage(0);
      return;
    }
    if (location.hash === '#more-filters') {
      setShowWishlistOnly(false);
      setViewMode('browse');
      setDraftFunctionTag(activeFilters.functionTag);
      setDraftEnvironment(activeFilters.environment);
      setFilterSheetMessage('');
      setIsMoreFilterOpen(true);
    }
  }, [location.hash]);

  const submitSearch = () => {
    setShowWishlistOnly(false);
    setActiveFilters(prev => ({ ...prev, keyword: searchTerm.trim() }));
  };

  const openSpeciesGroup = (group: SpeciesGroup, variantId?: string) => {
    const keyword = (activeFilters.keyword || searchTerm).trim();
    const matchedVariant = keyword
      ? group.variants.find(variant => speciesMatchesKeyword(variant, keyword))
      : null;
    setSelectedVariantId(variantId || (matchedVariant || group.representativeSpecies).id);
    setSelectedGroup(group);
  };

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
    setResultPage(0);
    if (!value.trim() && activeFilters.keyword) {
      setActiveFilters(prev => ({ ...prev, keyword: '' }));
    }
  };

  const aquariumSnapshots = getAquariumSnapshots();
  const referenceAquarium = aquariumSnapshots[0] || null;
  const selectedFit = selectedFish ? getSpeciesFitAssessment(selectedFish, referenceAquarium) : null;
  const selectedGroupFit = selectedGroupVariant ? fitEvaluations.get(selectedGroupVariant.id) : null;
  const selectedGroupCompatibility = selectedGroupVariant ? compatibilityEvaluations.get(selectedGroupVariant.id) : null;
  const pendingAquarium = aquariumSnapshots.find(item => item.id === targetAquariumId) || referenceAquarium;
  const pendingFit = pendingTankFish && pendingAquarium
    ? reviewSpeciesAdditions({
        aquarium: pendingAquarium,
        items: [{ fishId: pendingTankFish.id, quantity: 1 }],
        speciesCatalog: fishData,
      })
    : null;
  const pendingAddPolicy = pendingFit ? getTankCompatibilityAddPolicy(pendingFit.status) : null;
  const isOverlayOpen = !!selectedFish || !!selectedGroup || !!pendingTankFish || isCategoryDrawerOpen;

  const openSelectedVariantDetails = (fish: Fish) => {
    setSelectedGroup(null);
    window.requestAnimationFrame(() => setSelectedFish(fish));
  };
  const atlasModeItems = [
    { id: 'browse' as const, label: '浏览图鉴', description: '查找生物、分类和适配结果' },
    { id: 'compatibility' as const, label: '混养计算', description: '选择生物后查看混养风险' },
  ];

  return (
    <div className="page-frame-wide flex min-w-0 flex-col gap-6 overflow-x-hidden pt-[58px] md:pt-0 md:overflow-visible">
      {!isOverlayOpen && (
      <div className="fixed inset-x-0 top-0 z-[60] mx-auto grid w-full max-w-[430px] grid-cols-2 gap-1 bg-bg/95 px-3 pb-2 pt-[calc(8px+env(safe-area-inset-top))] shadow-sm backdrop-blur-md md:sticky md:inset-auto md:top-3 md:max-w-[560px] md:rounded-[30px] md:p-2 md:hidden">
        <div className="col-span-2 grid grid-cols-2 gap-1 rounded-full bg-white/90 p-1 ring-1 ring-border/70">
        {atlasModeItems.map(item => (
          <button
            key={item.id}
            id={item.id === 'compatibility' ? 'calculator-tab-target' : undefined}
            type="button"
            onClick={() => setViewMode(item.id as typeof viewMode)}
            className={`h-10 rounded-full text-[14px] font-black transition-colors ${
              viewMode === item.id ? 'bg-accent text-white shadow-sm' : 'text-ink/55 hover:text-ink'
            }`}
          >
            {item.label}
            {item.id === 'compatibility' && calculatorSpeciesIds.length > 0 && (
              <span className={`ml-1 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] transition-all ${
                calculatorPulse
                  ? 'scale-125 bg-emerald-300 text-emerald-950 shadow-sm'
                  : viewMode === item.id
                    ? 'bg-white/25 text-white'
                    : 'bg-emerald-100 text-emerald-700'
              }`}>
                {calculatorSpeciesIds.length}
              </span>
            )}
          </button>
        ))}
        </div>
      </div>
      )}
      {lastAddedToTankMessage && (
        <div className="flex items-center justify-between gap-3 rounded-[16px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12px] font-bold text-emerald-800">
          <span>{lastAddedToTankMessage}</span>
          <button type="button" onClick={() => setLastAddedToTankMessage('')} className="shrink-0 rounded-full bg-white/70 px-2 py-1 text-[10px] font-black text-emerald-700">
            知道了
          </button>
        </div>
      )}

      <div className="min-w-0">
        <aside className="hidden">
          <div className="p-0">
            <div className="grid gap-2">
              {atlasModeItems.map(item => {
                const isActive = viewMode === item.id;
                return (
                  <button
                    key={item.id}
                    id={item.id === 'compatibility' ? 'calculator-tab-target' : undefined}
                    type="button"
                    onClick={() => setViewMode(item.id)}
                    className={`rounded-[20px] px-3 py-3 text-left transition-colors ${
                      isActive
                        ? 'bg-accent text-white shadow-[0_12px_26px_rgba(27,77,62,0.18)]'
                        : 'bg-bg/60 text-ink/56 hover:bg-emerald-50 hover:text-accent'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[14px] font-black">{item.label}</span>
                      {item.id === 'compatibility' && calculatorSpeciesIds.length > 0 && (
                        <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                          isActive ? 'bg-white/22 text-white' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {calculatorSpeciesIds.length}
                        </span>
                      )}
                    </span>
                    <span className={`mt-1 block text-[10px] font-bold leading-relaxed ${isActive ? 'text-white/64' : 'text-ink/38'}`}>
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
        <div className="min-w-0">

      {viewMode === 'browse' ? (
      <div className="flex flex-col gap-5">
      <div className="atlas-sticky-toolbar grid grid-cols-1 gap-4 md:grid-cols-[420px_minmax(0,1fr)] md:items-center md:gap-3 md:rounded-[22px] md:border md:border-white/80 md:bg-white/82 md:p-3 md:shadow-sm">
        <div className="relative min-w-0 md:mx-auto md:max-w-[560px] md:mx-0 md:w-[420px] md:max-w-[420px] md:flex-none">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/42" />
          <Input
            placeholder="搜索鱼、虾、螺、水草或用途"
            className="h-11 rounded-full border-border bg-white pl-9 pr-12 text-[14px] font-medium text-ink placeholder:text-ink/42"
            value={searchTerm}
            onChange={(e) => handleSearchTermChange(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitSearch();
            }}
          />
          <button
            type="button"
            aria-label="搜索"
            onClick={submitSearch}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-accent-light text-accent"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        <section className="mx-auto flex w-full max-w-[720px] flex-col gap-2 md:mx-0 md:min-w-0 md:max-w-none">
          <div className="flex items-center justify-between gap-3 md:hidden">
            <div>
              <div className="text-[15px] font-black text-ink">快速找</div>
              <div className="mt-0.5 text-[11px] font-bold text-ink/42">先给你 3 个最常用入口。</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {primaryFunctionFilterOptions.map(label => {
              const isActive = activeFilters.functionTag === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => applyFunctionFilter(label)}
                  className={`inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-4 text-[12px] font-black leading-none transition-colors ${
                    isActive
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-border bg-white text-ink/54 hover:border-accent/40 hover:text-accent'
                  }`}
                >
                  {label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setDraftFunctionTag(activeFilters.functionTag);
                setDraftEnvironment(activeFilters.environment);
                setIsMoreFilterOpen(true);
              }}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
              aria-label="更多筛选条件"
              title="更多筛选条件"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </section>

        <div className="atlas-result-summary mx-auto grid w-full max-w-[960px] gap-3 rounded-[14px] border border-border/70 bg-white px-3 py-2 shadow-sm md:col-span-2 md:max-w-none md:grid-cols-1 md:items-center md:px-4 md:py-3 xl:grid-cols-[minmax(220px,1fr)_auto_minmax(280px,360px)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-black text-ink">
                {resultTitle} · 当前展示 {pagedAtlasItems.length} 个条目
              </div>
              <div className="mt-0.5 truncate text-[10px] font-medium text-ink/45">
                {isSuitableCurrentTankFilter
                  ? `已按水质、温度、空间、设备和混养基础条件筛选 · 第 ${currentResultPage + 1}/${resultPageCount} 组`
                  : `匹配物种 ${filteredFishes.length} 种 · 展示 ${resultItemCount} 个品类/物种 · 第 ${currentResultPage + 1}/${resultPageCount} 组`}
              </div>
            </div>
            {hasAnyActiveCriteria && (
              <button
                type="button"
                onClick={clearFilters}
                className="shrink-0 rounded-full bg-bg px-2.5 py-1.5 text-[10px] font-black text-ink/50"
              >
                清除
              </button>
            )}
          </div>
          {resultItemCount > resultPageSize && (
            <div className="atlas-inline-pager hidden min-w-0 items-center justify-center gap-2 md:flex">
              <button
                type="button"
                onClick={() => goToResultPage(currentResultPage - 1)}
                disabled={currentResultPage === 0}
                className="inline-flex h-10 min-w-[94px] items-center justify-center gap-1 whitespace-nowrap rounded-full border border-border bg-white px-3 text-[12px] font-black text-ink/64 shadow-sm transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:bg-bg disabled:text-ink/26 disabled:shadow-none"
                aria-label="上一组图鉴"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                上一组
              </button>
              <div className="min-w-[110px] whitespace-nowrap rounded-full bg-emerald-50 px-4 py-2 text-center text-[12px] font-black text-emerald-800 ring-1 ring-emerald-100">
                第 {currentResultPage + 1} / {resultPageCount} 组
              </div>
              <button
                type="button"
                onClick={() => goToResultPage(currentResultPage + 1)}
                disabled={currentResultPage >= resultPageCount - 1}
                className="inline-flex h-10 min-w-[94px] items-center justify-center gap-1 whitespace-nowrap rounded-full border border-border bg-white px-3 text-[12px] font-black text-ink/64 shadow-sm transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:bg-bg disabled:text-ink/26 disabled:shadow-none"
                aria-label="下一组图鉴"
              >
                下一组
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          {resultItemCount > resultPageSize && (
            <div className="w-full rounded-[18px] border border-emerald-100 bg-emerald-50/75 px-4 py-3 shadow-sm xl:min-w-[280px]">
              <div className="mb-2 flex items-center justify-between text-[12px] font-black text-ink/58">
                <span>拖动切换图鉴组</span>
                <span>{currentResultPage * resultPageSize + 1}-{Math.min((currentResultPage + 1) * resultPageSize, resultItemCount)} / {resultItemCount}</span>
              </div>
              <div className="grid items-center">
                <input
                  type="range"
                  min={1}
                  max={resultPageCount}
                  step={1}
                  value={currentResultPage + 1}
                  onChange={(event) => goToResultPage(Number(event.target.value) - 1)}
                  aria-label="拖动切换图鉴结果页"
                  className="h-4 w-full cursor-pointer accent-emerald-700"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-ink/48">
                <span>第 1 组</span>
                <span>第 {resultPageCount} 组</span>
              </div>
            </div>
          )}
        </div>
      </div>

        <div ref={atlasGridTopRef} className="mt-1 grid scroll-mt-[178px] grid-cols-2 gap-2.5 md:col-span-2 md:grid-cols-2 md:gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {pagedAtlasItems.map((item) => {
            if (item.kind === 'group') {
              const group = item.group;
              const fish = group.representativeSpecies;
              const isOwned = group.variants.some(variant => ownedFishIds.has(variant.id));
              const theme = getFishTemperatureTheme(fish.waterTemperature);
              const isInCalculator = calculatorSpeciesIds.includes(fish.id);
              const isMarine = isSaltwaterSpecies(fish);
              const previewVariants = group.variants.slice(0, 4);
              const hiddenVariantCount = Math.max(0, group.variantCount - previewVariants.length);

              return (
                <div
                  key={group.groupId}
                  data-species-group-card
                  className={`flex min-h-[356px] flex-col gap-2 rounded-[16px] border bg-white p-2.5 shadow-sm transition-colors md:min-h-[430px] md:w-full ${
                    isInCalculator
                      ? 'border-emerald-500 ring-2 ring-emerald-100'
                      : isMarine
                        ? 'border-sky-300 ring-1 ring-sky-100 hover:border-sky-400'
                        : isOwned
                          ? 'border-accent/50'
                          : 'border-border/70 hover:border-accent/30'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openSpeciesGroup(group)}
                    aria-label={`查看${group.groupName}品类`}
                    data-species-card-image-area
                    className={`w-full aspect-square min-h-[150px] flex items-center justify-center overflow-visible relative rounded-[16px] border md:min-h-[170px] ${
                      isInCalculator
                        ? `border-emerald-100 bg-emerald-50/18 ${getSpeciesImageSurfaceClass(fish)}`
                        : isMarine
                          ? 'border-sky-100 bg-sky-50/20'
                          : `border-transparent bg-transparent ${getSpeciesImageSurfaceClass(fish)}`
                    }`}
                  >
                    <span className="absolute right-1.5 top-1.5 z-10 rounded-full border border-emerald-100 bg-white/94 px-1.5 py-0.5 text-[9px] font-black text-emerald-700 shadow-sm">
                      {group.variantCount} 个变种
                    </span>
                    {theme.needsHeater && (
                      <span className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-amber-100 bg-white/92 text-amber-600 shadow-sm" title="建议稳定加热">
                        <Thermometer className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <img
                      src={getEncyclopediaImage(fish)}
                      alt={group.groupName}
                      data-species-image
                      loading="lazy"
                      decoding="async"
                      className={`max-h-[88%] max-w-[88%] object-contain transition-opacity duration-300 ${getSpeciesImageClass(fish)}`}
                      referrerPolicy="no-referrer"
                    />
                  </button>
                  <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                    <div className="min-h-[62px]">
                      <button type="button" onClick={() => openSpeciesGroup(group)} className="block w-full text-left">
                        <h2 className="font-serif text-[16px] italic leading-tight text-ink font-bold whitespace-normal break-words [overflow-wrap:anywhere]">
                          {group.groupName}
                        </h2>
                      </button>
                      <p className="mt-0.5 line-clamp-2 text-[12px] font-bold leading-snug text-ink/54">
                        品类集合 / {group.variantCount} 个规格可选
                      </p>
                    </div>
                    <div className="grid min-h-[66px] grid-cols-5 items-start gap-1 overflow-hidden">
                      {previewVariants.map(variant => (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => openSpeciesGroup(group, variant.id)}
                          className="group flex min-w-0 flex-col items-center gap-1"
                          aria-label={`查看${variant.name}`}
                        >
                          <span className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-bg shadow-sm transition-colors group-hover:border-emerald-300 ${getSpeciesImageSurfaceClass(variant)}`}>
                            <img
                              src={getEncyclopediaImage(variant)}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className={`max-h-[84%] max-w-[84%] object-contain ${getSpeciesImageClass(variant)}`}
                              referrerPolicy="no-referrer"
                            />
                          </span>
                          <span className="block max-w-full truncate text-center text-[9px] font-black leading-tight text-ink/48 group-hover:text-emerald-700">
                            {getVariantLabel(variant, group)}
                          </span>
                        </button>
                      ))}
                      {hiddenVariantCount > 0 && (
                        <button
                          type="button"
                          onClick={() => openSpeciesGroup(group)}
                          className="flex min-w-0 flex-col items-center gap-1"
                          aria-label={`查看其余${hiddenVariantCount}个变种`}
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-emerald-200 bg-emerald-50 text-[11px] font-black text-emerald-700">
                            +{hiddenVariantCount}
                          </span>
                          <span className="block text-[9px] font-black leading-tight text-ink/42">更多</span>
                        </button>
                      )}
                    </div>
                    <div className="mt-auto grid grid-cols-2 gap-2 pt-2 md:grid md:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => openSpeciesGroup(group)}
                        className="h-9 w-full rounded-full border border-border bg-white text-[11px] font-black text-ink/55 hover:border-accent hover:text-accent"
                      >
                        查看品类
                      </button>
                      <button
                        type="button"
                        onClick={(event) => handleAddToCalculator(fish, event.currentTarget)}
                        className={`h-9 w-full rounded-full text-[11px] font-black ${
                          isInCalculator
                            ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                            : 'bg-accent text-white hover:bg-accent/90'
                        }`}
                      >
                        {isInCalculator ? '已选择' : '选择计算'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
            const fish = item.fish;
            const isOwned = ownedFishIds.has(fish.id);
            const imageClass = isOwned ? 'opacity-100' : 'opacity-90';
            const theme = getFishTemperatureTheme(fish.waterTemperature);
            const isInCalculator = calculatorSpeciesIds.includes(fish.id);
            const isMarine = isSaltwaterSpecies(fish);
            const compactTags = getSpeciesFunctionTags(fish);

            return (
              <div 
                key={fish.id} 
                data-species-card
                className={`flex min-h-[356px] flex-col gap-2 rounded-[16px] border bg-white p-2.5 shadow-sm transition-colors md:min-h-[430px] md:w-full ${
                  isInCalculator
                    ? 'border-emerald-500 ring-2 ring-emerald-100'
                    : isMarine
                      ? 'border-sky-300 ring-1 ring-sky-100 hover:border-sky-400'
                      : isOwned
                        ? 'border-accent/50'
                        : 'border-border/70 hover:border-accent/30'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedFish(fish)}
                  aria-label={`查看${fish.name}详情`}
                  data-species-card-image-area
                  className={`w-full aspect-square min-h-[150px] flex items-center justify-center overflow-visible relative rounded-[16px] border md:min-h-[170px] ${
                  isInCalculator
                    ? `border-emerald-100 bg-emerald-50/18 ${getSpeciesImageSurfaceClass(fish)}`
                    : isMarine
                      ? 'border-sky-100 bg-sky-50/20'
                      : `border-transparent bg-transparent ${getSpeciesImageSurfaceClass(fish)}`
                }`}
                >
                  {isInCalculator && (
                    <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-black text-white shadow-sm">
                      已选择
                    </span>
                  )}
                  {isMarine && !isInCalculator && (
                    <span className="absolute right-1.5 top-1.5 z-10 rounded-full border border-sky-100 bg-white/92 px-1.5 py-0.5 text-[9px] font-black text-sky-700 shadow-sm">
                      海缸
                    </span>
                  )}
                  {theme.needsHeater && (
                    <span className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-amber-100 bg-white/92 text-amber-600 shadow-sm" title="建议稳定加热">
                      <Thermometer className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <img 
                    src={getEncyclopediaImage(fish)} 
                    alt={fish.name} 
                    data-species-image
                    loading="lazy"
                    decoding="async"
                    className={`max-h-[88%] max-w-[88%] object-contain transition-opacity duration-300 ${imageClass} ${getSpeciesImageClass(fish)}`}
                    referrerPolicy="no-referrer"
                  />
                </button>
              <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                <div className="min-h-[54px]">
                  <button type="button" onClick={() => setSelectedFish(fish)} className="block w-full text-left">
                    <h2 className="font-serif text-[16px] italic leading-tight text-ink font-bold whitespace-normal break-words [overflow-wrap:anywhere]">
                      {fish.name}
                    </h2>
                  </button>
                  <p className="mt-0.5 line-clamp-1 text-[12px] font-bold leading-snug text-ink/54">{getSpeciesRole(fish)}</p>
                </div>
                <div className="flex min-h-[48px] max-h-[48px] flex-wrap content-start gap-1 overflow-hidden">
                  {compactTags.slice(0, 3).map(tag => (
                    <span key={tag} className={`px-1.5 py-0.5 text-[10px] font-bold border rounded-full ${
                      tag === '建议单养'
                        ? 'bg-red-50 text-red-600 border-red-100'
                        : tag === '谨慎混养'
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2 pt-2 md:grid md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFish(fish)}
                    className="h-9 w-full rounded-full border border-border bg-white text-[11px] font-black text-ink/55 hover:border-accent hover:text-accent"
                  >
                    详情
                  </button>
                  <button
                    type="button"
                    onClick={(event) => handleAddToCalculator(fish, event.currentTarget)}
                    className={`h-9 w-full rounded-full text-[11px] font-black ${
                      isInCalculator
                        ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-accent text-white hover:bg-accent/90'
                    }`}
                  >
                    {isInCalculator ? '已选择' : '选择计算'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {resultItemCount > resultPageSize && (
        <div className="mt-5 flex w-full justify-center">
          <div className="inline-flex max-w-full flex-col items-center gap-2 rounded-[22px] border border-white/80 bg-white/88 px-3 py-3 shadow-sm backdrop-blur-sm sm:flex-row sm:rounded-full sm:px-4">
            <button
              type="button"
              onClick={() => goToResultPage(currentResultPage - 1)}
              disabled={currentResultPage === 0}
              className="flex h-11 min-w-[112px] items-center justify-center gap-1.5 rounded-full border border-border bg-white px-4 text-[13px] font-black text-ink/70 shadow-sm transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:bg-bg disabled:text-ink/28 disabled:shadow-none"
              aria-label="上一组图鉴"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              上一组
            </button>
            <div className="min-w-[104px] rounded-full bg-emerald-50 px-4 py-2 text-center text-[12px] font-black text-emerald-800 ring-1 ring-emerald-100">
              第 {currentResultPage + 1} / {resultPageCount} 组
            </div>
            <button
              type="button"
              onClick={() => goToResultPage(currentResultPage + 1)}
              disabled={currentResultPage >= resultPageCount - 1}
              className="flex h-11 min-w-[112px] items-center justify-center gap-1.5 rounded-full border border-border bg-white px-4 text-[13px] font-black text-ink/70 shadow-sm transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:bg-bg disabled:text-ink/28 disabled:shadow-none"
              aria-label="下一组图鉴"
            >
              下一组
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {filteredFishes.length === 0 && (
        <div className="rounded-[18px] border border-dashed border-border bg-bg px-5 py-12 text-center">
          <div className="text-[15px] font-black text-ink">{showWishlistOnly ? '还没有种草的生物' : '没有找到相关条目'}</div>
          <div className="mx-auto mt-2 max-w-[260px] text-[12px] font-medium leading-relaxed text-ink/55">
            {showWishlistOnly ? '在图鉴里点击心形或“加入种草”，收藏的生物会出现在这里。' : '可以换个关键词，例如：莫斯、水榕、灯鱼、虾、螺。'}
          </div>
          {!showWishlistOnly && resultFilterLabels.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {resultFilterLabels.map(label => (
                <span key={label} className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-ink/50 ring-1 ring-border">
                  {label}
                </span>
              ))}
            </div>
          )}
          {!showWishlistOnly && resultFilterLabels.length > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-emerald-700 px-5 text-[12px] font-black text-white"
            >
              清除筛选
            </button>
          )}
        </div>
      )}

      {calculatorSpeciesIds.length > 0 && (
        <div
          id="calculator-sticky-target"
          className={`order-[2] sticky bottom-3 z-30 rounded-full border px-3 py-2 shadow-lg backdrop-blur transition-colors ${
            calculatorPulse
              ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200'
              : 'border-emerald-100 bg-white/95'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 truncate text-[12px] font-black text-ink">
                <span>混养计算</span>
                <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] transition-all ${
                  calculatorPulse ? 'scale-125 bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {calculatorSpeciesIds.length}
                </span>
              </div>
              <div className="truncate text-[10px] font-medium text-ink/45">{calculatorFeedback || '可继续添加其他生物。'}</div>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('compatibility')}
              className="shrink-0 rounded-full bg-emerald-700 px-3 py-1.5 text-[11px] font-black text-white"
            >
              {calculatorSpeciesIds.length >= 2 ? '查看风险' : '去计算'}
            </button>
          </div>
        </div>
      )}
      {flyingThumbnail && (
        <div
          className="pointer-events-none fixed z-[90] flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-300 bg-white p-1.5 shadow-2xl transition-all duration-700 ease-out"
          style={{
            left: 0,
            top: 0,
            transform: `translate3d(${flyingThumbnail.active ? flyingThumbnail.to.x : flyingThumbnail.from.x}px, ${flyingThumbnail.active ? flyingThumbnail.to.y : flyingThumbnail.from.y}px, 0) scale(${flyingThumbnail.active ? 0.42 : 1})`,
            opacity: flyingThumbnail.active ? 0.25 : 1,
          }}
          aria-hidden="true"
        >
          <img src={flyingThumbnail.src} alt={flyingThumbnail.name} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
        </div>
      )}
      </div>
      ) : (
        <CompatibilityRiskCalculator
          speciesIds={calculatorSpeciesIds}
          onSpeciesIdsChange={setCalculatorSpeciesIds}
          preferredSpeciesIds={Array.from(ownedFishIds)}
          aquariums={aquariumSnapshots}
          activeAquariumId={currentAquarium?.id || targetAquariumId}
          onAddToAquarium={addCompatibilitySpeciesToAquarium}
          onBrowseAtlas={() => {
            setViewMode('browse');
            window.requestAnimationFrame(() => {
              document.getElementById('calculator-tab-target')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          }}
        />
      )}
        </div>
      </div>

      <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)}>
        <DialogContent className="w-[94vw] max-w-[920px] overflow-hidden rounded-[24px] border-border bg-white p-0">
          {selectedGroup && selectedGroupVariant && (
            <div className="flex max-h-[86dvh] flex-col">
          <DialogHeader className="border-b border-border/70 px-6 py-4 text-left">
                <DialogTitle className="text-[20px] font-black text-ink">{selectedGroup.groupName}</DialogTitle>
                <DialogDescription className="text-[12px] font-bold text-ink/50">
                  共 {selectedGroup.variantCount} 个变种，选择具体规格后再进入混养计算或完整详情。
                </DialogDescription>
              </DialogHeader>
          <div className="modalBody app-scrollbar-hidden flex-1 overflow-y-auto px-6 py-4 pb-8">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.82fr)]">
                  <button
                    type="button"
                    onClick={() => openSpeciesPreview(selectedGroupVariant)}
                    className={`flex min-h-[240px] items-center justify-center rounded-[22px] bg-bg p-5 ${getSpeciesImageSurfaceClass(selectedGroupVariant)}`}
                    aria-label={`放大查看${selectedGroupVariant.name}`}
                  >
                    <img
                      src={getEncyclopediaImage(selectedGroupVariant)}
                      alt={selectedGroupVariant.name}
                      loading="lazy"
                      decoding="async"
                      className={`max-h-[260px] max-w-full object-contain ${getSpeciesImageClass(selectedGroupVariant)}`}
                      referrerPolicy="no-referrer"
                    />
                  </button>
                  <section className="flex min-w-0 flex-col gap-3">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-emerald-700">当前规格</p>
                          <h3 className="mt-1 font-serif text-[24px] font-bold italic leading-tight text-ink">
                            {selectedGroupVariant.name}
                          </h3>
                          <p className="mt-1 text-[12px] font-medium italic text-ink/46">{selectedGroupVariant.scientificName}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black ${getDifficultyBadgeClass(selectedGroupVariant.difficulty)}`}>
                          {getDifficultyLabel(selectedGroupVariant.difficulty)}
                        </span>
                      </div>
                      <p className="mt-3 text-[12px] font-bold leading-relaxed text-ink/60">{getSpeciesRole(selectedGroupVariant)}</p>
                    </div>

                    <div className="rounded-[18px] border border-border/70 bg-bg/50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-[13px] font-black text-ink">选择规格</div>
                        <div className="text-[11px] font-bold text-ink/42">{selectedGroup.variantCount} 个可选</div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                        {selectedGroup.variants.map(variant => {
                          const active = variant.id === selectedGroupVariant.id;
                          return (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => setSelectedVariantId(variant.id)}
                              className={`flex min-w-0 flex-col items-center gap-1.5 rounded-[16px] border px-1.5 py-2 text-center transition-colors ${
                                active
                                  ? 'border-emerald-700 bg-emerald-50 text-emerald-800 shadow-sm ring-2 ring-emerald-100'
                                  : 'border-border bg-white text-ink/60 hover:border-emerald-200 hover:text-emerald-700'
                              }`}
                            >
                              <span className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border bg-bg ${active ? 'border-emerald-200' : 'border-border/70'} ${getSpeciesImageSurfaceClass(variant)}`}>
                                <img
                                  src={getEncyclopediaImage(variant)}
                                  alt=""
                                  loading="lazy"
                                  decoding="async"
                                  className={`max-h-[84%] max-w-[84%] object-contain ${getSpeciesImageClass(variant)}`}
                                  referrerPolicy="no-referrer"
                                />
                              </span>
                              <span className="block max-w-full truncate text-[10px] font-black leading-tight">
                                {getVariantLabel(variant, selectedGroup)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ['水温', selectedGroupVariant.waterTemperature],
                        ['pH', selectedGroupVariant.phLevel],
                        ['缸体', selectedGroupVariant.tankSize],
                        [
                          '适配',
                          selectedGroupCompatibility?.status === 'compatible'
                            ? '适合当前鱼缸'
                            : selectedGroupCompatibility?.status === 'caution'
                              ? '需谨慎确认'
                              : selectedGroupCompatibility?.status === 'not_recommended'
                                ? '不建议加入'
                                : selectedGroupCompatibility?.status === 'insufficient_data'
                                  ? '信息不足'
                                  : selectedGroupFit?.status === 'suitable'
                                    ? '适合当前鱼缸'
                                    : selectedGroupFit?.status === 'adjustable'
                                      ? '需确认'
                                      : selectedGroupFit?.status === 'unsuitable'
                                        ? '不适合'
                                        : '待评估',
                        ],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-[16px] bg-bg px-3 py-3">
                          <div className="text-[10px] font-black text-ink/38">{label}</div>
                          <div className="mt-1 line-clamp-2 text-[13px] font-black text-ink">{value}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
          <DialogFooter className="border-t border-border/70 bg-white px-6 pb-[calc(22px+env(safe-area-inset-bottom))] pt-4">
            <div className="grid w-full gap-2 sm:grid-cols-[1fr_1fr]">
                  <button
                    type="button"
                    onClick={(event) => handleAddToCalculator(selectedGroupVariant, event.currentTarget)}
                    className="h-11 rounded-full bg-accent px-5 text-[13px] font-black text-white hover:bg-accent/90"
                  >
                    {calculatorSpeciesIds.includes(selectedGroupVariant.id) ? '已加入计算' : '选择该变种计算'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openSelectedVariantDetails(selectedGroupVariant)}
                    className="h-11 rounded-full border border-border bg-white px-5 text-[13px] font-black text-ink/62 hover:border-accent hover:text-accent"
                  >
                    查看完整详情
                  </button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SpeciesDetailDialog
        fish={selectedFish}
        open={!!selectedFish}
        source="atlas"
        aquariumContext={referenceAquarium}
        imageSrc={selectedFish ? getEncyclopediaImage(selectedFish) : ''}
        owned={!!selectedFish && ownedFishIds.has(selectedFish.id)}
        inCalculator={!!selectedFish && calculatorSpeciesIds.includes(selectedFish.id)}
        inWishlist={!!selectedFish && wishlistFishIds.has(selectedFish.id)}
        detailFeedback={detailFeedback}
        onOpenChange={(open) => !open && setSelectedFish(null)}
        onAddToTank={handleAddToTank}
        onAddToCalculator={handleAddToCalculator}
        onToggleWishlist={toggleWishlist}
        onGoCalculator={() => { setSelectedFish(null); setViewMode('compatibility'); }}
        onRecordDeath={(fish) => {
          const appState = loadAppStateFromStorage();
          const records = appState.deceasedRecords.length > 0
            ? [...appState.deceasedRecords]
            : JSON.parse(localStorage.getItem('deceasedRecords') || '[]');
          records.push({ id: Math.random().toString(36).substring(2, 9), fishId: fish.id, date: new Date().toISOString() });
          localStorage.setItem('deceasedRecords', JSON.stringify(records));
          patchLocalAppState({ deceasedRecords: records }, { debounce: true });
          setDetailFeedback(`已记录 ${fish.name} 为逝去的生物。`);
        }}
      />

      <Dialog open={false} onOpenChange={(open) => !open && setSelectedFish(null)}>
        <DialogContent className="w-[92vw] max-w-[640px] p-0 overflow-hidden border-border rounded-[18px]">
          {selectedFish && selectedFit && (
            <ScrollArea className="max-h-[88vh]">
              <div className="bg-white">
                <div className="border-b border-border bg-gradient-to-br from-white via-sky-50/50 to-emerald-50/60 p-4">
                  <button
                    type="button"
                    onClick={() => openSpeciesPreview(selectedFish)}
                    data-species-detail-hero
                    className={`flex h-[250px] w-full items-center justify-center rounded-[18px] border border-transparent bg-transparent p-3 ${getSpeciesImageSurfaceClass(selectedFish)}`}
                    aria-label={`放大查看${selectedFish.name}图片`}
                  >
                    <img
                      src={getEncyclopediaImage(selectedFish)}
                      alt={selectedFish.name}
                      className={`max-h-[84%] max-w-[84%] object-contain ${getSpeciesImageClass(selectedFish)}`}
                      referrerPolicy="no-referrer"
                    />
                  </button>
                  <div className="mt-4 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <DialogTitle className="font-serif text-[22px] italic font-bold leading-tight text-ink">{selectedFish.name}</DialogTitle>
                        <DialogDescription className="mt-1 text-[11px] font-medium leading-tight text-ink/55">{selectedFish.scientificName}</DialogDescription>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${getDifficultyBadgeClass(selectedFish.difficulty)}`}>
                        {getDifficultyLabel(selectedFish.difficulty)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[selectedTaxonomy?.variety, selectedFish.housingMode, ...getToolFunctions(selectedFish)].filter(Boolean).slice(0, 3).map(tag => {
                        const displayTag = tag === '主题生物' ? '观赏主角' : tag === '单独饲养' ? '建议单养' : tag;
                        return (
                          <span key={tag} className="rounded-full border border-border bg-white px-2 py-1 text-[10px] font-bold text-ink/60">
                            {displayTag}
                          </span>
                        );
                      })}
                    </div>
                    <p className="mt-3 line-clamp-1 text-[12px] font-medium leading-relaxed text-ink/62">{getSpeciesRole(selectedFish)}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-4 md:p-6">
                  <div className={`rounded-[18px] border p-4 ${
                    selectedFit.status === 'suitable'
                      ? 'border-emerald-100 bg-emerald-50/80'
                      : selectedFit.status === 'risk'
                        ? 'border-red-100 bg-red-50/80'
                        : selectedFit.status === 'warning'
                          ? 'border-amber-100 bg-amber-50/80'
                          : 'border-sky-100 bg-sky-50/80'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white ${
                        selectedFit.status === 'suitable' ? 'text-emerald-600' : selectedFit.status === 'risk' ? 'text-red-600' : selectedFit.status === 'warning' ? 'text-amber-600' : 'text-sky-600'
                      }`}>
                        {selectedFit.status === 'suitable' ? <CheckCircle2 className="h-5 w-5" /> : selectedFit.status === 'unknown' ? <Info className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-black text-ink/45">能不能养</div>
                        <p className="mt-1 text-[18px] font-black leading-tight text-ink">
                          {selectedFit.status === 'suitable'
                            ? '适合加入'
                            : selectedFit.status === 'risk'
                              ? '不建议加入当前鱼缸'
                              : selectedFit.status === 'warning'
                                ? '谨慎加入'
                                : '先完善鱼缸设置'}
                        </p>
                        <p className="mt-1 text-[12px] font-bold leading-relaxed text-ink/68">{selectedFit.conclusion}</p>
                        <p className="mt-1 text-[11px] font-medium text-ink/55">
                          参考鱼缸：{referenceAquarium ? `${referenceAquarium.name} · ${referenceAquarium.waterType === 'Saltwater' ? '海水' : '淡水'} · ${referenceAquarium.targetTemperature || '温度未设置'}℃` : '暂无鱼缸数据'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <section className="grid grid-cols-3 gap-2">
                    {selectedFit.items
                      .filter(item => ['温度', '缸体大小', '性情 / 混养'].includes(item.label))
                      .slice(0, 3)
                      .map(item => (
                        <div key={item.label} className="rounded-[14px] border border-border bg-bg/45 p-2">
                          <div className="text-[11px] font-black text-ink">{item.label === '缸体大小' ? '空间' : item.label.replace(' / 混养', '')}</div>
                          {item.status !== 'ok' && (
                            <div className="mt-1 line-clamp-2 text-[9px] font-medium leading-snug text-ink/48">
                              需求：{item.requirement}
                              <span className={getFitCurrentClass(item.status)}>（当前：{item.current}）</span>
                            </div>
                          )}
                          <span className={`mt-2 inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-black ${getFitStatusClass(item.status)}`}>
                            {getFitStatusLabel(item.status)}
                          </span>
                        </div>
                      ))}
                  </section>

                  <div className="grid gap-2">
                    {ownedFishIds.has(selectedFish.id) ? (
                      <div className="flex h-11 items-center justify-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 text-sm font-black text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" /> 已在鱼缸中
                      </div>
                    ) : (
                      <Button
                        className="h-11 rounded-full bg-accent text-sm font-black text-white hover:bg-accent/90"
                        onClick={() => handleAddToTank(selectedFish)}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        {selectedFit.status === 'unknown' ? '完善后再确认添加' : selectedFit.status === 'risk' ? '查看风险后确认添加' : '添加到我的鱼缸'}
                      </Button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className={`h-9 rounded-full text-xs font-black ${calculatorSpeciesIds.includes(selectedFish.id) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border text-ink/65'}`}
                        onClick={() => handleAddToCalculator(selectedFish)}
                      >
                        {calculatorSpeciesIds.includes(selectedFish.id) ? '已选择' : '加入混养计算'}
                      </Button>
                      <Button
                        variant="outline"
                        className={`h-9 rounded-full text-xs font-black ${wishlistFishIds.has(selectedFish.id) ? 'border-rose-200 bg-rose-50 text-rose-500' : 'border-border text-ink/65'}`}
                        onClick={() => toggleWishlist(selectedFish.id)}
                      >
                        {wishlistFishIds.has(selectedFish.id) ? <Heart className="mr-1 h-4 w-4 fill-current" /> : <HeartOff className="mr-1 h-4 w-4" />}
                        {wishlistFishIds.has(selectedFish.id) ? '已种草' : '加入种草'}
                      </Button>
                    </div>
                    {detailFeedback && (
                      <div className="flex items-center justify-between gap-2 rounded-[14px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
                        <span>{detailFeedback}</span>
                        {calculatorSpeciesIds.length > 0 && (
                          <button type="button" className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-emerald-700" onClick={() => { setSelectedFish(null); setViewMode('compatibility'); }}>
                            去计算
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <details className="rounded-[16px] border border-border bg-white p-3 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-black text-ink">
                      基础需求
                      <ChevronRight className="h-4 w-4 text-ink/38" />
                    </summary>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                      {[
                        ['温度', selectedFish.waterTemperature],
                        ['最小缸体', selectedFish.tankSize],
                        ['加热', getFishTemperatureTheme(selectedFish.waterTemperature).needsHeater ? '建议稳定加热' : '通常不需加热'],
                        ['新手适合', selectedFish.difficulty === 'Easy' ? '适合' : selectedFish.difficulty === 'Medium' ? '一般' : '不建议新手'],
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
                      混养与风险
                      <ChevronRight className="h-4 w-4 text-ink/38" />
                    </summary>
                    <div className="mt-3 grid gap-2">
                      <div className="rounded-[12px] bg-bg p-2">
                        <div className="text-[10px] font-bold text-ink/42">性情 / 混养</div>
                        <div className="mt-1 text-[12px] font-black text-ink">{getTemperamentLabel(selectedFish.temperament)} · {selectedFish.housingMode || '需观察'}</div>
                      </div>
                      <p className="rounded-[12px] bg-bg p-2 text-[11px] font-medium leading-relaxed text-ink/65">
                        {selectedFish.housingReason || '建议加入混养计算后再确认。'}
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
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-black text-ink">
                      喂养与养护
                      <ChevronRight className="h-4 w-4 text-ink/38" />
                    </summary>
                    <div className="mt-3 grid gap-3">
                      <div className="rounded-[12px] bg-bg p-2">
                        <div className="text-[10px] font-black text-ink/42">喂食</div>
                        <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/68">{selectedFish.feedingProfile?.recommendedFoods || selectedFish.diet}</p>
                        <p className="mt-1 text-[11px] font-bold text-ink/48">{selectedFish.feedingProfile?.feedingFrequency || '少量投喂，避免残饵。'}</p>
                      </div>
                      <div className="rounded-[12px] bg-bg p-2">
                        <div className="text-[10px] font-black text-ink/42">换水 / 环境</div>
                        <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/68">约 {selectedFish.waterChangeCycle} 天 · {selectedFish.waterTemperature} · pH {selectedFish.phLevel}</p>
                      </div>
                      <div className="rounded-[12px] bg-bg p-2">
                        <div className="text-[10px] font-black text-ink/42">提醒</div>
                        <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/68">{selectedFish.feedingProfile?.specialNotes || selectedFish.description}</p>
                      </div>
                    </div>
                  </details>

                  <details className="rounded-[16px] border border-border bg-bg/45 p-3">
                    <summary className="flex cursor-pointer list-none items-center gap-2 text-[12px] font-black text-ink/55">
                      <MoreHorizontal className="h-4 w-4" /> 更多低频操作
                    </summary>
                    <Button
                      variant="outline"
                      className="mt-3 h-9 w-full rounded-full border-border text-xs font-black text-ink/55"
                      onClick={() => {
                        const appState = loadAppStateFromStorage();
                        const records = appState.deceasedRecords.length > 0
                          ? [...appState.deceasedRecords]
                          : JSON.parse(localStorage.getItem('deceasedRecords') || '[]');
                        records.push({
                          id: Math.random().toString(36).substring(2, 9),
                          fishId: selectedFish.id,
                          date: new Date().toISOString()
                        });
                        localStorage.setItem('deceasedRecords', JSON.stringify(records));
                        patchLocalAppState({ deceasedRecords: records }, { debounce: true });
                        setDetailFeedback(`已记录 ${selectedFish.name} 为逝去的生物。`);
                      }}
                    >
                      <Skull className="mr-1 h-4 w-4" /> 记录死亡
                    </Button>
                  </details>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <ImagePreviewModal
        images={previewImages}
        index={previewIndex}
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onIndexChange={setPreviewIndex}
      />

      <Dialog open={!!pendingTankFish} onOpenChange={(open) => {
        if (!open) {
          setPendingTankFish(null);
          setPendingTankAddConfirmed(false);
        }
      }}>
        <DialogContent className="w-[90vw] max-w-[440px] rounded-[18px] border-border p-0 overflow-hidden">
          <DialogHeader>
            <div className="border-b border-border bg-bg/60 px-5 py-4 text-left">
              <DialogTitle className="font-serif text-xl font-bold italic text-ink">确认添加到鱼缸</DialogTitle>
              <DialogDescription className="mt-1 text-xs text-ink/60">
                添加前确认目标鱼缸和当前风险，不会修改现有数据结构。
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="max-h-[62vh] overflow-y-auto px-5 py-4">
            {pendingTankFish && (
              <div className="mb-3 rounded-[16px] border border-border bg-white p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-bg p-1">
                    <img src={getEncyclopediaImage(pendingTankFish)} alt={pendingTankFish.name} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-ink">将添加：{pendingTankFish.name} × 1</div>
                    <div className="mt-1 text-[11px] font-medium text-ink/45">入缸日期：今天 · 默认数量可在我的鱼缸中调整</div>
                  </div>
                </div>
              </div>
            )}
            <div className="grid gap-2">
            {aquariumSnapshots.map(aquarium => {
              const isActive = targetAquariumId === aquarium.id;
              return (
                <button
                  key={aquarium.id}
                  type="button"
                  onClick={() => {
                    setTargetAquariumId(aquarium.id);
                    setPendingTankAddConfirmed(false);
                  }}
                  className={`rounded-sm border px-3 py-3 text-left transition-colors ${
                    isActive ? 'border-accent bg-accent text-white' : 'border-border bg-white text-ink hover:border-accent'
                  }`}
                >
                  <div className="text-sm font-black">{aquarium.name}</div>
                  <div className={`mt-1 text-[11px] font-medium ${isActive ? 'text-white/70' : 'text-ink/45'}`}>
                    {aquarium.dimensions?.length || 60}x{aquarium.dimensions?.width || 40}x{aquarium.dimensions?.height || 40}cm · {aquarium.fishes.length} 种生物
                  </div>
                </button>
              );
            })}
            </div>
            {pendingFit && (
              <div className={`mt-3 rounded-[16px] border p-3 ${
                pendingFit.status === 'not_recommended' ? 'border-red-100 bg-red-50' : pendingFit.status === 'caution' ? 'border-amber-100 bg-amber-50' : pendingFit.status === 'insufficient_data' ? 'border-sky-100 bg-sky-50' : 'border-emerald-100 bg-emerald-50'
              }`}>
                <div className="flex items-center justify-between gap-2 text-[12px] font-black text-ink">
                  <span>添加前预检</span>
                  <span>{getTankCompatibilityStatusLabel(pendingFit.status)}</span>
                </div>
                <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/68">{pendingFit.evaluations[0]?.result.summary}</p>
                {pendingFit.keyRules.slice(0, 2).map(item => (
                  <p key={`${item.code}-${item.title}`} className="mt-2 text-[11px] font-bold leading-relaxed text-ink/55">
                    {item.title}：{item.evidence}
                  </p>
                ))}
                {pendingTankAddConfirmed && pendingAddPolicy === 'confirm' && (
                  <p className="mt-2 text-[11px] font-black text-amber-700">请再次确认：我已了解风险，仍要谨慎加入。</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="grid grid-cols-2 gap-3 border-t border-border bg-white px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4">
            <Button variant="outline" onClick={() => {
              setPendingTankFish(null);
              setPendingTankAddConfirmed(false);
            }} className="h-10 rounded-full text-sm font-bold">取消</Button>
            <Button
              disabled={!pendingTankFish || !targetAquariumId || pendingAddPolicy === 'block' || pendingAddPolicy === 'complete_information'}
              onClick={() => {
                if (!pendingTankFish) return;
                if (pendingAddPolicy === 'confirm' && !pendingTankAddConfirmed) {
                  setPendingTankAddConfirmed(true);
                  return;
                }
                addFishToAquarium(pendingTankFish, targetAquariumId, pendingTankAddConfirmed);
              }}
              className="h-10 rounded-full bg-accent text-sm font-bold text-white hover:bg-accent/90"
            >
              {pendingAddPolicy === 'block'
                ? '当前不建议加入'
                : pendingAddPolicy === 'complete_information'
                  ? '请先补充鱼缸信息'
                  : pendingAddPolicy === 'confirm'
                    ? pendingTankAddConfirmed ? '确认谨慎加入' : '查看风险并继续'
                    : '确认添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FilterBottomSheet
        open={isMoreFilterOpen}
        title="更多条件"
        subtitle={filterSheetMessage || '完整条件都在这里，页面上方只保留最常用入口。'}
        groups={[
          {
            title: '想找什么',
            selected: draftFunctionTag,
            onSelect: (label) => {
              setFilterSheetMessage('');
              setDraftFunctionTag(label === '全部' ? null : label);
            },
            options: functionFilterOptions.map(label => makeFilterOption(label, { functionTag: label === '全部' ? null : label })),
          },
          {
            title: '鱼缸环境',
            selected: draftEnvironment,
            onSelect: (label) => {
              setFilterSheetMessage('');
              setDraftEnvironment(label === '全部' ? null : label);
            },
            options: environmentFilterOptions.map(label => makeFilterOption(
              label,
              { environment: label === '全部' ? null : label },
              label === '淡水冷水' ? '通常不加热'
                : label === '淡水广温' ? '适应范围宽'
                : label === '淡水热带' ? '建议稳定加热'
                : label === '海水' ? '海水缸专用'
                : undefined
            )),
          },
          {
            title: '饲养难度',
            selected: difficultyFilterOptions.includes(draftFunctionTag || '') ? draftFunctionTag : null,
            onSelect: (label) => {
              setFilterSheetMessage('');
              setDraftFunctionTag(label === '全部' ? null : label);
            },
            options: difficultyFilterOptions.map(label => makeFilterOption(label, { functionTag: label === '全部' ? null : label })),
          },
          {
            title: '混养倾向',
            selected: housingFilterOptions.includes(draftFunctionTag || '') ? draftFunctionTag : null,
            onSelect: (label) => {
              setFilterSheetMessage('');
              setDraftFunctionTag(label === '全部' ? null : label);
            },
            options: housingFilterOptions.map(label => makeFilterOption(label, { functionTag: label === '全部' ? null : label })),
          },
        ]}
        onClose={() => setIsMoreFilterOpen(false)}
        onReset={() => {
          setDraftFunctionTag(null);
          setDraftEnvironment(null);
          setFilterSheetMessage('');
          setActiveFilters(emptyActiveFilters);
          setSearchTerm('');
          setIsMoreFilterOpen(false);
        }}
        onApply={() => {
          const nextCount = getFilteredSpecies(
            allFishes,
            {
              keyword: '',
              functionTag: draftFunctionTag,
              environment: draftEnvironment,
            },
            fitEvaluations,
            compatibilityEvaluations
          ).length;
          if (nextCount === 0) {
            setFilterSheetMessage('当前组合暂无结果，可以减少一个条件再试。');
            return;
          }
          if (draftFunctionTag) recordFilterUsage(draftFunctionTag);
          if (draftEnvironment) recordFilterUsage(draftEnvironment);
          setActiveFilters(prev => ({
            ...prev,
            keyword: '',
            functionTag: draftFunctionTag,
            environment: draftEnvironment,
          }));
          setSearchTerm('');
          setShowWishlistOnly(false);
          setResultPage(0);
          setIsMoreFilterOpen(false);
        }}
      />
    </div>
  );
}
