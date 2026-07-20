import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookHeart, BookOpenCheck, ChevronRight, Heart, Medal, Skull } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCareFavorites, getSpeciesFavoriteIds, subscribeToFavorites } from '../services/favorites/favorites.service';
import { loadAppStateFromStorage, subscribeToAppState } from '../services/storage/local-app-state';
import type { CollectionCounts, CollectionModule } from '../modules/collection/collection.types';

const modules: Array<{
  id: CollectionModule;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  icon: typeof Heart;
  tone: string;
}> = [
  { id: 'wishlist', title: '种草图鉴', titleEn: 'Wishlist', description: '集中查看想进一步了解的生物。', descriptionEn: 'Saved species to explore further.', icon: Heart, tone: 'bg-rose-50 text-rose-600' },
  { id: 'care', title: '养护收藏', titleEn: 'Care Saved', description: '出现问题时，快速找到收藏的处理步骤。', descriptionEn: 'Quick access to saved troubleshooting steps.', icon: BookOpenCheck, tone: 'bg-sky-50 text-sky-700' },
  { id: 'memorial', title: '生命纪念', titleEn: 'Memorials', description: '保留离缸日期与养护复盘。', descriptionEn: 'Preserve dates and care reflections.', icon: Skull, tone: 'bg-slate-100 text-slate-600' },
  { id: 'achievements', title: '成就勋章', titleEn: 'Achievements', description: '查看自动解锁的守护记录与下一步。', descriptionEn: 'View unlocked records and next milestones.', icon: Medal, tone: 'bg-amber-50 text-amber-700' },
];

const getImmediateCounts = (): CollectionCounts => {
  const state = loadAppStateFromStorage();
  return {
    wishlist: getSpeciesFavoriteIds().length,
    care: Object.keys(getCareFavorites()).length,
    memorial: Array.isArray(state.deceasedRecords) ? state.deceasedRecords.length : 0,
    achievements: 0,
  };
};

export default function CollectionHub() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const navigate = useNavigate();
  const [counts, setCounts] = useState<CollectionCounts>(() => getImmediateCounts());
  const [achievementCountReady, setAchievementCountReady] = useState(false);

  useEffect(() => {
    let active = true;
    let idleId: number | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    const refreshImmediate = () => setCounts(current => ({ ...current, ...getImmediateCounts(), achievements: current.achievements }));
    const refreshAchievements = async () => {
      try {
        const { getCollectionSnapshot } = await import('../services/collection/collection.service');
        if (!active) return;
        setCounts(getCollectionSnapshot().counts);
        setAchievementCountReady(true);
      } catch {
        if (active) setAchievementCountReady(false);
      }
    };

    const scheduleAchievements = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(() => void refreshAchievements(), { timeout: 1200 });
      } else {
        fallbackTimer = setTimeout(() => void refreshAchievements(), 200);
      }
    };

    const unsubscribeFavorites = subscribeToFavorites(() => {
      refreshImmediate();
      void refreshAchievements();
    });
    const unsubscribeAppState = subscribeToAppState(() => {
      refreshImmediate();
      void refreshAchievements();
    });
    scheduleAchievements();

    return () => {
      active = false;
      unsubscribeFavorites();
      unsubscribeAppState();
      if (idleId !== undefined) {
        if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
      }
      if (fallbackTimer !== undefined) clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <div className="page-frame mx-auto flex w-full min-w-0 max-w-[1180px] flex-col gap-4">
      <header className="overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,#ffffff_0%,#edf7f1_58%,#dfeee8_100%)] p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black text-emerald-800 shadow-sm">
              <BookHeart className="h-3.5 w-3.5" /> {isEn ? 'Aqua Collection' : '自然水族册'}
            </div>
            <h1 className="text-[24px] font-black tracking-tight text-ink">{isEn ? 'My Collection' : '我的水族册'}</h1>
            <p className="mt-1 text-[12px] font-bold text-ink/48">{isEn ? 'Wishlist · Care · Memorials · Badges' : '种草 · 养护 · 纪念 · 勋章'}</p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-emerald-800 text-white shadow-[0_14px_30px_rgba(6,78,59,0.2)]">
            <BookHeart className="h-6 w-6" />
          </div>
        </div>
      </header>

      <section className="grid gap-3 min-[720px]:grid-cols-2" aria-label="水族册模块">
        {modules.map(item => {
          const Icon = item.icon;
          const count = counts[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/collection/${item.id}`)}
              className="group flex min-h-[180px] w-full items-start gap-4 rounded-[26px] border border-white/85 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] ${item.tone}`}>
                <Icon className="h-6 w-6" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col self-stretch">
                <span className="flex items-start justify-between gap-3">
                  <span className="text-[18px] font-black text-ink">{isEn ? item.titleEn : item.title}</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-ink/25 transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="mt-2 text-[12px] font-bold leading-5 text-ink/48">{isEn ? item.descriptionEn : item.description}</span>
                <span className="mt-auto pt-5 text-[28px] font-black text-emerald-800">
                  {item.id === 'achievements' && !achievementCountReady ? <span className="inline-block h-7 w-12 animate-pulse rounded-lg bg-emerald-100" aria-label="正在计算勋章数量" /> : count}
                </span>
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
}
