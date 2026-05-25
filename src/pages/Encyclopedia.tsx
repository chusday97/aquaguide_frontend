import { useState, useEffect, useMemo } from 'react';
import type { PointerEvent } from 'react';
import { Fish, Aquarium } from '../types';
import { encyclopediaService } from '../modules/encyclopedia/encyclopedia.service';
import { getSecondaryCategory, getToolFunctions } from '../modules/species/species.service';
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
import { Search, ChevronDown, ChevronUp, X, Heart, HeartOff, Skull, Thermometer, CheckCircle2, Plus } from 'lucide-react';

const difficulties = [
  { id: 'Easy', label: '新手适宜' },
  { id: 'Medium', label: '进阶挑战' },
  { id: 'Hard', label: '骨灰级玩家' }
];

const lifeTypes = [
  { id: 'freshwaterFish', label: '淡水鱼', hint: '草缸/冷水/热带鱼' },
  { id: 'saltwaterFish', label: '海水鱼', hint: '海缸观赏鱼' },
  { id: 'invertebrate', label: '虾螺蟹', hint: '工具生物' },
  { id: 'reptile', label: '龟/两栖', hint: '单养优先' },
  { id: 'coral', label: '珊瑚/海葵', hint: '海水无脊椎' },
];

const housingModes: Array<NonNullable<Fish['housingMode']>> = ['适合混养', '谨慎混养', '建议单养'];

const ENCYCLOPEDIA_DISPLAY_IMAGE_OVERRIDES: Record<string, string> = {
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

const getEncyclopediaImage = (fish: Fish) => (
  ENCYCLOPEDIA_DISPLAY_IMAGE_OVERRIDES[fish.id]
  || fish.image
);

const loadDiscoveryState = () => {
  try {
    return normalizeDiscoveryState(JSON.parse(localStorage.getItem(DISCOVERY_STORAGE_KEY) || 'null'));
  } catch {
    return normalizeDiscoveryState();
  }
};

const saveDiscoveryState = (state: DiscoveryDeckState) => {
  localStorage.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify(state));
};

const loadWishlistIds = () => {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem('wishlistFishIds') || '[]'));
  } catch {
    return new Set<string>();
  }
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

const getHousingBadgeClass = (mode?: Fish['housingMode']) => {
  switch (mode) {
    case '建议单养':
      return 'bg-red-50 text-red-600 border-red-200';
    case '谨慎混养':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case '适合混养':
    default:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [waterTypeFilter, setWaterTypeFilter] = useState<string>('All');
  const [lifeTypeFilter, setLifeTypeFilter] = useState<string>('All');
  const [housingFilter, setHousingFilter] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [selectedFish, setSelectedFish] = useState<Fish | null>(null);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [hasSelectedLifeTypeOnce, setHasSelectedLifeTypeOnce] = useState(false);

  const [ownedFishIds, setOwnedFishIds] = useState<Set<string>>(new Set());
  const [wishlistFishIds, setWishlistFishIds] = useState<Set<string>>(() => loadWishlistIds());
  const [discoveryState, setDiscoveryState] = useState<DiscoveryDeckState>(() => loadDiscoveryState());
  const [discoveryDragStartX, setDiscoveryDragStartX] = useState<number | null>(null);
  const [discoveryDragX, setDiscoveryDragX] = useState(0);
  const [discoveryMessage, setDiscoveryMessage] = useState('');
  const [loadedDiscoveryImageSrc, setLoadedDiscoveryImageSrc] = useState('');

  useEffect(() => {
    const savedAq = localStorage.getItem('aquariums');
    if (savedAq) {
      const aquariums: Aquarium[] = JSON.parse(savedAq);
      const ids = new Set<string>();
      aquariums.forEach(aq => {
        aq.fishes.forEach(f => ids.add(f.fishId));
      });
      setOwnedFishIds(ids);
    }

    setWishlistFishIds(loadWishlistIds());
  }, []);

  const toggleWishlist = (id: string) => {
    const next = new Set(wishlistFishIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setWishlistFishIds(next);
    localStorage.setItem('wishlistFishIds', JSON.stringify(Array.from(next)));
  };

  const encyclopediaCatalog = useMemo(
    () => encyclopediaService.search({
      searchTerm,
      lifeType: lifeTypeFilter as 'All' | 'freshwaterFish' | 'saltwaterFish' | 'invertebrate' | 'reptile' | 'coral',
      category: selectedCategory,
      difficulty: difficultyFilter as 'All' | 'Easy' | 'Medium' | 'Hard',
      waterType: waterTypeFilter as 'All' | 'Freshwater' | 'Saltwater' | 'Coldwater',
      housingMode: housingFilter as 'All' | '适合混养' | '谨慎混养' | '建议单养',
      limit: 500,
    }),
    [difficultyFilter, housingFilter, lifeTypeFilter, searchTerm, selectedCategory, waterTypeFilter]
  );
  const allFishes = encyclopediaCatalog.allItems;
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

    if (output.addedWishlistId) {
      const next = new Set(wishlistFishIds);
      next.add(output.addedWishlistId);
      setWishlistFishIds(next);
      localStorage.setItem('wishlistFishIds', JSON.stringify(Array.from(next)));
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

  const handleDifficultyClick = (id: string) => {
    setDifficultyFilter(prev => prev === id ? 'All' : id);
    setSelectedCategory('全部');
  };

  const handleLifeTypeClick = (id: string) => {
    setLifeTypeFilter(prev => prev === id ? 'All' : id);
    setHasSelectedLifeTypeOnce(true);
    setSelectedCategory('全部');
  };

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(prev => prev === cat ? '全部' : cat);
  };

  const clearFilters = () => {
    setDifficultyFilter('All');
    setWaterTypeFilter('All');
    setLifeTypeFilter('All');
    setHousingFilter('All');
    setSelectedCategory('全部');
    setHasSelectedLifeTypeOnce(false);
  };

  const hasActiveFilters = difficultyFilter !== 'All' || waterTypeFilter !== 'All' || lifeTypeFilter !== 'All' || housingFilter !== 'All' || selectedCategory !== '全部';
  const categories = encyclopediaCatalog.categories;
  const lifeTypeCounts = encyclopediaCatalog.lifeTypeCounts;

  useEffect(() => {
    if (selectedCategory !== '全部' && !categories.includes(selectedCategory)) {
      setSelectedCategory('全部');
    }
  }, [categories, selectedCategory]);

  const filteredFishes = encyclopediaCatalog.items;

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '极易';
      case 'Medium': return '中等';
      case 'Hard': return '困难';
      default: return difficulty;
    }
  };

  const handleAddToTank = (fish: Fish) => {
    const saved = localStorage.getItem('aquariums');
    if (!saved) {
      alert('请先在“我的鱼缸”页面创建一个鱼缸！');
      return;
    }
    const aquariums = JSON.parse(saved);
    if (aquariums.length === 0) return;
    
    // Add to the first aquarium by default from encyclopedia
    const aquarium = aquariums[0];
    
    const newFish = {
      id: Math.random().toString(36).substring(2, 9),
      fishId: fish.id,
      entryDate: new Date().toISOString(),
      lastWaterChangeDate: new Date().toISOString(),
    };
    
    aquarium.fishes.push(newFish);
    localStorage.setItem('aquariums', JSON.stringify(aquariums));
    setOwnedFishIds(prev => new Set(prev).add(fish.id));
    alert(`已将 ${fish.name} 添加到 ${aquarium.name}！`);
    setSelectedFish(null);
  };

  return (
    <div className="flex min-w-0 flex-col gap-6 overflow-x-hidden">
      <section className="relative overflow-hidden rounded-sm border border-border bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl italic font-bold text-ink">今天想养哪一种？</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-ink/60">给你一点新的水族灵感。</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold text-ink/60 border border-border">
              今日剩余 {discoveryRemainingToday}/{DISCOVERY_DAILY_LIMIT}
            </div>
            <div className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-500 border border-rose-100">
              {wishlistFishIds.size} 已种草
            </div>
          </div>
        </div>

        {discoveryFish ? (
          <div className="relative min-h-[390px]">
            {nextDiscoveryFish && (
              <div className="absolute inset-x-4 top-8 h-[330px] rounded-[24px] border border-border bg-white/70 shadow-sm rotate-[-3deg]">
                <div className="flex h-56 items-center justify-center p-6 opacity-35">
                  <img
                    src={nextDiscoveryImageSrc}
                    alt={nextDiscoveryFish.name}
                    className="h-full w-full object-contain p-5"
                    referrerPolicy="no-referrer"
                    loading="eager"
                    decoding="async"
                  />
                </div>
              </div>
            )}

            <div
              className="relative z-10 select-none rounded-[26px] border border-white bg-white p-4 shadow-xl shadow-sky-100/70 touch-pan-y transition-shadow active:shadow-lg"
              style={{
                transform: `translateX(${discoveryDragX}px) rotate(${discoveryRotation}deg)`,
                transition: discoveryDragStartX === null ? 'transform 220ms ease' : 'none'
              }}
              onPointerDown={handleDiscoveryPointerDown}
              onPointerMove={handleDiscoveryPointerMove}
              onPointerUp={handleDiscoveryPointerEnd}
              onPointerCancel={handleDiscoveryPointerEnd}
            >
              <div className="pointer-events-none absolute left-5 top-5 z-20 flex gap-2">
                <span className={`rounded-full border px-3 py-1 text-[11px] font-black transition-opacity ${discoveryIntent === 'skip' ? 'border-slate-300 bg-slate-50 text-slate-600 opacity-100' : 'opacity-0'}`}>
                  跳过
                </span>
                <span className={`rounded-full border px-3 py-1 text-[11px] font-black transition-opacity ${discoveryIntent === 'interest' ? 'border-rose-200 bg-rose-50 text-rose-500 opacity-100' : 'opacity-0'}`}>
                  加入种草
                </span>
              </div>

              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-ink/70 border border-border shadow-sm"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => setSelectedFish(discoveryFish)}
                >
                  查看详情
                </button>
              </div>

              <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-[18px] p-2">
                {loadedDiscoveryImageSrc !== discoveryImageSrc && (
                  <div className="absolute inset-2 flex items-center justify-center rounded-[18px] bg-gradient-to-br from-sky-50 via-white to-emerald-50">
                    <div className="h-20 w-40 animate-pulse rounded-full bg-slate-100/80 blur-sm" />
                    <span className="absolute bottom-4 text-[11px] font-bold text-ink/35">正在加载鱼图...</span>
                  </div>
                )}
                <img
                  src={discoveryImageSrc}
                  alt={discoveryFish.name}
                  className={`h-full w-full object-contain p-4 drop-shadow-md transition-opacity duration-300 ${loadedDiscoveryImageSrc === discoveryImageSrc ? 'opacity-100' : 'opacity-0'}`}
                  referrerPolicy="no-referrer"
                  loading="eager"
                  decoding="async"
                  draggable={false}
                  onLoad={() => setLoadedDiscoveryImageSrc(discoveryImageSrc)}
                />
              </div>

              <div className="mt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-2xl italic font-bold leading-tight text-ink whitespace-normal break-words [overflow-wrap:anywhere]">
                      {discoveryFish.name}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-ink/55 font-medium whitespace-normal break-words [overflow-wrap:anywhere]">
                      {discoveryFish.scientificName}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${getHousingBadgeClass(discoveryFish.housingMode)}`}>
                    {discoveryFish.housingMode || '适合混养'}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-sm bg-bg p-2">
                    <p className="text-[9px] font-bold text-ink/45">分类</p>
                    <p className="text-[11px] font-black leading-tight text-ink whitespace-normal break-words [overflow-wrap:anywhere]">{getSecondaryCategory(discoveryFish)}</p>
                  </div>
                  <div className="rounded-sm bg-bg p-2">
                    <p className="text-[9px] font-bold text-ink/45">水温</p>
                    <p className="text-[11px] font-black text-ink truncate">{discoveryFish.waterTemperature}</p>
                  </div>
                  <div className="rounded-sm bg-bg p-2">
                    <p className="text-[9px] font-bold text-ink/45">pH</p>
                    <p className="text-[11px] font-black text-ink truncate">{discoveryFish.phLevel}</p>
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 text-[12px] leading-relaxed text-ink/70 font-medium">
                  {discoveryFish.feedingProfile?.recommendedFoods || discoveryFish.diet}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-10 rounded-full border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 text-xs font-black"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => advanceDiscoveryCard('skip')}
                  >
                    <X className="mr-1 h-4 w-4" /> 跳过
                  </Button>
                  <Button
                    className="h-10 rounded-full bg-rose-500 text-white hover:bg-rose-600 text-xs font-black"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => advanceDiscoveryCard('interest')}
                  >
                    <Heart className="mr-1 h-4 w-4 fill-current" /> 感兴趣
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-rose-100 bg-white p-5 text-center shadow-sm">
            <Heart className="mx-auto mb-2 h-8 w-8 fill-rose-400 text-rose-400" />
            <h3 className="font-serif text-lg italic font-bold text-ink">
              {isDiscoveryDailyLimitReached ? '今天的 10 款已经看完啦' : '暂时没有新的随机推荐'}
            </h3>
            <p className="mt-1 text-xs text-ink/60">
              {isDiscoveryDailyLimitReached
                ? '明天再来看看新的灵感。'
                : '稍后再来看看，也许会遇到新的心动物种。'}
            </p>
          </div>
        )}

        {discoveryMessage && (
          <div className="mt-3 rounded-full bg-ink px-3 py-2 text-center text-[11px] font-bold text-white shadow-sm">
            {discoveryMessage}
          </div>
        )}
      </section>

      <div className="flex flex-col gap-5 mt-4">
        <div className="flex min-w-0 flex-col gap-3">
          <h3 className="text-base font-bold text-ink">分类筛选</h3>
          <div className="grid min-w-0 grid-cols-[1fr_auto] items-center gap-2">
             <div className="relative min-w-0">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink/50" />
                <Input 
                  placeholder="搜索生物..." 
                  className="border-border rounded-sm bg-white h-9 pl-7 text-[12px] text-ink placeholder:text-ink/50 font-medium w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <button onClick={clearFilters} className="text-[12px] text-ink/60 hover:text-ink font-bold whitespace-nowrap bg-bg border border-border rounded-sm px-3 h-9 flex items-center transition-colors">
               一键重置
             </button>
          </div>
        </div>

        {/* Row 1: Life Type */}
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-xs font-bold text-ink/70">生物类型</span>
          <div className="grid min-w-0 grid-cols-2 gap-2">
            {lifeTypes.map(type => {
              const isActive = lifeTypeFilter === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => handleLifeTypeClick(type.id)}
                  className={`min-h-[58px] px-3 py-2 text-left rounded-sm border transition-all ${
                    isActive
                      ? 'bg-accent text-white border-accent shadow-sm'
                      : 'bg-white text-ink border-border hover:border-accent hover:text-accent'
                  }`}
                >
                  <div className="break-keep text-[13px] font-bold leading-tight mb-1">{type.label}</div>
                  <div className={`text-[10px] leading-tight ${isActive ? 'text-white/75' : 'text-ink/45'}`}>
                    {type.hint} · {lifeTypeCounts[type.id] || 0}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Difficulty */}
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-xs font-bold text-ink/70">饲养难度</span>
          <div className="flex min-w-0 flex-wrap gap-2">
            {difficulties.map(d => (
              <button
                key={d.id}
                onClick={() => handleDifficultyClick(d.id)}
                className={`px-3 py-2 text-[12px] whitespace-nowrap rounded-sm border transition-colors font-bold ${
                  difficultyFilter === d.id 
                    ? `${getDifficultyBadgeClass(d.id)} ring-2 ring-ink/10 shadow-sm`
                    : `${getDifficultyBadgeClass(d.id)} opacity-80 hover:opacity-100`
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Secondary Category Circles (Wrap & Collapse) */}
        <div className="flex flex-col gap-2">
          {isCategoriesExpanded && (
            <div className="flex min-w-0 flex-col gap-2 mt-2">
              <span className="text-xs font-bold text-ink/70">二级标签</span>
              <div className="relative flex min-w-0 items-start gap-3 overflow-hidden">
                <div className="flex min-w-0 flex-1 flex-wrap gap-3 transition-all duration-300">
                  {categories.length > 0 ? categories.map(cat => {
                    const sampleFish = allFishes.find(f => getSecondaryCategory(f) === cat);
                    const bgImage = sampleFish ? sampleFish.image : 'https://picsum.photos/seed/allfish/100/100';
                    
                    return (
                      <div 
                        key={cat} 
                        className="flex w-[62px] cursor-pointer flex-col items-center gap-1.5" 
                        onClick={() => handleCategoryClick(cat)}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden transition-all ${
                          selectedCategory === cat ? 'border-accent border-[2px] shadow-sm scale-105' : 'border-border border'
                        }`}>
                          <img src={bgImage} alt={cat} className="w-full h-full object-contain p-1 opacity-90" referrerPolicy="no-referrer" />
                        </div>
                        <span className={`max-w-full break-words text-center text-[10px] leading-tight ${selectedCategory === cat ? 'font-bold text-accent' : 'text-ink/80 font-medium'}`}>
                          {cat}
                        </span>
                      </div>
                    );
                  }) : hasSelectedLifeTypeOnce ? (
                    <div className="text-xs text-ink/50 font-medium py-3">
                      当前生物类型暂时没有可用的二级标签，可以换一个生物类型看看。
                    </div>
                  ) : (
                    null
                  )}
                </div>
              </div>
            </div>
          )}
          <button 
            onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
            className="flex items-center justify-center w-full py-1.5 text-[11px] text-ink/60 hover:text-ink font-bold transition-colors border border-border border-dashed rounded-sm mt-1 bg-white hover:bg-bg"
          >
            {isCategoriesExpanded ? (
              <><ChevronUp className="w-3 h-3 mr-1" /> 收起二级标签</>
            ) : (
              <><ChevronDown className="w-3 h-3 mr-1" /> 按二级标签筛选</>
            )}
          </button>
        </div>

        {/* Row 5: Housing Mode */}
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-xs font-bold text-ink/70">混养建议</span>
          <div className="grid min-w-0 grid-cols-3 gap-2">
            {housingModes.map(mode => {
              const isActive = housingFilter === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setHousingFilter(prev => prev === mode ? 'All' : mode)}
                  className={`min-h-10 rounded-sm border px-2 py-2 text-center text-[11px] font-black transition-all ${getHousingBadgeClass(mode)} ${
                    isActive ? 'ring-2 ring-accent/40 shadow-sm' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>
      </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {filteredFishes.map((fish) => {
            const isOwned = ownedFishIds.has(fish.id);
            const isWishlist = wishlistFishIds.has(fish.id);
            const imageClass = isOwned ? 'opacity-100' : 'opacity-90';
            const theme = getFishTemperatureTheme(fish.waterTemperature);
            const toolTags = getToolFunctions(fish);

            return (
              <div 
                key={fish.id} 
                className={`${theme.bgTheme} border p-3 flex flex-col gap-2 cursor-pointer transition-colors group shadow-sm ${isOwned ? 'border-accent/50' : theme.borderTheme}`}
                onClick={() => setSelectedFish(fish)}
              >
                <div className={`w-full aspect-[4/3] bg-white flex items-center justify-center overflow-hidden relative rounded-sm border border-border/50`}>
                  <img 
                    src={getEncyclopediaImage(fish)} 
                    alt={fish.name} 
                    className={`object-contain w-full h-full p-3 transition-opacity duration-300 ${imageClass}`}
                    referrerPolicy="no-referrer"
                  />
                </div>
              <div className="flex flex-col gap-2">
                <div>
                  <h2 className="font-serif text-[15px] italic leading-tight text-ink font-bold whitespace-normal break-words [overflow-wrap:anywhere]">
                    {fish.name}
                  </h2>
                  <p className="text-[11px] leading-tight text-ink/70 font-medium whitespace-normal break-words [overflow-wrap:anywhere]">{getSecondaryCategory(fish)}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold border rounded-sm ${getDifficultyBadgeClass(fish.difficulty)}`}>
                    {getDifficultyLabel(fish.difficulty)}
                  </span>
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold border rounded-sm ${getHousingBadgeClass(fish.housingMode)}`}>
                    {fish.housingMode || '适合混养'}
                  </span>
                  {theme.needsHeater && (
                    <span className="bg-red-50 text-red-500 px-1.5 py-0.5 text-[10px] font-bold border border-red-100 rounded-sm inline-flex items-center gap-1">
                      <Thermometer className="w-3 h-3" /> 需加热
                    </span>
                  )}
                  {isOwned && (
                    <span className="bg-accent/90 text-white px-1.5 py-0.5 text-[10px] font-bold rounded-sm inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> 已拥有
                    </span>
                  )}
                  {isWishlist && (
                    <span className="bg-rose-500/90 text-white px-1.5 py-0.5 text-[10px] font-bold rounded-sm inline-flex items-center gap-1">
                      <Heart className="w-3 h-3" /> 已种草
                    </span>
                  )}
                  {toolTags.slice(0, 2).map(tag => (
                    <span key={tag} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold rounded-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredFishes.length === 0 && (
        <div className="text-center py-12 text-ink/70 text-sm font-medium bg-bg rounded-sm border border-border">
          没有找到匹配的生物。
        </div>
      )}

      <Dialog open={!!selectedFish} onOpenChange={(open) => !open && setSelectedFish(null)}>
        <DialogContent className="w-[90vw] max-w-[600px] p-0 overflow-hidden border-border rounded-sm">
          {selectedFish && (
            <ScrollArea className="max-h-[85vh]">
              <div className="h-[180px] md:h-[240px] bg-bg relative border-b border-border">
                <img 
                  src={getEncyclopediaImage(selectedFish)} 
                  alt={selectedFish.name} 
                  className="object-contain w-full h-full p-4 opacity-95"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-5 md:p-8 flex flex-col gap-5 bg-white">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <DialogTitle className="font-serif text-2xl md:text-3xl italic text-ink font-bold">{selectedFish.name}</DialogTitle>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-sm border ${getHousingBadgeClass(selectedFish.housingMode)}`}>
                          {selectedFish.housingMode || '适合混养'}
                        </span>
                        {getToolFunctions(selectedFish).map(tag => (
                          <span key={tag} className="text-[11px] font-bold px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <DialogDescription className="text-xs text-ink/70 mt-1 font-medium">{selectedFish.scientificName}</DialogDescription>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-sm whitespace-nowrap border ${getDifficultyBadgeClass(selectedFish.difficulty)}`}>
                      {getDifficultyLabel(selectedFish.difficulty)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button 
                      variant="outline" 
                      className={`h-9 text-xs font-bold rounded-sm border-border ${wishlistFishIds.has(selectedFish.id) ? 'bg-rose-50 text-rose-500 border-rose-200 hover:bg-rose-100 hover:text-rose-600' : 'text-ink/70 hover:text-ink'}`}
                      onClick={() => toggleWishlist(selectedFish.id)}
                    >
                      {wishlistFishIds.has(selectedFish.id) ? <Heart className="w-4 h-4 mr-1 fill-current" /> : <HeartOff className="w-4 h-4 mr-1" />}
                      {wishlistFishIds.has(selectedFish.id) ? '已种草' : '加入种草清单'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-9 text-xs font-bold border-border text-ink/70 hover:text-ink hover:bg-gray-100 rounded-sm"
                      onClick={() => {
                        const records = JSON.parse(localStorage.getItem('deceasedRecords') || '[]');
                        records.push({
                          id: Math.random().toString(36).substring(2, 9),
                          fishId: selectedFish.id,
                          date: new Date().toISOString()
                        });
                        localStorage.setItem('deceasedRecords', JSON.stringify(records));
                        alert(`已记录 ${selectedFish.name} 为逝去的鱼`);
                      }}
                    >
                      <Skull className="w-4 h-4 mr-1" /> 记录死亡
                    </Button>
                    {ownedFishIds.has(selectedFish.id) ? (
                      <div className="h-9 text-xs flex items-center justify-center gap-1 text-accent font-bold bg-accent-light/30 border border-accent/20 rounded-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        已在鱼缸中
                      </div>
                    ) : (
                      <Button 
                        className="h-9 text-xs rounded-sm bg-accent hover:bg-accent/90 text-white font-bold"
                        onClick={() => handleAddToTank(selectedFish)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        添加到我的鱼缸
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-sm md:text-[14px] leading-relaxed text-ink font-medium">
                  {selectedFish.description}
                </p>

                <div className="grid grid-cols-2 gap-3 text-[12px] border-t border-b border-border py-4 bg-bg/50 px-3 rounded-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">水温</span>
                    <span className="text-ink font-bold flex items-center gap-1.5">
                      {selectedFish.waterTemperature}
                      {getFishTemperatureTheme(selectedFish.waterTemperature).needsHeater && (
                        <span className="inline-flex items-center gap-1 rounded-sm border border-red-100 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-500" title="需要加热棒">
                          <Thermometer className="w-3 h-3" />
                          加热
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">酸碱度 (pH)</span>
                    <span className="text-ink font-bold">{selectedFish.phLevel}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">换水周期</span>
                    <span className="text-ink font-bold">约 {selectedFish.waterChangeCycle} 天</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">鱼缸尺寸</span>
                    <span className="text-ink font-bold">{selectedFish.tankSize}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">性情</span>
                    <span className="text-ink font-bold">{selectedFish.temperament === 'Peaceful' ? '温和' : selectedFish.temperament === 'Aggressive' ? '凶猛' : '领地意识强'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">体型</span>
                    <span className="text-ink font-bold">{selectedFish.size === 'Small' ? '小型' : selectedFish.size === 'Medium' ? '中型' : '大型'}</span>
                  </div>
                </div>

                {getFishTemperatureTheme(selectedFish.waterTemperature).needsHeater && (
                  <div className="rounded-sm border border-red-100 bg-red-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-100 bg-white text-red-500">
                        <Thermometer className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[12px] font-black text-red-600">这个物种建议配加热棒</h4>
                        <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/70">
                          {selectedFish.name} 适宜水温为 {selectedFish.waterTemperature}，建议使用加热棒和温度计维持稳定水温。
                        </p>
                        <p className="mt-1 text-[10px] font-medium text-ink/45">不要用天气温度直接判断鱼缸水温，缸内温度计更可靠。</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border border-amber-200 bg-amber-50/60 p-4 rounded-sm">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h4 className="text-[11px] uppercase tracking-[1px] text-amber-800 font-bold">饮食习惯</h4>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 text-amber-800 border border-amber-200">
                      {selectedFish.feedingProfile?.feedingType || '杂食性'}
                    </span>
                  </div>
                  <div className="grid gap-3 text-sm md:text-[14px] text-ink">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink/55 font-bold mb-1">推荐食物</div>
                      <p className="font-medium leading-relaxed">{selectedFish.feedingProfile?.recommendedFoods || selectedFish.diet}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-ink/55 font-bold mb-1">喂食频率</div>
                        <p className="font-medium leading-relaxed">{selectedFish.feedingProfile?.feedingFrequency || '每天1-2次'}</p>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-ink/55 font-bold mb-1">投喂量</div>
                        <p className="font-medium leading-relaxed">{selectedFish.feedingProfile?.portionRule || '2-3分钟内吃完，残饵及时清理'}</p>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink/55 font-bold mb-1">禁忌</div>
                      <p className="font-medium leading-relaxed">{selectedFish.feedingProfile?.avoidFoods || '过量投喂；变质饲料；长期残饵'}</p>
                    </div>
                    {selectedFish.feedingProfile?.specialNotes && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-ink/55 font-bold mb-1">特殊提醒</div>
                        <p className="font-medium leading-relaxed">{selectedFish.feedingProfile.specialNotes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`border p-4 rounded-sm ${getHousingBadgeClass(selectedFish.housingMode)}`}>
                  <h4 className="text-[11px] uppercase tracking-[1px] font-bold mb-1.5">混养建议</h4>
                  <div className="text-base font-serif font-bold italic mb-1">{selectedFish.housingMode || '适合混养'}</div>
                  <p className="text-sm md:text-[14px] leading-relaxed font-medium">
                    {selectedFish.housingReason || '性情相对温和，可与体型接近、水质需求相同的温和物种混养；仍需避免过密饲养和体型差异过大。'}
                  </p>
                </div>

              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
