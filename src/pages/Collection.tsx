import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookHeart,
  BookOpenCheck,
  Check,
  ChevronRight,
  Droplets,
  Heart,
  HeartOff,
  Medal,
  ShieldCheck,
  Skull,
  Sparkles,
  Waves,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AdaptiveDetailContent } from '../components/common/AdaptiveDetailContent';
import type { PreviewImage } from '../components/common/ImagePreviewModal';
import { SpeciesDetailDialog } from '../components/SpeciesDetailDialog';
import { useToast } from '../components/common/ToastProvider';
import { useWorkspaceNavigation } from '../components/layout/WorkspaceNavigationProvider';
import { careTopicsData, type CareTopic } from '../data/careTopicsData';
import { fishData } from '../data/fishData';
import { getSpeciesDisplayImage, getSpeciesImageClass, getSpeciesImageSurfaceClass } from '../lib/speciesVisual';
import type { AchievementId, CollectionTab, MemorialItem } from '../modules/collection/collection.types';
import { getCollectionSnapshot, subscribeToCollection } from '../services/collection/collection.service';
import { setCompatibilitySelection } from '../services/compatibility/compatibility-selection.service';
import { getCareFavorites, getSpeciesFavoriteIds, setSpeciesFavoriteIds, toggleCareFavorite } from '../services/favorites/favorites.service';
import { trackSessionEvent } from '../services/analytics/session-events.service';
import type { Aquarium, Fish } from '../types';
import type { WorkspaceNavigationContext } from '../types/navigation';
import { CareArticleDetail } from './CareEncyclopedia';

const ImagePreviewModal = lazy(() => import('../components/common/ImagePreviewModal').then(module => ({ default: module.ImagePreviewModal })));
const PAGE_SIZE = 20;

const tabConfig: Array<{ id: CollectionTab; label: string; shortLabel: string; icon: typeof Heart }> = [
  { id: 'wishlist', label: '种草图鉴', shortLabel: '种草', icon: Heart },
  { id: 'care', label: '养护收藏', shortLabel: '养护', icon: BookOpenCheck },
  { id: 'memorial', label: '生命纪念', shortLabel: '纪念', icon: Skull },
  { id: 'achievements', label: '成就勋章', shortLabel: '勋章', icon: Medal },
];

const achievementIcons: Record<AchievementId, typeof Medal> = {
  first_aquarium: Waves,
  first_daily_check: Sparkles,
  seven_day_guardian: ShieldCheck,
  water_change_routine: Droplets,
  wishlist_collector: Heart,
  care_learner: BookHeart,
  compatible_community: ShieldCheck,
  life_reflection: Medal,
};

const normalizeTab = (value: string | null): CollectionTab => (
  tabConfig.some(item => item.id === value) ? value as CollectionTab : 'wishlist'
);

const formatMemorialDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('zh-CN');
};

export default function Collection() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { captureContext, restoreContext } = useWorkspaceNavigation();
  const activeTab = normalizeTab(searchParams.get('tab'));
  const [snapshot, setSnapshot] = useState(() => getCollectionSnapshot());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedFish, setSelectedFish] = useState<Fish | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<CareTopic | null>(null);
  const [selectedMemorial, setSelectedMemorial] = useState<MemorialItem | null>(null);
  const [pendingFishRemoval, setPendingFishRemoval] = useState<Fish | null>(null);
  const [pendingCareRemoval, setPendingCareRemoval] = useState<CareTopic | null>(null);
  const [checkedActions, setCheckedActions] = useState<string[]>([]);
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const returnContextRef = useRef<WorkspaceNavigationContext | null>(null);
  const previousUnlockedRef = useRef(new Set(snapshot.achievements.filter(item => item.unlocked).map(item => item.id)));
  const detailScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeToCollection(() => {
    const next = getCollectionSnapshot();
    const newlyUnlocked = next.achievements.find(item => item.unlocked && !previousUnlockedRef.current.has(item.id));
    previousUnlockedRef.current = new Set(next.achievements.filter(item => item.unlocked).map(item => item.id));
    setSnapshot(next);
    if (newlyUnlocked) showToast(`解锁勋章：${newlyUnlocked.title}`);
  }), [showToast]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    trackSessionEvent('favorite_page_view', { action: 'view', status: activeTab, entry: 'collection' });
  }, [activeTab]);

  const wishlistFishes = useMemo(() => snapshot.wishlistIds
    .map(id => fishData.find(item => item.id === id))
    .filter((item): item is Fish => Boolean(item)), [snapshot.wishlistIds]);
  const careTopics = useMemo(() => Object.keys(snapshot.careFavorites)
    .map(id => careTopicsData.find(item => item.id === id))
    .filter((item): item is CareTopic => Boolean(item)), [snapshot.careFavorites]);
  const currentAquarium = useMemo<Aquarium | null>(() => (
    snapshot.appState.aquariums.find(item => item.id === snapshot.appState.currentAquariumId)
    || snapshot.appState.aquariums[0]
    || null
  ), [snapshot.appState]);
  const ownedIds = useMemo(() => new Set(snapshot.appState.aquariums.flatMap(item => item.fishes.map(record => record.fishId))), [snapshot.appState.aquariums]);

  const switchTab = (tab: CollectionTab) => setSearchParams({ tab });
  const openFromCard = (sourceId: string) => {
    returnContextRef.current = captureContext(sourceId);
  };
  const restoreCard = () => {
    const context = returnContextRef.current;
    returnContextRef.current = null;
    if (context) void restoreContext(context);
  };

  const removeFishFavorite = () => {
    if (!pendingFishRemoval) return;
    setSpeciesFavoriteIds(snapshot.wishlistIds.filter(id => id !== pendingFishRemoval.id));
    if (getSpeciesFavoriteIds().includes(pendingFishRemoval.id)) {
      showToast('移除失败，请检查浏览器存储权限', 'error');
      return;
    }
    setPendingFishRemoval(null);
    showToast('已从种草图鉴移除');
  };

  const removeCareFavorite = () => {
    if (!pendingCareRemoval) return;
    toggleCareFavorite({ id: pendingCareRemoval.id, title: pendingCareRemoval.title, favoritedAt: new Date().toISOString() });
    if (getCareFavorites()[pendingCareRemoval.id]) {
      showToast('移除失败，请检查浏览器存储权限', 'error');
      return;
    }
    setPendingCareRemoval(null);
    showToast('已从养护收藏移除');
  };

  const openCarePreview = (topic: CareTopic) => {
    if (!topic.imageUrl) return;
    setPreviewImages([{ src: topic.imageUrl, title: topic.title }]);
    setPreviewOpen(true);
  };

  const shareCareTopic = async (topic: CareTopic) => {
    const text = `${topic.title}｜AquaGuide 养护百科`;
    try {
      if (navigator.share) await navigator.share({ title: topic.title, text });
      else await navigator.clipboard.writeText(text);
      showToast(navigator.share ? '已打开分享' : '已复制分享内容');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      showToast('分享失败，请稍后重试', 'error');
    }
  };

  const renderEmpty = (icon: typeof Heart, title: string, description: string, action: { label: string; route: string }) => {
    const Icon = icon;
    return (
      <section className="rounded-[24px] border border-dashed border-emerald-200 bg-white/80 px-5 py-12 text-center">
        <Icon className="mx-auto h-9 w-9 text-ink/20" />
        <h2 className="mt-3 text-[17px] font-black text-ink">{title}</h2>
        <p className="mx-auto mt-1 max-w-sm text-[12px] font-bold leading-5 text-ink/45">{description}</p>
        <button type="button" onClick={() => navigate(action.route)} className="mt-5 h-10 rounded-full bg-emerald-700 px-5 text-[12px] font-black text-white shadow-sm">
          {action.label}
        </button>
      </section>
    );
  };

  return (
    <div className="page-frame mx-auto flex w-full min-w-0 max-w-[1180px] flex-col gap-4 pb-24">
      <header className="overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,#ffffff_0%,#edf7f1_58%,#dfeee8_100%)] p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black text-emerald-800 shadow-sm">
              <BookHeart className="h-3.5 w-3.5" /> 自然水族册
            </div>
            <h1 className="text-[24px] font-black tracking-tight text-ink">我的水族册</h1>
            <p className="mt-1 text-[12px] font-bold text-ink/48">把想养的、学会的和认真守护过的，都放在这里。</p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-emerald-800 text-white shadow-[0_14px_30px_rgba(6,78,59,0.2)]">
            <BookHeart className="h-6 w-6" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2" aria-label="水族册数量摘要">
          {tabConfig.map(item => (
            <div key={item.id} className="rounded-[16px] bg-white/75 px-2 py-2.5 text-center shadow-sm">
              <div className="text-[16px] font-black text-ink">{snapshot.counts[item.id]}</div>
              <div className="mt-0.5 truncate text-[9px] font-black text-ink/38">{item.label}</div>
            </div>
          ))}
        </div>
      </header>

      <nav className="sticky top-0 z-20 grid grid-cols-4 gap-1 rounded-[18px] border border-white/80 bg-white/92 p-1.5 shadow-sm backdrop-blur" aria-label="水族册分类">
        {tabConfig.map(item => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => switchTab(item.id)}
              className={`flex min-w-0 items-center justify-center gap-1 rounded-[13px] px-1 py-2.5 text-[10px] font-black transition-colors duration-200 ${active ? 'bg-emerald-700 text-white shadow-sm' : 'text-ink/48 hover:bg-emerald-50 hover:text-emerald-800'}`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {activeTab === 'wishlist' && (wishlistFishes.length ? (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {wishlistFishes.slice(0, visibleCount).map(fish => (
            <article key={fish.id} id={`collection-wishlist-${fish.id}`} className="flex min-w-0 flex-col rounded-[20px] border border-white/80 bg-white p-3 shadow-sm">
              <button type="button" onClick={() => { openFromCard(`collection-wishlist-${fish.id}`); setSelectedFish(fish); }} className="group text-left">
                <span className={`flex aspect-square w-full items-center justify-center overflow-hidden rounded-[16px] bg-bg ${getSpeciesImageSurfaceClass(fish)}`}>
                  <img src={getSpeciesDisplayImage(fish)} alt={fish.name} className={`max-h-[86%] max-w-[86%] object-contain transition-transform duration-200 group-hover:scale-[1.03] ${getSpeciesImageClass(fish)}`} loading="lazy" decoding="async" />
                </span>
                <span className="mt-3 flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-black text-ink">{fish.name}</span>
                    <span className="mt-1 block truncate text-[10px] font-bold text-ink/42">{fish.category} · {fish.difficulty === 'Easy' ? '新手适宜' : fish.difficulty === 'Medium' ? '进阶' : '高难度'}</span>
                  </span>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink/25" />
                </span>
              </button>
              <button type="button" onClick={() => setPendingFishRemoval(fish)} className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-rose-100 bg-rose-50 text-[11px] font-black text-rose-600">
                <HeartOff className="mr-1.5 h-3.5 w-3.5" />移除种草
              </button>
            </article>
          ))}
        </section>
      ) : renderEmpty(Heart, '还没有种草生物', '在图鉴中收藏想进一步了解的生物，它会出现在这里。', { label: '浏览图鉴', route: '/encyclopedia' }))}

      {activeTab === 'care' && (careTopics.length ? (
        <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {careTopics.slice(0, visibleCount).map(topic => (
            <article key={topic.id} id={`collection-care-${topic.id}`} className="flex min-w-0 flex-col rounded-[20px] border border-white/80 bg-white p-3 shadow-sm">
              <button type="button" onClick={() => { openFromCard(`collection-care-${topic.id}`); setSelectedTopic(topic); }} className="grid grid-cols-[86px_minmax(0,1fr)] gap-3 text-left">
                <img src={topic.imageUrl} alt="" className="h-[86px] w-[86px] rounded-[15px] bg-bg object-cover" loading="lazy" decoding="async" />
                <span className="min-w-0">
                  <span className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2 text-[14px] font-black leading-tight text-ink">{topic.title}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink/25" />
                  </span>
                  <span className="mt-2 line-clamp-2 text-[11px] font-medium leading-5 text-ink/48">{topic.summary}</span>
                </span>
              </button>
              <button type="button" onClick={() => setPendingCareRemoval(topic)} className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-rose-100 bg-rose-50 text-[11px] font-black text-rose-600">
                <HeartOff className="mr-1.5 h-3.5 w-3.5" />移除收藏
              </button>
            </article>
          ))}
        </section>
      ) : renderEmpty(BookOpenCheck, '还没有养护收藏', '把常用的处理步骤收藏起来，出现问题时可以更快找到。', { label: '查养护百科', route: '/care' }))}

      {activeTab === 'memorial' && (snapshot.memorials.length ? (
        <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {snapshot.memorials.slice(0, visibleCount).map(record => {
            const fish = fishData.find(item => item.id === record.fishId);
            return (
              <button
                key={record.id}
                id={`collection-memorial-${record.id}`}
                type="button"
                onClick={() => { openFromCard(`collection-memorial-${record.id}`); setSelectedMemorial(record); }}
                className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 rounded-[20px] border border-white/80 bg-white p-3 text-left shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
              >
                <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-100 grayscale">
                  {fish ? <img src={getSpeciesDisplayImage(fish)} alt={fish.name} className={`h-[84%] w-[84%] object-contain opacity-75 ${getSpeciesImageClass(fish)}`} loading="lazy" /> : <Skull className="h-5 w-5 text-ink/30" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-black text-ink">{fish?.name || '未匹配生物'}</span>
                  <span className="mt-1 block text-[11px] font-bold text-ink/42">{formatMemorialDate(record.date)}</span>
                  <span className="mt-1 block truncate text-[10px] font-medium text-ink/38">{record.reason || '尚未填写复盘原因'}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-ink/25" />
              </button>
            );
          })}
        </section>
      ) : renderEmpty(Skull, '还没有生命纪念', '在物种详情中记录离缸或死亡后，这里会保留时间与复盘信息。', { label: '返回我的鱼缸', route: '/aquarium' }))}

      {activeTab === 'achievements' && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {snapshot.achievements.map(achievement => {
            const Icon = achievementIcons[achievement.id];
            const progress = Math.round((achievement.current / achievement.target) * 100);
            return (
              <article key={achievement.id} className={`flex min-h-[210px] flex-col rounded-[22px] border p-4 shadow-sm ${achievement.unlocked ? 'border-amber-200 bg-[linear-gradient(145deg,#fffdf5,#f6f1dc)]' : 'border-white/80 bg-white'}`}>
                <div className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${achievement.unlocked ? 'bg-amber-400 text-amber-950 shadow-[0_10px_24px_rgba(217,160,45,0.25)]' : 'bg-slate-100 text-ink/28'}`}>
                  {achievement.unlocked ? <Check className="absolute h-3 w-3 translate-x-4 -translate-y-4 rounded-full bg-emerald-600 p-0.5 text-white" /> : null}
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-3 text-[15px] font-black text-ink">{achievement.title}</h2>
                <p className="mt-1 min-h-[36px] text-[10px] font-bold leading-[18px] text-ink/44">{achievement.description}</p>
                <div className="mt-auto pt-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink/8"><div className={`h-full rounded-full ${achievement.unlocked ? 'bg-amber-400' : 'bg-emerald-600'}`} style={{ width: `${progress}%` }} /></div>
                  <div className="mt-1.5 text-[9px] font-black text-ink/38">{achievement.unlocked ? '已解锁' : `${achievement.current} / ${achievement.target}`}</div>
                  {achievement.nextAction && (
                    <button type="button" onClick={() => navigate(achievement.nextAction!.route)} className="mt-2 h-8 w-full rounded-full bg-emerald-50 text-[10px] font-black text-emerald-800">
                      {achievement.nextAction.label}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {((activeTab === 'wishlist' && wishlistFishes.length > visibleCount)
        || (activeTab === 'care' && careTopics.length > visibleCount)
        || (activeTab === 'memorial' && snapshot.memorials.length > visibleCount)) && (
        <button type="button" onClick={() => setVisibleCount(count => count + PAGE_SIZE)} className="mx-auto h-10 rounded-full border border-emerald-100 bg-white px-5 text-[11px] font-black text-emerald-800 shadow-sm">
          加载更多
        </button>
      )}

      <SpeciesDetailDialog
        fish={selectedFish}
        open={Boolean(selectedFish)}
        source="atlas"
        aquariumContext={currentAquarium}
        imageSrc={selectedFish ? getSpeciesDisplayImage(selectedFish) : ''}
        owned={Boolean(selectedFish && ownedIds.has(selectedFish.id))}
        inCalculator={false}
        inWishlist={Boolean(selectedFish && snapshot.wishlistIds.includes(selectedFish.id))}
        onOpenChange={(open) => { if (!open) { setSelectedFish(null); restoreCard(); } }}
        onAddToCalculator={(fish) => { setCompatibilitySelection([fish.id]); navigate('/encyclopedia#compatibility'); }}
        onToggleWishlist={(fishId) => {
          const fish = fishData.find(item => item.id === fishId);
          if (fish) setPendingFishRemoval(fish);
        }}
        onGoCalculator={() => {
          if (!selectedFish) return;
          setCompatibilitySelection([selectedFish.id]);
          navigate('/encyclopedia#compatibility');
        }}
      />

      <Dialog open={Boolean(selectedTopic)} onOpenChange={(open) => { if (!open) { setSelectedTopic(null); restoreCard(); } }}>
        <AdaptiveDetailContent>
          {selectedTopic && (
            <CareArticleDetail
              key={selectedTopic.id}
              topic={selectedTopic}
              scrollRef={detailScrollRef}
              checkedActions={checkedActions}
              favorite={Boolean(snapshot.careFavorites[selectedTopic.id])}
              onToggleAction={(value) => setCheckedActions(items => items.includes(value) ? items.filter(item => item !== value) : [...items, value])}
              onToggleFavorite={() => setPendingCareRemoval(selectedTopic)}
              onOpenShare={() => void shareCareTopic(selectedTopic)}
              onPreview={() => openCarePreview(selectedTopic)}
              onSelectRelated={(topic) => setSelectedTopic(topic)}
              activeAquarium={currentAquarium}
            />
          )}
        </AdaptiveDetailContent>
      </Dialog>

      <Dialog open={Boolean(selectedMemorial)} onOpenChange={(open) => { if (!open) { setSelectedMemorial(null); restoreCard(); } }}>
        <AdaptiveDetailContent className="flex flex-col">
          {selectedMemorial && (() => {
            const fish = fishData.find(item => item.id === selectedMemorial.fishId);
            return (
              <div className="app-scrollbar-hidden flex-1 overflow-y-auto p-5 pt-16 md:p-8 md:pt-16">
                <div className="mx-auto max-w-[520px]">
                  <div className="flex h-36 items-center justify-center rounded-[24px] bg-slate-100 grayscale">
                    {fish ? <img src={getSpeciesDisplayImage(fish)} alt={fish.name} className={`h-[80%] w-[80%] object-contain opacity-75 ${getSpeciesImageClass(fish)}`} /> : <Skull className="h-10 w-10 text-ink/25" />}
                  </div>
                  <DialogHeader className="mt-5 text-left">
                    <DialogTitle className="text-[22px] font-black">{fish?.name || '生命纪念'}</DialogTitle>
                    <DialogDescription>{formatMemorialDate(selectedMemorial.date)}</DialogDescription>
                  </DialogHeader>
                  <section className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] font-black text-ink/40">复盘记录</div>
                    <p className="mt-2 text-[14px] font-bold leading-6 text-ink/68">{selectedMemorial.reason || '这条记录还没有填写原因。后续新增生命纪念时，可以补充观察到的情况，帮助回顾养护过程。'}</p>
                  </section>
                </div>
              </div>
            );
          })()}
        </AdaptiveDetailContent>
      </Dialog>

      <Dialog open={Boolean(pendingFishRemoval)} onOpenChange={(open) => !open && setPendingFishRemoval(null)}>
        <DialogContent className="w-[92vw] max-w-[420px] rounded-[22px]">
          <DialogHeader><DialogTitle>移除这条种草？</DialogTitle><DialogDescription>“{pendingFishRemoval?.name}”会从水族册移除，之后仍可在图鉴重新收藏。</DialogDescription></DialogHeader>
          <DialogFooter className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setPendingFishRemoval(null)}>取消</Button><Button variant="destructive" onClick={removeFishFavorite}>确认移除</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingCareRemoval)} onOpenChange={(open) => !open && setPendingCareRemoval(null)}>
        <DialogContent className="w-[92vw] max-w-[420px] rounded-[22px]">
          <DialogHeader><DialogTitle>移除这篇收藏？</DialogTitle><DialogDescription>“{pendingCareRemoval?.title}”会从水族册移除，之后仍可重新收藏。</DialogDescription></DialogHeader>
          <DialogFooter className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setPendingCareRemoval(null)}>取消</Button><Button variant="destructive" onClick={removeCareFavorite}>确认移除</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Suspense fallback={null}>
        <ImagePreviewModal images={previewImages} index={0} open={previewOpen} onClose={() => setPreviewOpen(false)} onIndexChange={() => undefined} />
      </Suspense>
    </div>
  );
}
