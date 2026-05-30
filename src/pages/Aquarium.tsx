import { lazy, Suspense, useState, useEffect } from 'react';
import { Aquarium, AquariumFish, Fish } from '../types';
import { fishData } from '../data/fishData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, differenceInDays, addDays, isPast, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths, isSameDay } from 'date-fns';
import { Plus, Trash2, AlertTriangle, Edit2, Calendar, Droplets, Sparkles, Search, ChevronLeft, ChevronRight, Settings, BookOpen, Info, Crown, Activity, HelpCircle, Skull, Heart, HeartOff, X, Layers3, Maximize2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeceasedRecord } from '../types';
import { askAquaGuideAI } from '../lib/aiClient';
import { isAquaticPlantSpecies, isHardscapeSpecies } from '../lib/speciesClassification';
import { getLifeType } from '../modules/species/species.service';
import { recommendationService } from '../modules/recommendation/recommendation.service';
import { weatherService } from '../services/weather/weather.service';
import type { LocalWeatherOutput } from '../services/weather/weather.schema';
import { HeaterReminderCard } from '../components/aquarium/HeaterReminderCard';

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

type TankBuildTemplate = {
  id: string;
  name: string;
  tagline: string;
  bestFor: string;
  difficulty: '新手' | '进阶';
  tankSize: string;
  temperature: string;
  substrate: string;
  plants: string[];
  hardscape: string[];
  equipment: string[];
  equipmentSettings: Aquarium['equipment'];
  livestock: string[];
  stockedSpecies: { name: string; quantity: number }[];
  maintenance: string[];
  caution: string;
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

const tankBuildTemplates: TankBuildTemplate[] = [
  {
    id: 'beginner-low-tech',
    name: '新手阴性草缸',
    tagline: '低光、低 CO2 依赖，先把稳定养成习惯。',
    bestFor: '30-60cm 新手缸、办公室桌面缸',
    difficulty: '新手',
    tankSize: '30L 起步，60cm 缸更稳定',
    temperature: '24',
    substrate: '水草泥',
    plants: ['小水榕', '铁皇冠', '黑木蕨', '三角莫斯'],
    hardscape: ['沉木 (流木)', '杜鹃根'],
    equipment: ['瀑布过滤或小桶滤', '普通灯/入门水草灯', '可选加热棒'],
    equipmentSettings: { filter: '瀑布过滤', heater: true, oxygen: false, light: '水草灯' },
    livestock: ['红绿灯 8-12 条', '咖啡鼠 3-5 条', '斑马螺 1-2 只'],
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
    tankSize: '45L 起步，建议 60cm 以上',
    temperature: '25',
    substrate: '水草泥',
    plants: ['迷你矮珍珠', '牛毛毡', '宫廷草', '红宫廷'],
    hardscape: ['青龙石', 'ADA风格化妆砂'],
    equipment: ['水草灯', '桶滤或强瀑布过滤', '可选 CO2', '加热棒'],
    equipmentSettings: { filter: '桶滤', heater: true, oxygen: false, light: '水草灯' },
    livestock: ['宝莲灯 12-20 条', '红鼻剪刀/红绿灯 10-15 条', '咖啡鼠 4-6 条', '黑壳虾少量'],
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
    tankSize: '20L 起步，30L 以上更稳',
    temperature: '23',
    substrate: '水草泥',
    plants: ['三角莫斯', '青丝绒莫斯', '小水榕', '辣椒榕'],
    hardscape: ['沉木 (流木)', '火山石板'],
    equipment: ['海绵过滤', '普通灯', '加热棒视室温决定'],
    equipmentSettings: { filter: '海绵过滤', heater: false, oxygen: true, light: '普通灯' },
    livestock: ['极火虾 10-20 只', '黄金米虾/蓝丝绒米虾单色群', '斑马螺 1 只'],
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
    tankSize: '60L 起步，神仙鱼建议高缸',
    temperature: '27',
    substrate: '河沙',
    plants: ['大叶皇冠', '细叶皇冠', '黑木蕨'],
    hardscape: ['沉木 (流木)', '杜鹃根'],
    equipment: ['桶滤', '弱光灯', '加热棒', '可加黑水素/榄仁叶'],
    equipmentSettings: { filter: '桶滤', heater: true, oxygen: false, light: '普通灯' },
    livestock: ['宝莲灯 15-30 条', '阿卡西短鲷 1 对', '神仙鱼 2-4 条', '咖啡鼠 4-6 条'],
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
    tankSize: '45L 起步，60cm 以上更容易做纵深',
    temperature: '24',
    substrate: '水草泥',
    plants: ['迷你矮珍珠', '牛毛毡', '南美叉柱花'],
    hardscape: ['青龙石', '青龙石景观组', 'ADA风格化妆砂'],
    equipment: ['强水草灯', '桶滤', 'CO2 强烈建议', '加热棒'],
    equipmentSettings: { filter: '桶滤', heater: true, oxygen: false, light: '水草灯' },
    livestock: ['红莲灯 12-20 条', '红绿灯 15-25 条', '黑壳虾少量', '斑马螺 1-2 只'],
    stockedSpecies: [{ name: '红莲灯', quantity: 16 }, { name: '红绿灯', quantity: 15 }, { name: '黑壳虾', quantity: 8 }, { name: '斑马螺', quantity: 1 }],
    maintenance: ['每周换水 30%-40%', '前 4 周重点控光和勤换水', '前景草爬满后定期薄剪'],
    caution: '青龙石可能提高硬度，搭配偏软水灯鱼时要观察 GH/KH 和鱼只状态。',
  },
].map(template => ({
  ...template,
  plants: template.plants.map(name => findSpeciesValueByName(name, isAquaticPlantSpecies)),
  hardscape: template.hardscape.map(name => findSpeciesValueByName(name, isHardscapeSpecies)),
}));

const normalizeAquariumPlants = (aquariums: Aquarium[]) => aquariums.map(aquarium => {
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

const getBioLoadLiters = (fish: Fish) => {
  const lifeType = getLifeType(fish);
  if (lifeType === 'plant' || lifeType === 'hardscape') return 0;
  if (lifeType === 'invertebrate') return 2;
  if (lifeType === 'coral') return 8;
  if (lifeType === 'reptile') return 60;

  const base = fish.size === 'Large' ? 35 : fish.size === 'Medium' ? 12 : 4;
  const temperamentMultiplier = fish.temperament === 'Aggressive' || fish.temperament === 'Territorial' ? 1.35 : 1;
  return Math.round(base * temperamentMultiplier);
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

const formatRecommendationReason = (text: string) => {
  const fallback = '基于您当前鱼缸内的生物，我们为您推荐以下兼容性较好的品种。';
  const normalized = (text || fallback).replace(/\s+/g, ' ').trim();
  const lines = normalized
    .split(/[。；;]\s*/)
    .map(line => line.trim().replace(/[，,]\s*$/, ''))
    .filter(Boolean);

  return lines.length > 0 ? lines : [fallback];
};

export default function AquariumManager() {
  const [aquariums, setAquariums] = useState<Aquarium[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  
  // UI States
  const [isAddFishOpen, setIsAddFishOpen] = useState(false);
  const [isRecommendOpen, setIsRecommendOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [selectedAqFish, setSelectedAqFish] = useState<{fish: Fish, aqFish: AquariumFish} | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isBuildPlanOpen, setIsBuildPlanOpen] = useState(false);
  const [isTankPreviewOpen, setIsTankPreviewOpen] = useState(false);
  const [isDiagnosisOpen, setIsDiagnosisOpen] = useState(false);
  const [diagnosisText, setDiagnosisText] = useState('');
  const [diagnosisFullText, setDiagnosisFullText] = useState('');
  const [diagnosisQuestion, setDiagnosisQuestion] = useState('');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [selectedBuildTemplateId, setSelectedBuildTemplateId] = useState(tankBuildTemplates[0].id);
  const [isTankArchiveExpanded, setIsTankArchiveExpanded] = useState(false);
  const [tankArchiveCategory, setTankArchiveCategory] = useState('全部');
  const [settingsForm, setSettingsForm] = useState<Partial<Aquarium>>({});
  const [isPlantListExpanded, setIsPlantListExpanded] = useState(false);
  const [isScapeListExpanded, setIsScapeListExpanded] = useState(false);
  
  // 3D Highlight state
  const [active3DSpecies, setActive3DSpecies] = useState<string | null>(null);

  // New fish form state
  const [fishSearchTerm, setFishSearchTerm] = useState('');
  const [selectedFishId, setSelectedFishId] = useState<string>('');
  const [fishQuantity, setFishQuantity] = useState<number>(1);
  const [entryDate, setEntryDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const [isRecommending, setIsRecommending] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<Fish[]>([]);
  const [aiReasoning, setAiReasoning] = useState<string>('');

  const [wishlistFishIds, setWishlistFishIds] = useState<Set<string>>(new Set());
  const [tankActionMessage, setTankActionMessage] = useState<string>('');
  const [localWeather, setLocalWeather] = useState<LocalWeatherOutput | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    const savedWishlist = localStorage.getItem('wishlistFishIds');
    if (savedWishlist) setWishlistFishIds(new Set(JSON.parse(savedWishlist)));
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

  const toggleWishlist = (id: string) => {
    const next = new Set(wishlistFishIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setWishlistFishIds(next);
    localStorage.setItem('wishlistFishIds', JSON.stringify(Array.from(next)));
  };

  useEffect(() => {
    const savedAquariums = localStorage.getItem('aquariums');
    if (savedAquariums) {
      const parsed = normalizeAquariumPlants(JSON.parse(savedAquariums));
      setAquariums(parsed);
      if (parsed.length > 0) setActiveId(parsed[0].id);
      localStorage.setItem('aquariums', JSON.stringify(parsed));
    } else {
      const oldSaved = localStorage.getItem('myAquarium');
      const initialAquariums = normalizeAquariumPlants(oldSaved ? [JSON.parse(oldSaved)] : [{
        id: Math.random().toString(36).substring(2, 9),
        name: '我的鱼缸',
        fishes: [],
        lastWaterChangeDate: new Date().toISOString(),
        dimensions: { length: '60', width: '40', height: '40' },
        waterType: 'Freshwater',
        targetTemperature: '25',
        substrate: '无',
        plants: [],
        hardscape: [],
        equipment: { filter: '瀑布过滤', heater: true, oxygen: false, light: '普通灯' }
      }]);
      setAquariums(initialAquariums);
      setActiveId(initialAquariums[0].id);
      localStorage.setItem('aquariums', JSON.stringify(initialAquariums));
    }
  }, []);

  const saveAquariums = (newAquariums: Aquarium[]) => {
    setAquariums(newAquariums);
    localStorage.setItem('aquariums', JSON.stringify(newAquariums));
  };

  const handleAddAquarium = () => {
    const newAq: Aquarium = {
      id: Math.random().toString(36).substring(2, 9),
      name: `我的鱼缸 ${aquariums.length + 1}`,
      fishes: [],
      lastWaterChangeDate: new Date().toISOString(),
      dimensions: { length: '60', width: '40', height: '40' },
      waterType: 'Freshwater',
      targetTemperature: '25',
      substrate: '无',
      plants: [],
      hardscape: [],
      equipment: { filter: '瀑布过滤', heater: true, oxygen: false, light: '普通灯' }
    };
    const updated = [...aquariums, newAq];
    saveAquariums(updated);
    setActiveId(newAq.id);
  };

  const handleDeleteAquarium = (id: string) => {
    if (confirm('确定要删除这个鱼缸吗？')) {
      const updated = aquariums.filter(a => a.id !== id);
      saveAquariums(updated);
      if (updated.length > 0) {
        setActiveId(updated[0].id);
      } else {
        handleAddAquarium();
      }
    }
  };

  const activeAquarium = aquariums.find(a => a.id === activeId);

  // --- COMPATIBILITY LOGIC ---
  const getTankConflicts = (aquarium: Aquarium | undefined): string[] => {
    if (!aquarium || aquarium.fishes.length === 0) return [];
    const conflicts: string[] = [];
    
    const curFishes = aquarium.fishes.map(aqf => fishData.find(f => f.id === aqf.fishId)).filter(f => f !== undefined) as Fish[];
    const stockedItems = aquarium.fishes
      .map(aqFish => ({ aqFish, fish: fishData.find(f => f.id === aqFish.fishId) }))
      .filter(item => item.fish) as { aqFish: AquariumFish; fish: Fish }[];

    // 1. Temperament
    const hasAggressive = curFishes.some(f => f.temperament === 'Aggressive');
    const hasPeaceful = curFishes.some(f => f.temperament === 'Peaceful');
    const hasSmall = curFishes.some(f => f.size === 'Small');
    const hasLarge = curFishes.some(f => f.size === 'Large');

    if (hasAggressive && hasPeaceful) {
      conflicts.push("混养了包含攻击性（猛鱼）和温和性格的鱼类，发生撕咬或吞食的风险极大。");
    }
    if (hasLarge && hasSmall && !hasAggressive) { // if aggressive already marked, avoid spam
      conflicts.push("体型差异过大（包含大型鱼和小型鱼），小型鱼可能会被当做食物吞食。");
    }

    // 2. pH
    const parseRange = (str: string) => {
      const match = str.match(/([\d.]+)-([\d.]+)/);
      if (match) return [parseFloat(match[1]), parseFloat(match[2])];
      const single = parseFloat(str);
      if (!isNaN(single)) return [single, single];
      return [0, 14];
    };
    
    let minPH = 0; let maxPH = 14;
    curFishes.forEach((f, i) => {
       const [min, max] = parseRange(f.phLevel);
       if (i === 0) { minPH = min; maxPH = max; }
       else {
           minPH = Math.max(minPH, min);
           maxPH = Math.min(maxPH, max);
       }
    });
    if (minPH > maxPH) {
       conflicts.push("缸内生物对水质酸碱度(pH)的要求存在不可调和的冲突，无法同时满足。");
    }

    // 3. Water Type
    const waterTypes = new Set(curFishes.map(f => f.category === '海水鱼' ? 'Saltwater' : 'Freshwater'));
    if (waterTypes.size > 1) {
       conflicts.push("不能同时混养海水鱼和淡水生物。");
    }

    // 4. Tank volume / stocking density
    const tankLiters = getTankVolumeLiters(aquarium);
    if (tankLiters > 0 && stockedItems.length > 0) {
      const minRequiredLiters = Math.max(...stockedItems.map(({ fish }) => parseLiters(fish.tankSize, 30)));
      const bioLoadLiters = stockedItems.reduce((sum, { aqFish, fish }) => {
        return sum + getBioLoadLiters(fish) * Math.max(aqFish.quantity || 1, 1);
      }, 0);
      const totalQuantity = stockedItems.reduce((sum, { aqFish, fish }) => {
        const lifeType = getLifeType(fish);
        return lifeType === 'plant' || lifeType === 'hardscape' ? sum : sum + Math.max(aqFish.quantity || 1, 1);
      }, 0);

      if (tankLiters < minRequiredLiters) {
        conflicts.push(`鱼缸有效水体约 ${tankLiters}L，小于当前生物最低建议缸容 ${Math.round(minRequiredLiters)}L；即使数量不多也容易产生压迫、攻击或水质波动。`);
      }
      if (bioLoadLiters > tankLiters) {
        conflicts.push(`当前约 ${totalQuantity} 只/条生物，估算生物负载需要约 ${Math.round(bioLoadLiters)}L，已超过鱼缸有效水体 ${tankLiters}L；鱼多缸小会显著增加缺氧、氨氮和疾病风险。`);
      } else if (bioLoadLiters > tankLiters * 0.75) {
        conflicts.push(`当前生物负载接近上限：估算需要约 ${Math.round(bioLoadLiters)}L，鱼缸有效水体约 ${tankLiters}L；建议减少数量、加强过滤并提高换水频率。`);
      }
    }

    return conflicts;
  };

  const conflicts = getTankConflicts(activeAquarium);
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

  const handleAddFish = () => {
    if (!activeAquarium || !selectedFishId || !entryDate) return;

    // Check if fish already exists
    const existingIndex = activeAquarium.fishes.findIndex(f => f.fishId === selectedFishId);
    let updated;
    
    if (existingIndex >= 0) {
      updated = aquariums.map(a => 
        a.id === activeId ? {
          ...a,
          fishes: a.fishes.map((f, i) => i === existingIndex ? { ...f, quantity: (f.quantity || 1) + fishQuantity } : f)
        } : a
      );
    } else {
      const newFish: AquariumFish = {
        id: Math.random().toString(36).substring(2, 9),
        fishId: selectedFishId,
        quantity: fishQuantity,
        entryDate: new Date(entryDate).toISOString(),
        lastWaterChangeDate: new Date(entryDate).toISOString(),
      };
      updated = aquariums.map(a => 
        a.id === activeId ? { ...a, fishes: [...a.fishes, newFish] } : a
      );
    }

    saveAquariums(updated);

    setIsAddFishOpen(false);
    setSelectedFishId('');
    setFishSearchTerm('');
    setFishQuantity(1);
    setEntryDate(format(new Date(), 'yyyy-MM-dd'));
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
    const newHistory = history.includes(todayStr) ? history : [...history, todayStr];

    const updated = aquariums.map(a => 
      a.id === activeId ? { 
        ...a, 
        lastWaterChangeDate: now,
        waterChangeHistory: newHistory,
        fishes: a.fishes.map(f => ({ ...f, lastWaterChangeDate: now }))
      } : a
    );
    saveAquariums(updated);
    setTankActionMessage(`已记录换水：${format(new Date(), 'yyyy-MM-dd HH:mm')}`);
  };

  const handleApplyBuildTemplate = (template: TankBuildTemplate) => {
    if (!activeAquarium) return;
    const now = new Date().toISOString();
    const templateFish = template.stockedSpecies
      .map(item => ({ ...item, fish: findStockSpeciesByName(item.name) }))
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
            };
          })()
        : a
    ));

    saveAquariums(updated);
    setTankActionMessage(`已应用「${template.name}」方案，并加入 ${templateFish.length} 类推荐生物`);
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

  const getConflicts = (fishes: AquariumFish[]): string[] => {
    return getTankConflicts(activeAquarium);
  };

  const handleAskAIAboutConflicts = async () => {
    if (!activeAquarium) return;
    setIsRecommending(true);
    setAiReasoning('');
    try {
      const currentFishNames = activeAquarium.fishes.map(af => {
        const f = fishData.find(d => d.id === af.fishId);
        return f ? `${f.name} (pH: ${f.phLevel}, 体温: ${f.waterTemperature}, 体型: ${f.size}, 性格: ${f.temperament})` : '';
      }).filter(Boolean).join('\n ');

      const prompt = `你是一个专业的水族理疗师和分析专家。
我将当前鱼缸内的生物混养数据以及可能产生的冲突列表提供给你，请你根据鱼缸中实际养育的鱼的详细信息给出深入分析，使用友好、专业的口吻，明确指明哪条鱼会欺负哪条鱼，或者谁适应不了当前的水质。

当前缸内水质和环境约束：${activeAquarium.waterType === 'Saltwater' ? '海水' : '淡水'}, 设定温度 ${activeAquarium.targetTemperature || 25}°C。
当前缸内生物信息：
${currentFishNames}

本地计算产生的通用警告提示：
${conflicts.join('; ')}

请分析以上数据，给出一段 200 字左右的分析解释，并提出具体的改进建议（如隔离、分缸或改变水参数）。不要使用过于复杂的Markdown格式，只需要分出两三段正常文本即可。`;

      const responseText = await askAquaGuideAI({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 700,
        temperature: 0.3,
      });

      setAiReasoning(responseText || "AI 无法提供解释，请检查您的网络连接或配置。");
    } catch(e) {
      console.error(e);
      setAiReasoning(e instanceof Error ? `${e.message} 当前先参考上方本地风险提示。` : "AI 请求失败。当前先参考上方本地风险提示。");
    }
    setIsRecommending(false);
  };
  const handleSmartRecommend = async () => {
    if (!activeAquarium) return;
    setIsRecommendOpen(true);
    setIsRecommending(true);
    setAiReasoning('');
    setAiRecommendations([]);

    try {
      const currentFishNames = activeAquarium.fishes.map(af => {
        const f = fishData.find(d => d.id === af.fishId);
        return f ? `${f.name} x${af.quantity}` : '';
      }).filter(Boolean).join(', ');
      const localRecommendationItems = recommendationService.recommendForAquarium(activeAquarium, fishData, 8).items;
      const localRecommendations = localRecommendationItems
        .map(item => fishData.find(fish => fish.id === item.speciesId))
        .filter(Boolean) as Fish[];
      const recommendableDatabase = localRecommendations.length > 0 ? localRecommendations : fishData.filter(fish => !isAquaticPlantSpecies(fish) && !isHardscapeSpecies(fish)).slice(0, 30);

      const prompt = `
您是一个专业的水族混养顾问。请从我的本地数据库中挑选最适合当前鱼缸的 4-6 种生物进行混养推荐。
我的鱼缸参数：${activeAquarium.waterType === 'Saltwater' ? '海水' : '淡水'}, 设定温度 ${activeAquarium.targetTemperature || 25}°C。
当前缸内已有生物：${currentFishNames || '缸里目前是空的'}。

这是我的本地生物数据库信息（JSON数组）：
${JSON.stringify(recommendableDatabase.map(f => ({ id: f.id, name: f.name, category: f.category, temp: f.waterTemperature, ph: f.phLevel, diff: f.difficulty, temperament: f.temperament })))}

要求：
1. 请只推荐数据库中存在的生物。
2. 绝对不能将淡水与海水生物混养。
3. 考虑温度、pH的重合度。
4. 避免体型悬殊或性格凶猛冲突（如斗鱼不能养两条，大型鱼不能吃小型鱼）。
5. 必须返回一段简短的推荐理由组合，最后返回一个只包含推荐生物ID的JSON数组格式，用[ ]包裹。不要输出 markdown 代码块的结构，只在一行输出JSON数组。

示例输出：
根据您的缸内情况，推荐增加一些中下层鱼类，比如鼠鱼来清理残饵。底层鱼非常温和，且水质要求匹配。
["id1", "id2", "id3"]
      `;

      const text = await askAquaGuideAI({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 900,
        temperature: 0.25,
      });
      
      // Attempt to extract JSON array
      const match = text.match(/\[(.*?)\]/);
      if (match) {
        try {
          const ids = JSON.parse(match[0]) as string[];
          const safeIds = new Set(localRecommendationItems.map(item => item.speciesId));
          const recs = ids.map(id => fishData.find(f => f.id === id)).filter(Boolean).filter(fish => safeIds.has((fish as Fish).id)) as Fish[];
          setAiRecommendations(recs.length > 0 ? recs : localRecommendations);
        } catch(e) {
          console.error("JSON parse error from AI", e);
          setAiRecommendations(localRecommendations);
        }
        setAiReasoning(text.replace(match[0], '').trim());
      } else {
        setAiReasoning(text);
        setAiRecommendations(localRecommendations);
      }
    } catch(err) {
      console.error(err);
      setAiReasoning("AI 请求失败，可能是 API Key、模型权限或网络访问问题。当前展示离线默认推荐如下：");
      const localRecommendations = recommendationService.recommendForAquarium(activeAquarium, fishData, 8).items
        .map(item => fishData.find(fish => fish.id === item.speciesId))
        .filter(Boolean) as Fish[];
      setAiRecommendations(localRecommendations);
    } finally {
      setIsRecommending(false);
    }
  };

  const buildLocalDiagnosis = (extraQuestion = '') => {
    const stocked = activeAquarium?.fishes
      .map(aqFish => {
        const fish = fishData.find(item => item.id === aqFish.fishId);
        return fish ? `${fish.name} x${aqFish.quantity || 1}` : '';
      })
      .filter(Boolean)
      .join('、') || '暂无生物';

    return `鱼缸现状分析：
当前鱼缸为${activeAquarium?.waterType === 'Saltwater' ? '海水' : '淡水'}环境，目标温度 ${activeAquarium?.targetTemperature || 25}°C，估算水体约 ${activeAquarium ? getTankVolumeLiters(activeAquarium) : 0}L。缸内记录：${stocked}。当前健康度为 ${healthScore}%。

优化建议：
1. 先保持水温稳定，换水前新水温差控制在 1-2°C 内。
2. 如果最近添加了新鱼，前三天减少打扰，少喂或不喂，观察呼吸、躲藏和体表。
3. 如果出现水体发白、异味或鱼只浮头，优先检查过滤、停喂 1 天，并少量多次换水。
${conflicts.length > 0 ? `4. 当前系统检测到风险：${conflicts.join('；')}` : '4. 暂未发现明显混养冲突，继续观察密度和水质变化。'}

默认护理提醒：
鱼怀孕护理：隔离时避免过小容器，保持弱水流和遮蔽物，临产前减少惊吓。
鱼苗喂养：少量多餐，优先使用细颗粒、丰年虾幼体或专用开口粮，残饵及时清理。
水质变差处理：先停喂，检查过滤是否堵塞，换水 20%-30%，不要一次性全缸大换水。
${extraQuestion ? `\n追问回应：${extraQuestion}\n建议先围绕水温、换水记录、喂食量和鱼只异常表现逐项排查。` : ''}`;
  };

  const handleOpenDiagnosis = async (extraQuestion = '') => {
    if (!activeAquarium) return;
    setIsDiagnosisOpen(true);
    setIsDiagnosing(true);
    setDiagnosisFullText('');

    const stocked = activeAquarium.fishes
      .map(aqFish => {
        const fish = fishData.find(item => item.id === aqFish.fishId);
        return fish ? `${fish.name} x${aqFish.quantity || 1}，温度${fish.waterTemperature}，pH ${fish.phLevel}` : '';
      })
      .filter(Boolean)
      .join('\n');

    try {
      const prompt = `你是 AquaGuide 水族护理助手。请用中文逐段分析当前鱼缸现状、优化建议和提醒，语气专业但适合新手。必须包含：鱼怀孕护理、鱼苗喂养、水质变差处理方法。最后给出可执行的今日检查清单。

鱼缸：${activeAquarium.name}
水体：${activeAquarium.waterType === 'Saltwater' ? '海水' : '淡水'}
目标温度：${activeAquarium.targetTemperature || 25}°C
估算水量：${getTankVolumeLiters(activeAquarium)}L
健康度：${healthScore}%
换水：${activeAquarium.lastWaterChangeDate ? format(new Date(activeAquarium.lastWaterChangeDate), 'yyyy-MM-dd HH:mm') : '暂无记录'}
缸内生物：
${stocked || '暂无'}
本地风险：${conflicts.join('；') || '暂无明显风险'}
${extraQuestion ? `用户追问：${extraQuestion}` : ''}`;

      const text = await askAquaGuideAI({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 900,
        temperature: 0.25,
      });
      setDiagnosisFullText(text || buildLocalDiagnosis(extraQuestion));
    } catch (error) {
      console.error(error);
      setDiagnosisFullText(buildLocalDiagnosis(extraQuestion));
    }
  };

  const handleDiagnosisFollowUp = () => {
    const question = diagnosisQuestion.trim();
    if (!question || isDiagnosing) return;
    setDiagnosisQuestion('');
    handleOpenDiagnosis(question);
  };

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
  const recommendationItems = recommendationService.recommendForAquarium(activeAquarium, fishData, 8).items;
  const recommendationReasonById = new Map(recommendationItems.map(item => [item.speciesId, item.reason]));
  const recommendations = recommendationItems
    .map(item => fishData.find(fish => fish.id === item.speciesId))
    .filter(Boolean) as Fish[];
  const selectedBuildTemplate = tankBuildTemplates.find(template => template.id === selectedBuildTemplateId) || tankBuildTemplates[0];
  const getSpeciesDisplayName = (value: string) => fishData.find(fish => fish.id === value)?.name || value;

  // Search logic for Add Fish
  const searchResults = fishSearchTerm.trim() 
    ? fishData
      .filter(f => !isAquaticPlantSpecies(f) && !isHardscapeSpecies(f))
      .filter(f => f.name.toLowerCase().includes(fishSearchTerm.toLowerCase()) || f.scientificName.toLowerCase().includes(fishSearchTerm.toLowerCase()))
      .slice(0, 8)
    : [];

  const recommendedFishes = recommendations.slice(0, 6);
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
  const visiblePlantOptions = isPlantListExpanded ? plantOptions : plantOptions.slice(0, 2);
  const hiddenPlantCount = Math.max(plantOptions.length - visiblePlantOptions.length, 0);
  const selectedHardscapeCount = settingsForm.hardscape?.length || 0;
  const currentSubstrate = settingsForm.substrate || '无';
  const scapeOptions = [
    ...substrateOptions.map(option => ({
      type: 'substrate' as const,
      id: `substrate-${option.value}`,
      value: option.value,
      label: option.label,
      hint: option.hint,
    })),
    ...hardscapeOptions.map(item => ({
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
  const visibleScapeOptions = isScapeListExpanded ? sortedScapeOptions : sortedScapeOptions.slice(0, 2);
  const hiddenScapeCount = Math.max(sortedScapeOptions.length - visibleScapeOptions.length, 0);
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
  const filteredTankArchiveItems = tankArchiveItems.filter(item => (
    tankArchiveCategory === '全部' || getArchiveCategory(item.fish) === tankArchiveCategory
  ));
  const acquiredArchiveCount = Array.from(archiveOwnedById.values()).length;
  const ownedArchivePreviewItems = Array.from(archiveOwnedById.values()).slice(0, 4);
  const archiveCollectionRate = tankArchiveItems.length > 0
    ? Math.round((acquiredArchiveCount / tankArchiveItems.length) * 1000) / 10
    : 0;

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
  const healthColor = healthScore >= 80 ? 'text-[#388E3C]' : healthScore >= 60 ? 'text-[#F57C00]' : 'text-[#D32F2F]';
  const healthBg = healthScore >= 80 ? 'bg-[#E8F5E9]' : healthScore >= 60 ? 'bg-[#FFF3E0]' : 'bg-[#FFF4F4]';
  const healthBarColor = healthScore >= 80 ? 'bg-[#4CAF50]' : healthScore >= 60 ? 'bg-[#FF9800]' : 'bg-[#F44336]';

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden text-[13px] leading-relaxed">
      {/* Aquarium Tabs */}
      <div className="order-[0] flex min-w-0 flex-wrap gap-2 pb-1">
        {aquariums.map(aq => (
          <button
            key={aq.id}
            onClick={() => setActiveId(aq.id)}
            className={`rounded-sm border px-3 py-1.5 text-[12px] font-bold whitespace-nowrap transition-colors ${
              activeId === aq.id
                ? 'bg-ink text-white border-ink'
                : 'bg-white text-ink border-border hover:border-ink'
            }`}
          >
            {aq.name}
          </button>
        ))}
        <button
          onClick={handleAddAquarium}
          className="flex items-center rounded-sm border border-dashed border-ink/40 px-3 py-1.5 text-[12px] font-bold whitespace-nowrap text-ink/70 transition-colors hover:border-ink hover:text-ink"
        >
          <Plus className="w-3 h-3 mr-1" /> 新建
        </button>
      </div>

      {/* Tank Water Change Dashboard */}
      <div className="order-[3] grid grid-cols-2 items-stretch gap-2">
      <div className="flex min-w-0 flex-col justify-between gap-2 rounded-sm border border-border bg-white p-2.5 shadow-sm">
        <div className="flex min-w-0 items-start gap-2">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isChangeOverdue ? 'bg-[#FFF4F4] text-[#D32F2F]' : 'bg-accent-light text-accent'}`}>
            <Calendar className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-[13px] font-black leading-tight text-ink">换水提醒</h3>
              <button
                type="button"
                aria-label="查看囤水和换水提示"
                onClick={() => setIsGuideOpen(true)}
                className="text-ink/40 hover:text-accent transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
              <span className={`text-[20px] font-black leading-none tracking-[-0.03em] ${isChangeOverdue ? 'text-[#D32F2F]' : 'text-ink'}`}>
                {isChangeOverdue ? '已过期' : `${daysUntilChange} 天`}
              </span>
              <span className="text-[10px] text-ink/55 font-medium">
                周期 {shortestCycle}天
              </span>
            </div>
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-1.5">
          <Button onClick={() => setIsCalendarOpen(true)} variant="outline" className="h-8 min-w-0 rounded-sm border-border px-1.5 text-[10px] font-bold text-ink hover:bg-bg">
            <Calendar className="mr-1 h-3 w-3 shrink-0" />
            日历
          </Button>
          <Button onClick={handleTankWaterChange} className="h-8 min-w-0 rounded-sm bg-ink px-1.5 text-[10px] font-bold text-white hover:bg-ink/90">
            <Droplets className="mr-1 h-3 w-3 shrink-0" />
            记录
          </Button>
        </div>
        <div className="truncate text-[9px] font-medium text-ink/45">
          {tankActionMessage || (activeAquarium.lastWaterChangeDate ? `上次 ${format(new Date(activeAquarium.lastWaterChangeDate), 'M-dd HH:mm')}` : '暂无换水记录')}
        </div>
      </div>

      <HeaterReminderCard
        localWeather={localWeather}
        weatherStatus={weatherStatus}
        heaterSpeciesCount={heaterSpeciesCount}
      />
      </div>

      <div className="order-[4] grid grid-cols-[1fr_auto] items-center gap-2 rounded-sm border border-accent/15 bg-white p-2.5 shadow-sm">
        <Button onClick={() => handleOpenDiagnosis()} className="h-10 rounded-sm bg-accent text-[13px] font-black text-white hover:bg-accent/90">
          <Activity className="mr-1.5 h-4 w-4" />
          一键诊断
        </Button>
        <div className="min-w-[82px] text-right">
          <div className={`text-[18px] font-black leading-none ${healthColor}`}>{healthScore}%</div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg">
            <div className={`h-1.5 rounded-full ${healthBarColor}`} style={{ width: `${healthScore}%` }} />
          </div>
        </div>
      </div>

      {/* Visual Tank Placeholder */}
      <div className="order-[5] relative h-72 w-full overflow-hidden rounded-sm border-[3px] border-accent shadow-inner group">
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
            onSpeciesSelect={setActive3DSpecies}
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

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 border-t border-white/30 bg-gradient-to-t from-white/42 via-white/14 to-transparent px-3 pb-2 pt-4 backdrop-blur-[1px]">
          <div className="flex items-center gap-2">
            <div className={`flex shrink-0 items-center gap-1 text-[10px] font-black ${healthColor}`}>
              <Activity className="h-3 w-3" />
              健康 {healthScore}%
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/42">
              <div className={`h-1 rounded-full ${healthBarColor} opacity-85 transition-all duration-1000`} style={{ width: `${healthScore}%` }} />
            </div>
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
                  <img src={fishInfo.image} alt={fishInfo.name} className="w-4 h-4 rounded-full object-contain bg-white/80" />
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
            className="h-9 w-9 rounded-sm bg-white/90 p-0 text-accent shadow-sm backdrop-blur-sm hover:bg-accent hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            aria-label="全屏预览"
            title="全屏预览"
            onClick={() => setIsTankPreviewOpen(true)}
            className="h-9 w-9 rounded-sm bg-accent/90 p-0 text-white shadow-sm backdrop-blur-sm hover:bg-accent"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            aria-label="鱼缸设置"
            title="鱼缸设置"
            onClick={() => { setSettingsForm(activeAquarium); setIsPlantListExpanded(false); setIsScapeListExpanded(false); setIsSettingsOpen(true); }}
            className="h-9 w-9 rounded-sm border border-white/60 bg-white/88 p-0 text-ink shadow-sm backdrop-blur-sm hover:bg-bg"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Floating Conflict Warning Trigger */}
        {conflicts.length > 0 && (
          <div className="absolute bottom-2 right-2 z-10">
            <Button
              variant="destructive"
              className="rounded-full shadow-lg h-10 px-3 bg-yellow-500 hover:bg-yellow-600 text-white animate-bounce border-2 border-white"
              onClick={() => setIsConflictDialogOpen(true)}
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span className="font-bold text-xs">风险警告</span>
            </Button>
          </div>
        )}
      </div>

      <Button onClick={() => setIsBuildPlanOpen(true)} variant="outline" className="order-[6] h-10 min-w-0 rounded-sm border-emerald-200 bg-emerald-50 px-3 text-[13px] font-bold text-emerald-700 hover:bg-emerald-100">
        <Layers3 className="mr-1.5 h-4 w-4 shrink-0" />
        鱼缸搭建方案
      </Button>

      {conflicts.length > 0 && (
        <div className="order-[4] bg-[#FFF4F4] border border-[#FFD6D6] p-4 flex flex-col gap-2">
          <div className="flex items-center text-[#D32F2F] font-bold text-sm">
            <AlertTriangle className="w-4 h-4 mr-2" />
            鱼缸风险警告
          </div>
          <ul className="list-disc pl-5 text-xs text-[#D32F2F] space-y-1 font-medium">
            {conflicts.map((conflict, index) => (
              <li key={index}>{conflict}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tank Species Archive */}
      <section className="order-[2] overflow-hidden rounded-sm border border-[#E2E0D9] bg-[#F8F7F2] shadow-sm">
        <button
          type="button"
          onClick={() => setIsTankArchiveExpanded(prev => !prev)}
          className="flex w-full items-center justify-between gap-3 bg-[#E9E8E2] px-3 py-3 text-left transition-colors hover:bg-[#E4E2DB]"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[14px] font-black text-ink">
              <BookOpen className="h-4 w-4 text-accent" />
              缸内生物图鉴
            </div>
            <div className="mt-0.5 text-[10px] font-bold text-ink/45">
              已获得 {acquiredArchiveCount} / {tankArchiveItems.length} · {activeAquarium.name}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {ownedArchivePreviewItems.length > 0 && (
              <div className="flex -space-x-2">
                {ownedArchivePreviewItems.map(item => (
                  <span key={item.fish.id} className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white bg-white shadow-sm">
                    <img src={item.fish.image} alt={item.fish.name} className="h-full w-full object-contain p-0.5" referrerPolicy="no-referrer" />
                  </span>
                ))}
              </div>
            )}
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-[13px] font-black tabular-nums text-ink shadow-sm">
              {archiveCollectionRate}%
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
                缸内生物图鉴
              </div>
              <div className="mt-1 text-[10px] font-bold text-ink/45">{activeAquarium.name}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[11px] font-bold text-ink/45">收集度</div>
              <div className="mt-1 rounded-full bg-white/80 px-2.5 py-1 text-[16px] font-black tabular-nums text-ink shadow-sm">
                {archiveCollectionRate}%
              </div>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {archiveCategories.map(category => {
              const isSelected = tankArchiveCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setTankArchiveCategory(category)}
                  className={`shrink-0 rounded-t-[12px] px-3 py-2 text-[12px] font-black transition-colors ${
                    isSelected
                      ? 'bg-white text-ink shadow-sm'
                      : 'bg-white/45 text-ink/42 hover:bg-white/70 hover:text-ink/70'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative bg-[#FBFAF6] px-2.5 pb-4 pt-3 before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_20%_10%,rgba(27,77,62,0.06),transparent_24%),linear-gradient(rgba(26,26,26,0.025)_1px,transparent_1px)] before:bg-[length:100%_100%,18px_18px]">
          {filteredTankArchiveItems.length > 0 ? (
            <div className="relative grid grid-cols-5 gap-x-1.5 gap-y-4">
              {filteredTankArchiveItems.map(item => {
                const ownedAqFish = activeAquarium.fishes.find(aqFish => aqFish.fishId === item.fish.id);
                const canOpenDetail = !item.locked && ownedAqFish && item.source === 'stocked';

                return (
                  <button
                    key={`${item.locked ? 'locked' : 'owned'}-${item.fish.id}`}
                    type="button"
                    disabled={!canOpenDetail}
                    onClick={() => {
                      if (canOpenDetail) setSelectedAqFish({ fish: item.fish, aqFish: ownedAqFish });
                    }}
                    className={`group min-w-0 text-center ${canOpenDetail ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="relative mx-auto flex h-[46px] w-full items-end justify-center">
                      <img
                        src={item.fish.image}
                        alt={item.fish.name}
                        referrerPolicy="no-referrer"
                        className={`max-h-[44px] max-w-full object-contain transition-transform duration-200 ${
                          item.locked
                            ? 'grayscale opacity-20 brightness-0'
                            : 'drop-shadow-[0_8px_10px_rgba(27,77,62,0.16)] group-hover:scale-[1.04]'
                        }`}
                      />
                      {!item.locked && item.quantity > 1 && (
                        <span className="absolute right-0 top-0 rounded-full bg-ink/80 px-1 py-0.5 text-[8px] font-black text-white">
                          x{item.quantity}
                        </span>
                      )}
                    </div>
                    <div className={`mt-1.5 truncate text-[10px] font-bold leading-tight ${item.locked ? 'text-ink/38' : 'text-ink/75'}`}>
                      {item.fish.name}
                    </div>
                    <div className={`mt-0.5 truncate text-[9px] font-medium leading-tight ${item.locked ? 'text-ink/34' : 'text-ink/48'}`}>
                      {item.locked ? '未获取' : `${format(new Date(item.acquiredDate), 'M-d')} 已得`}
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
              <div className="text-sm font-black text-ink">还没有这一类图鉴</div>
              <p className="mx-auto mt-1 max-w-[220px] text-[11px] font-medium leading-relaxed text-ink/50">
                应用搭建方案或添加生物后，这里会自动点亮。
              </p>
            </div>
          )}
        </div>
          </>
        )}
      </section>

      {/* Delete Tank Button */}
      {aquariums.length > 1 && (
        <div className="order-[7] flex justify-end mt-4">
          <Button variant="ghost" className="text-[#D32F2F] hover:bg-[#FFF4F4] hover:text-[#D32F2F] text-xs font-bold" onClick={() => handleDeleteAquarium(activeId)}>
            删除当前鱼缸
          </Button>
        </div>
      )}

      <Dialog open={isTankPreviewOpen} onOpenChange={setIsTankPreviewOpen}>
        <DialogContent className="h-[86vh] w-[94vw] max-w-[920px] overflow-hidden rounded-sm border-border p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>鱼缸全屏预览</DialogTitle>
            <DialogDescription>放大查看当前鱼缸 3D 画面。</DialogDescription>
          </DialogHeader>
          <div className="relative h-full w-full bg-[#DDEAE8]">
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
                onSpeciesSelect={setActive3DSpecies}
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
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 border-t border-white/30 bg-gradient-to-t from-white/42 via-white/14 to-transparent px-4 pb-3 pt-5 backdrop-blur-[1px]">
              <div className="flex items-center gap-3">
                <div className={`flex shrink-0 items-center gap-1.5 text-[12px] font-black ${healthColor}`}>
                  <Activity className="h-4 w-4" />
                  健康 {healthScore}%
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/42">
                  <div className={`h-1.5 rounded-full ${healthBarColor} opacity-85 transition-all duration-1000`} style={{ width: `${healthScore}%` }} />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDiagnosisOpen} onOpenChange={setIsDiagnosisOpen}>
        <DialogContent className="w-[92vw] max-w-[560px] max-h-[86vh] overflow-y-auto rounded-sm border-border p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-xl font-bold italic text-ink">
              <Activity className="h-5 w-5 text-accent" />
              一键诊断
            </DialogTitle>
            <DialogDescription className="text-xs text-ink/60">
              基于当前鱼缸记录、换水周期、温度和本地风险做护理分析。
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-sm border border-accent/15 bg-accent-light/20 p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {['鱼怀孕护理', '鱼苗喂养', '水质变差处理'].map(topic => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => handleOpenDiagnosis(topic)}
                  className="rounded-full border border-accent/20 bg-white px-2.5 py-1 text-[11px] font-bold text-accent hover:bg-accent hover:text-white"
                >
                  {topic}
                </button>
              ))}
            </div>
            <div className="min-h-[260px] whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-ink/80">
              {diagnosisText || (isDiagnosing ? '正在分析当前鱼缸...' : '点击上方主题或一键诊断，查看当前鱼缸护理建议。')}
              {isDiagnosing && <span className="animate-pulse">▍</span>}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input
              value={diagnosisQuestion}
              onChange={(event) => setDiagnosisQuestion(event.target.value)}
              placeholder="继续追问，例如：鱼苗今天怎么喂？"
              className="h-10 rounded-sm text-sm"
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleDiagnosisFollowUp();
              }}
            />
            <Button onClick={handleDiagnosisFollowUp} disabled={isDiagnosing || !diagnosisQuestion.trim()} className="h-10 rounded-sm bg-accent px-3 text-sm font-bold text-white">
              追问
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Fish Dialog (Search Based) */}
      <Dialog open={isAddFishOpen} onOpenChange={(open) => {
        setIsAddFishOpen(open);
        if (!open) {
          setFishSearchTerm('');
          setSelectedFishId('');
        }
      }}>
        <DialogContent className="w-[90vw] max-w-[425px] rounded-sm border-border p-5">
          <DialogHeader>
            <DialogTitle className="font-serif italic text-xl text-ink font-bold">添加生物到鱼缸</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-[11px] uppercase tracking-wider text-ink/70 font-bold">1. 搜索生物</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/50" />
                <Input 
                  placeholder="输入名称或学名..." 
                  className="pl-9 rounded-sm border-border text-sm h-10 text-ink font-medium bg-bg"
                  value={fishSearchTerm}
                  onChange={(e) => {
                    setFishSearchTerm(e.target.value);
                    setSelectedFishId(''); // reset selection on new search
                  }}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-[11px] uppercase tracking-wider text-ink/70 font-bold">
                {fishSearchTerm.trim() ? '搜索结果' : '智能混养推荐'}
              </Label>
              {!fishSearchTerm.trim() && (
                <p className="text-[11px] leading-relaxed text-ink/60 font-medium -mt-1">{recommendationHint}</p>
              )}
              <ScrollArea className="h-[210px] border border-border rounded-sm bg-white p-2">
                <div className="flex flex-col gap-1">
                  {(fishSearchTerm.trim() ? searchResults : recommendedFishes).map(fish => (
                    <div 
                      key={fish.id}
                      onClick={() => setSelectedFishId(fish.id)}
                      className={`flex items-center gap-3 p-2 rounded-sm cursor-pointer transition-colors ${
                        selectedFishId === fish.id ? 'bg-accent-light border border-accent' : 'hover:bg-bg border border-transparent'
                      }`}
                    >
                      <img src={fish.image} alt={fish.name} className="w-8 h-8 rounded-full object-contain p-0.5 bg-white" referrerPolicy="no-referrer" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-ink truncate">{fish.name}</h4>
                          {!fishSearchTerm.trim() && (
                            <span className="shrink-0 rounded-full bg-accent-light px-2 py-0.5 text-[9px] font-bold text-accent">
                              推荐
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-ink/60 font-medium truncate">
                          {fishSearchTerm.trim() ? fish.category : recommendationReasonById.get(fish.id) || fish.category}
                        </p>
                      </div>
                    </div>
                  ))}
                  {fishSearchTerm.trim() && searchResults.length === 0 && (
                    <div className="text-center py-4 text-xs text-ink/50 font-medium">没有找到相关生物</div>
                  )}
                  {!fishSearchTerm.trim() && recommendedFishes.length === 0 && (
                    <div className="rounded-sm bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 font-medium">
                      {noRecommendationHint}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fish-quantity" className="text-[11px] uppercase tracking-wider text-ink/70 font-bold">2. 数量</Label>
                <Input 
                  id="fish-quantity" 
                  type="number" 
                  min="1"
                  className="rounded-sm border-border text-sm h-10 text-ink font-medium"
                  value={fishQuantity}
                  onChange={(e) => setFishQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="entry-date" className="text-[11px] uppercase tracking-wider text-ink/70 font-bold">3. 入缸日期</Label>
                <Input 
                  id="entry-date" 
                  type="date" 
                  className="rounded-sm border-border text-sm h-10 text-ink font-medium"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" className="rounded-sm border-border text-sm h-10 font-bold text-ink" onClick={() => setIsAddFishOpen(false)}>取消</Button>
            <Button className="rounded-sm bg-accent text-white hover:bg-accent/90 text-sm h-10 font-bold" onClick={handleAddFish} disabled={!selectedFishId || !entryDate}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recommend Tank Mates Dialog */}
      <Dialog open={isRecommendOpen} onOpenChange={setIsRecommendOpen}>
        <DialogContent className="w-[90vw] max-w-[500px] rounded-sm border-border p-5">
          <DialogHeader>
            <DialogTitle className="font-serif italic text-xl text-ink font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              智能混养推荐
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {isRecommending ? (
              <div className="flex flex-col items-center justify-center py-10 gap-4">
                <Activity className="w-8 h-8 text-accent animate-spin" />
                <p className="text-sm text-ink/70 font-bold animate-pulse">正在连线知识库进行智能筛选...</p>
              </div>
            ) : (
              <>
                <div className="mb-4 rounded-sm border border-accent/20 bg-accent/5 p-3">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-accent/15 bg-white px-2.5 py-1 text-[11px] font-bold text-accent">
                      {activeAquarium.waterType === 'Saltwater' ? '海水缸' : '淡水缸'}
                    </span>
                    <span className="rounded-full border border-accent/15 bg-white px-2.5 py-1 text-[11px] font-bold text-accent">
                      {activeAquarium.targetTemperature || 25}°C
                    </span>
                    <span className="rounded-full border border-accent/15 bg-white px-2.5 py-1 text-[11px] font-bold text-accent">
                      已有 {activeAquarium.fishes.length} 种生物
                    </span>
                  </div>
                  <div>
                    <div className="mb-2 text-[11px] font-black uppercase tracking-[1px] text-accent">推荐逻辑</div>
                    <ul className="space-y-2">
                      {formatRecommendationReason(aiReasoning).map((line, index) => (
                        <li key={`${line}-${index}`} className="grid grid-cols-[18px_1fr] gap-2 text-[13px] font-medium leading-relaxed text-ink/80">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-ink">AI 提到的生物</h4>
                  <span className="text-[11px] font-bold text-ink/45">可一键加入种草清单</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {aiRecommendations.map(fish => (
                    <div key={fish.id} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-sm border border-border bg-white p-2 transition-colors hover:border-accent">
                      <img src={fish.image} alt={fish.name} className="h-14 w-14 rounded-sm bg-bg object-contain p-1" referrerPolicy="no-referrer" />
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-bold text-ink">{fish.name}</h4>
                        <p className="truncate text-[10px] font-medium text-ink/60">{fish.category}</p>
                        <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-relaxed text-ink/50">
                          {recommendationReasonById.get(fish.id) || '与当前鱼缸参数兼容'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className={`h-9 shrink-0 rounded-sm px-2 text-[11px] font-black ${
                          wishlistFishIds.has(fish.id)
                            ? 'border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100'
                            : 'border-accent/30 text-accent hover:bg-accent hover:text-white'
                        }`}
                        onClick={() => toggleWishlist(fish.id)}
                      >
                        <Heart className={`mr-1 h-3.5 w-3.5 ${wishlistFishIds.has(fish.id) ? 'fill-current' : ''}`} />
                        {wishlistFishIds.has(fish.id) ? '已种草' : '种草'}
                      </Button>
                    </div>
                  ))}
                  {aiRecommendations.length === 0 && (
                    <div className="col-span-full text-center text-xs text-ink/50 py-4">
                      未能找到匹配的推荐生物。
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button className="rounded-sm bg-ink text-white font-bold w-full" onClick={() => setIsRecommendOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="w-[90vw] max-w-[400px] rounded-sm border-border p-5">
          <DialogHeader>
            <DialogTitle className="font-serif italic text-xl text-ink font-bold">换水日历</DialogTitle>
            <DialogDescription className="text-xs text-ink/70">点击日期记录或取消换水。</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-bold text-ink">{format(calendarMonth, 'yyyy年 MM月')}</span>
              <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                <div key={d} className="text-[10px] font-bold text-ink/50">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: getDay(startOfMonth(calendarMonth)) }).map((_, i) => (
                <div key={`empty-${i}`} className="h-8" />
              ))}
              {eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) }).map(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const isChanged = (activeAquarium.waterChangeHistory || []).includes(dateStr);
                const isToday = isSameDay(date, new Date());
                return (
                  <button
                    key={dateStr}
                    onClick={() => handleToggleWaterChangeDate(dateStr)}
                    className={`h-8 rounded-sm text-xs font-bold transition-colors flex items-center justify-center relative ${
                      isChanged ? 'bg-accent text-white' : 'hover:bg-bg text-ink'
                    } ${isToday && !isChanged ? 'border border-accent text-accent' : ''}`}
                  >
                    {format(date, 'd')}
                    {isChanged && <Droplets className="w-2.5 h-2.5 absolute bottom-0.5 right-0.5 opacity-50" />}
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button className="rounded-sm bg-ink text-white font-bold w-full" onClick={() => setIsCalendarOpen(false)}>完成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tank Build Plan Modal */}
      <Dialog open={isBuildPlanOpen} onOpenChange={setIsBuildPlanOpen}>
        <DialogContent className="w-[94vw] max-w-[560px] max-h-[90vh] overflow-y-auto rounded-sm border-border p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-xl font-bold italic text-ink">
              <Layers3 className="h-5 w-5 text-emerald-700" />
              鱼缸搭建方案
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-ink/60">
              先用模板把底砂、水草、硬景和设备搭起来；生物只作为推荐清单，确认购买和入缸后再手动添加。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {tankBuildTemplates.map(template => {
                const isSelected = selectedBuildTemplate.id === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedBuildTemplateId(template.id)}
                    className={`rounded-sm border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-border bg-white text-ink hover:border-emerald-300'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-black">{template.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        template.difficulty === '新手'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {template.difficulty}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[11px] font-medium leading-relaxed text-ink/60">{template.tagline}</p>
                  </button>
                );
              })}
            </div>

            <div className="rounded-sm border border-emerald-200 bg-white p-3 shadow-sm">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-[17px] font-black leading-tight text-ink">{selectedBuildTemplate.name}</h3>
                  <p className="mt-1 text-[11px] font-medium leading-relaxed text-ink/60">{selectedBuildTemplate.tagline}</p>
                </div>
                <span className="rounded-full bg-bg px-2.5 py-1 text-[10px] font-bold text-ink/55">
                  {selectedBuildTemplate.tankSize}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-sm bg-bg p-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-ink/45">适合场景</div>
                  <div className="mt-1 text-xs font-bold leading-relaxed text-ink">{selectedBuildTemplate.bestFor}</div>
                </div>
                <div className="rounded-sm bg-bg p-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-ink/45">推荐温度</div>
                  <div className="mt-1 text-xs font-bold leading-relaxed text-ink">{selectedBuildTemplate.temperature}°C</div>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {[
                  { title: '底砂', items: [selectedBuildTemplate.substrate] },
                  { title: '水草', items: selectedBuildTemplate.plants.map(getSpeciesDisplayName) },
                  { title: '硬景', items: selectedBuildTemplate.hardscape.map(getSpeciesDisplayName) },
                  { title: '设备', items: selectedBuildTemplate.equipment },
                  { title: '生物推荐', items: selectedBuildTemplate.livestock },
                  { title: '维护提醒', items: selectedBuildTemplate.maintenance },
                ].map(section => (
                  <div key={section.title}>
                    <div className="mb-1.5 text-[11px] font-black tracking-wide text-ink/55">{section.title}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {section.items.map(item => (
                        <span key={`${section.title}-${item}`} className="rounded-full border border-border bg-bg px-2.5 py-1 text-[11px] font-bold text-ink/70">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-sm border border-amber-200 bg-amber-50 p-3 text-[11px] font-medium leading-relaxed text-amber-900">
                <span className="font-black">注意：</span>{selectedBuildTemplate.caution}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsBuildPlanOpen(false)} className="h-9 rounded-sm text-sm font-bold">先看看</Button>
            <Button onClick={() => handleApplyBuildTemplate(selectedBuildTemplate)} className="h-9 rounded-sm bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800">
              应用到当前鱼缸
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="w-[92vw] max-w-[560px] max-h-[90vh] overflow-y-auto rounded-sm border-border p-5">
          <DialogHeader>
            <DialogTitle className="font-serif italic text-xl text-ink font-bold">鱼缸设置</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-2">
                <Label className="text-[11px] uppercase tracking-wider text-ink/70 font-bold">长 (cm)</Label>
                <Input type="number" inputMode="decimal" value={settingsForm.dimensions?.length || ''} onChange={e => setSettingsForm({...settingsForm, dimensions: {...settingsForm.dimensions!, length: e.target.value}})} className="h-9 text-sm" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[11px] uppercase tracking-wider text-ink/70 font-bold">宽 (cm)</Label>
                <Input type="number" inputMode="decimal" value={settingsForm.dimensions?.width || ''} onChange={e => setSettingsForm({...settingsForm, dimensions: {...settingsForm.dimensions!, width: e.target.value}})} className="h-9 text-sm" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[11px] uppercase tracking-wider text-ink/70 font-bold">高 (cm)</Label>
                <Input type="number" inputMode="decimal" value={settingsForm.dimensions?.height || ''} onChange={e => setSettingsForm({...settingsForm, dimensions: {...settingsForm.dimensions!, height: e.target.value}})} className="h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-sm border border-accent/15 bg-accent-light/20 p-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink/50">理论容量</div>
                <div className="mt-1 font-serif text-2xl font-bold text-ink">
                  {settingsGrossVolumeLiters > 0 ? `${settingsGrossVolumeLiters}L` : '--'}
                </div>
                <div className="mt-0.5 text-[10px] font-medium text-ink/45">长×宽×高÷1000</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink/50">估算实际水量</div>
                <div className="mt-1 font-serif text-2xl font-bold text-accent">
                  {settingsEstimatedWaterLiters > 0 ? `${settingsEstimatedWaterLiters}L` : '--'}
                </div>
                <div className="mt-0.5 text-[10px] font-medium text-ink/45">按约 85% 水位/造景估算</div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-[11px] uppercase tracking-wider text-ink/70 font-bold">水质类型</Label>
              <Select value={settingsForm.waterType || 'Freshwater'} onValueChange={v => setSettingsForm({...settingsForm, waterType: v as any})}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Freshwater">淡水</SelectItem>
                  <SelectItem value="Saltwater">海水</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-[11px] uppercase tracking-wider text-ink/70 font-bold">目标温度 (°C)</Label>
              <Input type="number" value={settingsForm.targetTemperature || ''} onChange={e => setSettingsForm({...settingsForm, targetTemperature: e.target.value})} className="h-9 text-sm" />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-[11px] uppercase tracking-wider text-ink/70 font-bold">底砂 / 硬景造景</Label>
                <button
                  type="button"
                  onClick={() => setIsScapeListExpanded(prev => !prev)}
                  className="text-[11px] font-bold text-accent hover:text-accent/80"
                >
                  {isScapeListExpanded ? '收起' : `展开全部${selectedScapeCount > 0 ? ` · 已选${selectedScapeCount}` : ''}`}
                </button>
              </div>
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  {visibleScapeOptions.map(option => {
                    const currentHardscape = settingsForm.hardscape || [];
                    const isSelected = option.type === 'substrate'
                      ? option.value === currentSubstrate
                      : currentHardscape.includes(option.value);
                    return (
                      <button
                        key={option.id}
                        type="button"
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
                        className={`flex items-center gap-2 px-2 py-2 text-left text-xs rounded-sm border transition-colors ${isSelected ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'}`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-sm border ${isSelected ? 'border-white/50 bg-white/90' : 'border-border bg-bg'}`}>
                          {option.type === 'hardscape' ? (
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
                        </span>
                        <span className="min-w-0 leading-tight">
                          <span className="block break-words font-bold">{option.label}</span>
                          <span className={`block break-words text-[10px] mt-0.5 ${isSelected ? 'text-white/70' : 'text-ink/45'}`}>
                            {option.type === 'substrate' ? `底砂 · ${option.hint}` : `硬景 · ${option.hint}`}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!isScapeListExpanded && hiddenScapeCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsScapeListExpanded(true)}
                    className="rounded-sm border border-dashed border-ink/30 bg-bg px-3 py-2 text-center text-xs font-bold text-ink/70 hover:border-ink hover:text-ink"
                  >
                    还有 {hiddenScapeCount} 个底砂/硬景选项，点击展开
                  </button>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-[11px] uppercase tracking-wider text-ink/70 font-bold">水草种类 (多选)</Label>
                <button
                  type="button"
                  onClick={() => setIsPlantListExpanded(prev => !prev)}
                  className="text-[11px] font-bold text-accent hover:text-accent/80"
                >
                  {isPlantListExpanded ? '收起' : `展开全部${selectedPlantCount > 0 ? ` · 已选${selectedPlantCount}` : ''}`}
                </button>
              </div>
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  {visiblePlantOptions.map(plant => {
                    const current = settingsForm.plants || [];
                    const isSelected = current.includes(plant.id) || current.includes(plant.name);
                    return (
                      <button 
                        key={plant.id}
                        onClick={() => {
                          setSettingsForm({
                            ...settingsForm, 
                            plants: isSelected
                              ? current.filter(p => p !== plant.id && p !== plant.name)
                              : [...current, plant.id]
                          });
                        }}
                        className={`flex items-center gap-2 px-2 py-2 text-left text-xs rounded-sm border transition-colors ${isSelected ? 'bg-accent text-white border-accent' : 'bg-white text-ink border-border hover:border-accent'}`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white/90 border border-white/60">
                          <img src={plant.image} alt={plant.name} className="h-full w-full object-contain p-0.5" referrerPolicy="no-referrer" />
                        </span>
                        <span className="min-w-0 leading-tight">
                          <span className="block break-words font-bold">{plant.name}</span>
                          <span className={`block break-words text-[10px] mt-0.5 ${isSelected ? 'text-white/75' : 'text-ink/45'}`}>{plant.scientificName}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!isPlantListExpanded && hiddenPlantCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsPlantListExpanded(true)}
                    className="rounded-sm border border-dashed border-accent/40 bg-accent/5 px-3 py-2 text-center text-xs font-bold text-accent hover:bg-accent/10"
                  >
                    还有 {hiddenPlantCount} 种水草，点击展开
                  </button>
                )}
              </div>
            </div>
            <div className="grid gap-2 border-t border-border pt-4">
              <Label className="text-[11px] uppercase tracking-wider text-ink/70 font-bold">过滤系统</Label>
              <Select
                value={settingsForm.equipment?.filter || '瀑布过滤'}
                onValueChange={v => setSettingsForm({
                  ...settingsForm,
                  equipment: { ...(settingsForm.equipment || {}), filter: v as any }
                })}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="无">无</SelectItem>
                  <SelectItem value="瀑布过滤">瀑布过滤</SelectItem>
                  <SelectItem value="桶滤">桶滤</SelectItem>
                  <SelectItem value="上滤">上滤</SelectItem>
                  <SelectItem value="海绵过滤">海绵过滤</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-[11px] uppercase tracking-wider text-ink/70 font-bold">灯光</Label>
              <Select
                value={settingsForm.equipment?.light || '普通灯'}
                onValueChange={v => setSettingsForm({
                  ...settingsForm,
                  equipment: { ...(settingsForm.equipment || {}), light: v as any }
                })}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="无">无</SelectItem>
                  <SelectItem value="普通灯">普通灯</SelectItem>
                  <SelectItem value="水草灯">水草灯</SelectItem>
                  <SelectItem value="海水灯">海水灯</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-[11px] uppercase tracking-wider text-ink/70 font-bold">设备开关</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'heater', label: '加热棒' },
                  { key: 'oxygen', label: '氧气/气泡石' },
                ].map(device => {
                  const isSelected = Boolean((settingsForm.equipment as any)?.[device.key]);
                  return (
                    <button
                      key={device.key}
                      onClick={() => setSettingsForm({
                        ...settingsForm,
                        equipment: {
                          ...(settingsForm.equipment || {}),
                          [device.key]: !isSelected
                        }
                      })}
                      className={`px-3 py-1 text-xs rounded-sm border font-bold transition-colors ${isSelected ? 'bg-accent text-white border-accent' : 'bg-white text-ink border-border hover:border-accent'}`}
                    >
                      {device.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)} className="h-9 text-sm">取消</Button>
            <Button onClick={() => {
              const updated = aquariums.map(a => a.id === activeId ? { ...a, ...settingsForm } : a);
              saveAquariums(updated);
              setIsSettingsOpen(false);
            }} className="h-9 text-sm bg-accent text-white hover:bg-accent/90">保存</Button>
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

      {/* Fish Details Modal */}
      <Dialog open={!!selectedAqFish} onOpenChange={(open) => !open && setSelectedAqFish(null)}>
        <DialogContent className="w-[90vw] max-w-[600px] p-0 overflow-hidden border-border rounded-sm">
          {selectedAqFish && (
            <ScrollArea className="max-h-[85vh]">
              <div className="h-[180px] md:h-[240px] bg-bg relative border-b border-border">
                <img 
                  src={selectedAqFish.fish.image} 
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
                        const deceasedRecords: DeceasedRecord[] = JSON.parse(localStorage.getItem('deceasedRecords') || '[]');
                        deceasedRecords.push({
                          id: Math.random().toString(36).substring(2, 9),
                          fishId: selectedAqFish.fish.id,
                          date: new Date().toISOString()
                        });
                        localStorage.setItem('deceasedRecords', JSON.stringify(deceasedRecords));
                        
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
        <DialogContent className="max-w-[425px] rounded-sm p-6 border-yellow-200 bg-yellow-50/90 backdrop-blur-md">
          <DialogHeader className="mb-2">
             <div className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="w-5 h-5" />
                <DialogTitle className="text-xl font-bold font-serif">鱼缸风险警告</DialogTitle>
             </div>
             <DialogDescription className="text-yellow-700/80 text-xs">检测到当前鱼缸环境、生物密度或混养关系存在风险。</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 my-2">
            <ul className="list-disc pl-5 text-sm text-yellow-800 space-y-1.5 font-medium">
              {conflicts.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
          {aiReasoning ? (
            <div className="mt-4 p-3 bg-white/60 border border-yellow-200 rounded-sm text-xs text-ink/80 leading-relaxed font-medium">
               <div className="text-yellow-600 font-bold mb-1 flex items-center"><Sparkles className="w-3 h-3 mr-1" />专家建议</div>
               {aiReasoning.split('\n').map((line, idx) => <p key={idx} className="mb-1">{line}</p>)}
            </div>
          ) : (
            <Button 
               onClick={handleAskAIAboutConflicts} 
               disabled={isRecommending}
               className="mt-4 w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold h-10 shadow-sm"
            >
               {isRecommending ? "正在分析中..." : <><Sparkles className="w-4 h-4 mr-2" /> AI 详细分析原因</>}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
