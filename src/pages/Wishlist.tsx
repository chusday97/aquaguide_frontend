import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Heart, HeartOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SpeciesDetailDialog } from '../components/SpeciesDetailDialog';
import { useToast } from '../components/common/ToastProvider';
import { useWorkspaceNavigation } from '../components/layout/WorkspaceNavigationProvider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fishData } from '../data/fishData';
import { getSpeciesDisplayImage, getSpeciesImageClass, getSpeciesImageSurfaceClass } from '../lib/speciesVisual';
import { getSpeciesFavoriteIds, setSpeciesFavoriteIds, subscribeToFavorites } from '../services/favorites/favorites.service';
import { loadAppStateFromStorage } from '../services/storage/local-app-state';
import { setCompatibilitySelection } from '../services/compatibility/compatibility-selection.service';
import { trackSessionEvent } from '../services/analytics/session-events.service';
import type { Aquarium, Fish } from '../types';
import type { WorkspaceNavigationContext } from '../types/navigation';

export default function Wishlist() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { captureContext, restoreContext } = useWorkspaceNavigation();
  const [favoriteIds, setFavoriteIds] = useState(() => new Set(getSpeciesFavoriteIds()));
  const [selectedFish, setSelectedFish] = useState<Fish | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<Fish | null>(null);
  const returnContextRef = useRef<WorkspaceNavigationContext | null>(null);
  const appState = useMemo(() => loadAppStateFromStorage(), []);
  const aquariums = appState.aquariums;
  const currentAquarium = useMemo<Aquarium | null>(() => (
    aquariums.find(item => item.id === appState.currentAquariumId) || aquariums[0] || null
  ), [appState.currentAquariumId, aquariums]);
  const ownedIds = useMemo(() => new Set(aquariums.flatMap(item => item.fishes.map(fish => fish.fishId))), [aquariums]);
  const favorites = useMemo(() => (
    Array.from(favoriteIds)
      .map(id => fishData.find(fish => fish.id === id))
      .filter((fish): fish is Fish => Boolean(fish))
  ), [favoriteIds]);

  useEffect(() => subscribeToFavorites(() => setFavoriteIds(new Set(getSpeciesFavoriteIds()))), []);
  useEffect(() => {
    trackSessionEvent('favorite_page_view', { action: 'view', status: 'species', entry: 'wishlist' });
  }, []);

  const removeFavorite = (fishId: string) => {
    const next = new Set(favoriteIds);
    next.delete(fishId);
    setFavoriteIds(next);
    setSpeciesFavoriteIds(next);
    setPendingRemoval(null);
    showToast('已从种草图鉴移除');
  };

  const openDetail = (fish: Fish, sourceId: string) => {
    returnContextRef.current = captureContext(sourceId);
    setSelectedFish(fish);
  };

  const closeDetail = () => {
    setSelectedFish(null);
    const context = returnContextRef.current;
    returnContextRef.current = null;
    if (context) void restoreContext(context);
  };

  const continueToCompatibility = (fish: Fish) => {
    setCompatibilitySelection([fish.id]);
    navigate('/encyclopedia#compatibility');
  };

  return (
    <div className="page-frame mx-auto flex w-full min-w-0 max-w-[1120px] flex-col gap-4 pb-24">
      <header className="rounded-[22px] border border-white/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-rose-50 text-rose-500"><Heart className="h-5 w-5 fill-current" /></span>
          <div>
            <h1 className="text-[21px] font-black text-ink">种草图鉴</h1>
            <p className="mt-0.5 text-[12px] font-bold text-ink/45">已收藏 {favorites.length} 种生物</p>
          </div>
        </div>
      </header>

      {favorites.length > 0 ? (
        <section className="desktop-card-grid grid grid-cols-2 gap-3 md:grid-cols-3">
          {favorites.map(fish => (
            <article key={fish.id} id={`wishlist-card-${fish.id}`} className="flex min-w-0 flex-col rounded-[18px] border border-white/80 bg-white p-3 shadow-sm">
              <button type="button" onClick={() => openDetail(fish, `wishlist-card-${fish.id}`)} className="text-left">
                <span className={`flex aspect-square w-full items-center justify-center overflow-hidden rounded-[16px] bg-bg ${getSpeciesImageSurfaceClass(fish)}`}>
                  <img src={getSpeciesDisplayImage(fish)} alt={fish.name} className={`max-h-[86%] max-w-[86%] object-contain ${getSpeciesImageClass(fish)}`} loading="lazy" decoding="async" />
                </span>
                <span className="mt-3 flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-black text-ink">{fish.name}</span>
                    <span className="mt-1 block truncate text-[11px] font-bold text-ink/42">{fish.category} · {fish.difficulty === 'Easy' ? '新手适宜' : fish.difficulty === 'Medium' ? '进阶' : '高难度'}</span>
                  </span>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink/28" />
                </span>
              </button>
              <button type="button" onClick={() => setPendingRemoval(fish)} className="mt-3 inline-flex h-10 items-center justify-center rounded-full border border-rose-100 bg-rose-50 text-[12px] font-black text-rose-600">
                <HeartOff className="mr-1.5 h-4 w-4" />删除收藏
              </button>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-[22px] border border-dashed border-emerald-200 bg-white p-10 text-center">
          <Heart className="mx-auto h-8 w-8 text-ink/20" />
          <h2 className="mt-3 text-[16px] font-black text-ink">还没有种草生物</h2>
          <p className="mt-1 text-[12px] font-bold text-ink/45">在图鉴中点“加入种草”后，会显示在这里。</p>
        </section>
      )}

      <SpeciesDetailDialog
        fish={selectedFish}
        open={Boolean(selectedFish)}
        source="atlas"
        aquariumContext={currentAquarium}
        imageSrc={selectedFish ? getSpeciesDisplayImage(selectedFish) : ''}
        owned={Boolean(selectedFish && ownedIds.has(selectedFish.id))}
        inCalculator={false}
        inWishlist={Boolean(selectedFish && favoriteIds.has(selectedFish.id))}
        onOpenChange={(open) => !open && closeDetail()}
        onAddToCalculator={continueToCompatibility}
        onToggleWishlist={(fishId) => {
          const fish = fishData.find(item => item.id === fishId);
          if (fish) setPendingRemoval(fish);
        }}
        onGoCalculator={() => selectedFish && continueToCompatibility(selectedFish)}
      />

      <Dialog open={Boolean(pendingRemoval)} onOpenChange={(open) => !open && setPendingRemoval(null)}>
        <DialogContent className="w-[92vw] max-w-[420px] rounded-[22px]">
          <DialogHeader>
            <DialogTitle>删除这条种草收藏？</DialogTitle>
            <DialogDescription>“{pendingRemoval?.name}”会从种草图鉴移除，之后仍可在图鉴重新收藏。</DialogDescription>
          </DialogHeader>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setPendingRemoval(null)}>取消</Button>
            <Button variant="destructive" onClick={() => pendingRemoval && removeFavorite(pendingRemoval.id)}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
