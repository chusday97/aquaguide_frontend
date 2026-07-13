import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Heart, HeartOff } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { PreviewImage } from '../components/common/ImagePreviewModal';
import { useToast } from '../components/common/ToastProvider';
import { useWorkspaceNavigation } from '../components/layout/WorkspaceNavigationProvider';
import { careTopicsData, type CareTopic } from '../data/careTopicsData';
import { getCareFavorites, subscribeToFavorites, toggleCareFavorite, type CareFavoriteMap } from '../services/favorites/favorites.service';
import { loadAppStateFromStorage } from '../services/storage/local-app-state';
import type { Aquarium } from '../types';
import type { WorkspaceNavigationContext } from '../types/navigation';
import { CareArticleDetail } from './CareEncyclopedia';
import { trackSessionEvent } from '../services/analytics/session-events.service';

const ImagePreviewModal = lazy(() => import('../components/common/ImagePreviewModal').then(module => ({ default: module.ImagePreviewModal })));

export default function CareFavorites() {
  const { captureContext, restoreContext } = useWorkspaceNavigation();
  const { showToast } = useToast();
  const [favorites, setFavorites] = useState<CareFavoriteMap>(() => getCareFavorites());
  const [selectedTopic, setSelectedTopic] = useState<CareTopic | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<CareTopic | null>(null);
  const [checkedActions, setCheckedActions] = useState<string[]>([]);
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const detailScrollRef = useRef<HTMLDivElement>(null);
  const returnContextRef = useRef<WorkspaceNavigationContext | null>(null);
  const appState = useMemo(() => loadAppStateFromStorage(), []);
  const activeAquarium = useMemo<Aquarium | null>(() => (
    appState.aquariums.find(item => item.id === appState.currentAquariumId) || appState.aquariums[0] || null
  ), [appState.aquariums, appState.currentAquariumId]);
  const favoriteTopics = useMemo(() => (
    Object.keys(favorites)
      .map(id => careTopicsData.find(topic => topic.id === id))
      .filter((topic): topic is CareTopic => Boolean(topic))
  ), [favorites]);

  useEffect(() => subscribeToFavorites(() => setFavorites(getCareFavorites())), []);
  useEffect(() => {
    trackSessionEvent('favorite_page_view', { action: 'view', status: 'care', entry: 'care-favorites' });
  }, []);

  const toggleFavorite = (topic: CareTopic) => {
    const wasFavorite = Boolean(favorites[topic.id]);
    toggleCareFavorite({ id: topic.id, title: topic.title, favoritedAt: new Date().toISOString() });
    setFavorites(getCareFavorites());
    setPendingRemoval(null);
    showToast(wasFavorite ? '已从养护收藏移除' : '已加入养护收藏');
  };

  const openDetail = (topic: CareTopic, sourceId?: string, capture = true) => {
    if (capture) returnContextRef.current = captureContext(sourceId);
    setSelectedTopic(topic);
  };

  const closeDetail = () => {
    setSelectedTopic(null);
    const context = returnContextRef.current;
    returnContextRef.current = null;
    if (context) void restoreContext(context);
  };

  const openPreview = (topic: CareTopic) => {
    if (!topic.imageUrl) return;
    setPreviewImages([{ src: topic.imageUrl, title: topic.title }]);
    setPreviewOpen(true);
  };

  return (
    <div className="page-frame mx-auto flex w-full min-w-0 max-w-[1120px] flex-col gap-4 pb-24">
      <header className="rounded-[22px] border border-white/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-rose-50 text-rose-500"><Heart className="h-5 w-5 fill-current" /></span>
          <div>
            <h1 className="text-[21px] font-black text-ink">养护收藏</h1>
            <p className="mt-0.5 text-[12px] font-bold text-ink/45">已收藏 {favoriteTopics.length} 篇内容</p>
          </div>
        </div>
      </header>

      {favoriteTopics.length > 0 ? (
        <section className="grid gap-3 md:grid-cols-2">
          {favoriteTopics.map(topic => (
            <article key={topic.id} id={`care-favorite-${topic.id}`} className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 rounded-[18px] border border-white/80 bg-white p-3 shadow-sm">
              <button type="button" onClick={() => openDetail(topic, `care-favorite-${topic.id}`)} className="contents text-left">
                <img src={topic.imageUrl} alt="" className="h-[88px] w-[88px] rounded-[15px] bg-bg object-cover" loading="lazy" decoding="async" />
                <span className="min-w-0">
                  <span className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2 text-[15px] font-black leading-tight text-ink">{topic.title}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink/28" />
                  </span>
                  <span className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-ink/48">{topic.summary}</span>
                </span>
              </button>
              <button type="button" onClick={() => setPendingRemoval(topic)} className="col-span-2 inline-flex h-10 items-center justify-center rounded-full border border-rose-100 bg-rose-50 text-[12px] font-black text-rose-600">
                <HeartOff className="mr-1.5 h-4 w-4" />删除收藏
              </button>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-[22px] border border-dashed border-emerald-200 bg-white p-10 text-center">
          <Heart className="mx-auto h-8 w-8 text-ink/20" />
          <h2 className="mt-3 text-[16px] font-black text-ink">还没有收藏养护内容</h2>
          <p className="mt-1 text-[12px] font-bold text-ink/45">在养护百科中收藏的内容会显示在这里。</p>
        </section>
      )}

      <Dialog open={Boolean(selectedTopic)} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="modalCardWide w-[92vw] max-w-[560px] overflow-hidden rounded-[24px] border-border p-0 md:max-w-[900px]">
          {selectedTopic && (
            <CareArticleDetail
              key={selectedTopic.id}
              topic={selectedTopic}
              scrollRef={detailScrollRef}
              checkedActions={checkedActions}
              favorite={Boolean(favorites[selectedTopic.id])}
              onToggleAction={(value) => setCheckedActions(prev => prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value])}
              onToggleFavorite={() => favorites[selectedTopic.id] ? setPendingRemoval(selectedTopic) : toggleFavorite(selectedTopic)}
              onOpenShare={() => undefined}
              onPreview={() => openPreview(selectedTopic)}
              onSelectRelated={(topic) => openDetail(topic, undefined, false)}
              activeAquarium={activeAquarium}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingRemoval)} onOpenChange={(open) => !open && setPendingRemoval(null)}>
        <DialogContent className="w-[92vw] max-w-[420px] rounded-[22px]">
          <DialogHeader>
            <DialogTitle>删除这篇养护收藏？</DialogTitle>
            <DialogDescription>“{pendingRemoval?.title}”会从养护收藏移除，之后仍可在养护百科重新收藏。</DialogDescription>
          </DialogHeader>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setPendingRemoval(null)}>取消</Button>
            <Button variant="destructive" onClick={() => pendingRemoval && toggleFavorite(pendingRemoval)}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Suspense fallback={null}>
        <ImagePreviewModal images={previewImages} index={0} open={previewOpen} onClose={() => setPreviewOpen(false)} onIndexChange={() => undefined} />
      </Suspense>
    </div>
  );
}
