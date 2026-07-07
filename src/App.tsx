/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, lazy, Suspense, useEffect, useMemo, useState, type CSSProperties, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Activity,
  BookOpen,
  ChevronLeft,
  Database,
  Droplets,
  Heart,
  Library,
} from 'lucide-react';
import { ToastProvider } from './components/common/ToastProvider';
import { loadAppStateFromStorage } from './services/storage/local-app-state';

const AquariumManager = lazy(() => import('./pages/Aquarium'));
const Encyclopedia = lazy(() => import('./pages/Encyclopedia'));
const CareEncyclopedia = lazy(() => import('./pages/CareEncyclopedia'));
const ProjectStructurePreview = lazy(() => import('./pages/ProjectStructurePreview'));
const Login = lazy(() => import('./pages/Login'));

const createWatermarkedImageSrc = (image: HTMLImageElement) => {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const fontSize = Math.max(18, Math.round(Math.min(width, height) * 0.14));
  context.save();
  context.translate(width / 2, height / 2);
  context.rotate(-Math.PI / 10);
  context.font = `900 ${fontSize}px Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = 'rgba(27, 77, 62, 0.26)';
  context.strokeStyle = 'rgba(255, 255, 255, 0.56)';
  context.lineWidth = Math.max(2, Math.round(fontSize * 0.08));
  context.strokeText('AquaGuide', 0, 0);
  context.fillText('AquaGuide', 0, 0);
  context.restore();

  return canvas.toDataURL('image/png');
};

const applySaveWatermark = (image: HTMLImageElement | null) => {
  if (!image || image.dataset.aquaguideWatermark === 'active') return;
  if (!image.complete || !image.currentSrc) return;

  try {
    const originalSrc = image.src;
    const watermarkedSrc = createWatermarkedImageSrc(image);
    if (!watermarkedSrc) return;

    image.dataset.aquaguideWatermark = 'active';
    image.dataset.aquaguideOriginalSrc = originalSrc;
    image.src = watermarkedSrc;

    window.setTimeout(() => {
      if (image.dataset.aquaguideOriginalSrc) {
        image.src = image.dataset.aquaguideOriginalSrc;
      }
      delete image.dataset.aquaguideWatermark;
      delete image.dataset.aquaguideOriginalSrc;
    }, 2600);
  } catch {
    delete image.dataset.aquaguideWatermark;
    delete image.dataset.aquaguideOriginalSrc;
  }
};

const getEventImage = (target: EventTarget | null) => {
  if (target instanceof HTMLImageElement) return target;
  if (target instanceof Element) return target.closest('img');
  return null;
};

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AquaGuide render error', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-[430px] items-center justify-center bg-[#eef4f1] p-5 text-ink md:max-w-none">
        <div className="w-full max-w-[430px] rounded-3xl bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.12)] md:max-w-[560px]">
          <div className="mb-3 inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
            页面加载异常
          </div>
          <h1 className="text-xl font-black">AquaGuide 暂时没有渲染出来</h1>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            这通常是旧数据或某个组件运行时报错导致的。下面是浏览器捕获到的错误，发给我我就能继续精确修。
          </p>
          <pre className="mt-4 max-h-56 overflow-auto rounded-2xl bg-slate-950 p-3 text-[11px] leading-5 text-white">
            {this.state.error.message}
            {this.state.error.stack ? `\n\n${this.state.error.stack}` : ''}
          </pre>
          <button
            type="button"
            className="mt-4 h-11 w-full rounded-2xl bg-emerald-600 text-sm font-black text-white"
            onClick={() => window.location.reload()}
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }
}

const navItems = [
  { path: '/aquarium', label: '我的鱼缸', description: '管理设备与缸内状态', icon: Droplets },
  { path: '/encyclopedia', label: '图鉴', description: '查找生物与混养计算', icon: BookOpen },
  { path: '/care', label: '养护百科', description: '排查问题与养护步骤', icon: Library },
];

const desktopSubMenus = {
  '/encyclopedia': [
    { id: 'browse', label: '浏览图鉴', description: '查找生物和分类', icon: BookOpen, hash: '#browse' },
    { id: 'compatibility', label: '混养计算', description: '选择生物看风险', icon: Activity, hash: '#compatibility' },
  ],
} as const;

const readJsonCount = (key: string) => {
  try {
    const fallback = key === 'aqua_care_favorites' ? '{}' : '[]';
    const value = JSON.parse(localStorage.getItem(key) || fallback);
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === 'object') return Object.keys(value).length;
  } catch {
    return 0;
  }
  return 0;
};

const FAVORITES_CHANGED_EVENT = 'aquaguide:favorites-changed';

const readSpeciesFavoriteCount = () => {
  try {
    const legacyValue = JSON.parse(localStorage.getItem('wishlistFishIds') || '[]');
    const legacyIds = Array.isArray(legacyValue) ? legacyValue.filter((id): id is string => typeof id === 'string') : [];
    const appStateIds = loadAppStateFromStorage().wishlist.filter((id): id is string => typeof id === 'string');
    return new Set([...legacyIds, ...appStateIds]).size;
  } catch {
    return readJsonCount('wishlistFishIds');
  }
};

function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      {/* ── 移动端：底部标签栏 ── */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-white/95 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(26,26,26,0.06)] backdrop-blur-md md:hidden">
        <div className="grid grid-cols-3 gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => navigate(item.path)}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center rounded-2xl text-[11px] font-bold transition-all",
                  isActive
                    ? "bg-accent text-white shadow-sm"
                    : "text-ink/50 hover:bg-accent-light hover:text-accent"
                )}
              >
                <Icon className={cn("mb-1 h-5 w-5", isActive ? "stroke-white" : "")} />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

    </>
  );
}

function DesktopSidebar({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activePath = navItems.some(item => item.path === location.pathname) ? location.pathname : '/aquarium';
  const [favoriteCounts, setFavoriteCounts] = useState({ species: 0, care: 0 });
  const activeMenu = useMemo(() => {
    if (activePath === '/encyclopedia') return [...desktopSubMenus['/encyclopedia']];
    return [];
  }, [activePath]);

  const fixedUtilityItems = useMemo(() => [
    {
      id: 'species-wishlist',
      label: `种草图鉴${favoriteCounts.species ? ` ${favoriteCounts.species}` : ''}`,
      description: favoriteCounts.species ? '查看已收藏生物' : '暂无收藏生物',
      icon: Heart,
      path: '/encyclopedia',
      hash: '#wishlist',
    },
    {
      id: 'care-favorites',
      label: `养护收藏${favoriteCounts.care ? ` ${favoriteCounts.care}` : ''}`,
      description: favoriteCounts.care ? '查看收藏文章' : '暂无收藏文章',
      icon: Library,
      path: '/care',
      hash: '#care-favorites',
    },
  ], [favoriteCounts]);

  useEffect(() => {
    const refreshCounts = () => {
      setFavoriteCounts({
        species: readSpeciesFavoriteCount(),
        care: readJsonCount('aqua_care_favorites'),
      });
    };
    refreshCounts();
    window.addEventListener('storage', refreshCounts);
    window.addEventListener('focus', refreshCounts);
    window.addEventListener(FAVORITES_CHANGED_EVENT, refreshCounts);
    const timer = window.setInterval(refreshCounts, 1200);
    return () => {
      window.removeEventListener('storage', refreshCounts);
      window.removeEventListener('focus', refreshCounts);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, refreshCounts);
      window.clearInterval(timer);
    };
  }, []);

  const handlePrimaryNav = (path: string) => {
    navigate(path);
  };

  const handleSubNav = (hash: string) => {
    navigate(`${activePath}${hash}`);
    window.setTimeout(() => {
      const target = document.getElementById(hash.replace('#', ''));
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handleUtilityNav = (path: string, hash: string) => {
    navigate(`${path}${hash}`);
    window.setTimeout(() => {
      const target = document.getElementById(hash.replace('#', ''));
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  return (
    <aside
      aria-label="AquaGuide 桌面导航"
      className={cn(
        'desktop-sidebar fixed inset-y-0 left-0 z-50 hidden border-r border-white/70 bg-[#F8FAF8]/95 shadow-[18px_0_48px_rgba(27,77,62,0.08)] backdrop-blur-xl md:flex',
        collapsed ? 'w-[76px]' : 'w-[280px]'
      )}
    >
      <div className="flex min-h-0 w-full flex-col">
        <div className={cn('flex shrink-0 items-center gap-3 px-4 pb-5 pt-5', collapsed && 'justify-center px-2')}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-[0_12px_26px_rgba(27,77,62,0.22)]">
            <Droplets className="h-6 w-6" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-[19px] font-black leading-tight text-ink">AquaGuide</div>
              <div className="mt-0.5 text-[12px] font-bold text-ink/42">水族养护助手</div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className="absolute -right-4 top-7 flex h-9 w-9 items-center justify-center rounded-full border border-white bg-white text-ink/50 shadow-[0_8px_24px_rgba(15,23,42,0.12)] transition-colors hover:text-accent"
          aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>

        <nav className="min-h-0 flex-1 px-3 pb-4">
          <div className="grid gap-2">
            {navItems.map((item) => {
              const isActive = activePath === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handlePrimaryNav(item.path)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex min-h-[58px] w-full items-center gap-3 rounded-[20px] px-3 text-left transition-colors',
                    collapsed && 'justify-center px-2',
                    isActive
                      ? 'bg-accent text-white shadow-[0_14px_28px_rgba(27,77,62,0.18)]'
                      : 'text-ink/58 hover:bg-white hover:text-accent'
                  )}
                >
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px]', isActive ? 'bg-white/15 text-white' : 'bg-white text-ink/46')}>
                    <Icon className="h-5 w-5" />
                  </span>
                  {!collapsed && (
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-black leading-tight">{item.label}</span>
                      <span className={cn('mt-1 block truncate text-[10px] font-bold leading-tight', isActive ? 'text-white/65' : 'text-ink/36')}>
                        {item.description}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {activeMenu.length > 0 && (
          <div className={cn('mt-6 border-t border-ink/6 pt-4', collapsed && 'mt-4 pt-3')}>
            <div className="grid gap-1.5">
              {activeMenu.map((item) => {
                const Icon = item.icon;
                const isActive = location.hash === item.hash;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={collapsed ? item.label : undefined}
                    onClick={() => handleSubNav(item.hash)}
                    className={cn(
                      'flex min-h-[50px] items-center gap-3 rounded-[16px] px-3 text-left transition-colors',
                      collapsed && 'justify-center px-2',
                      isActive
                        ? 'bg-white text-accent shadow-sm ring-1 ring-emerald-100'
                        : 'text-ink/55 hover:bg-white/80 hover:text-accent'
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && (
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-black leading-tight">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[9px] font-bold leading-tight text-ink/34">{item.description}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          )}
        </nav>

        {!collapsed && (
          <div className="shrink-0 border-t border-ink/6 px-5 py-4">
            <div className="mb-3 grid gap-2">
              {fixedUtilityItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path && location.hash === item.hash;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleUtilityNav(item.path, item.hash)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left shadow-sm transition-colors',
                      isActive
                        ? 'bg-white text-accent ring-1 ring-emerald-100'
                        : 'bg-white/75 text-ink/55 hover:bg-white hover:text-accent'
                    )}
                  >
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px]', isActive ? 'bg-emerald-50 text-accent' : 'bg-white text-ink/48')}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-black leading-tight">{item.label}</span>
                      <span className="mt-0.5 block truncate text-[10px] font-bold leading-tight text-ink/42">{item.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-start gap-2 rounded-[18px] bg-white/80 px-3 py-3 text-[11px] font-bold leading-relaxed text-ink/45 shadow-sm">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              数据保存在当前浏览器，切换设备前请先同步或导出。
            </div>
            <div className="mt-3 text-[10px] font-black text-ink/28">AquaGuide v1.0</div>
          </div>
        )}
        {collapsed && (
          <div className="grid shrink-0 gap-2 border-t border-ink/6 px-3 py-4">
            {fixedUtilityItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path && location.hash === item.hash;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  onClick={() => handleUtilityNav(item.path, item.hash)}
                  className={cn(
                    'relative flex h-11 w-full items-center justify-center rounded-[16px] shadow-sm transition-colors',
                    isActive ? 'bg-white text-accent ring-1 ring-emerald-100' : 'bg-white/75 text-ink/50 hover:bg-white hover:text-accent'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {(item.id === 'species-wishlist' ? favoriteCounts.species : favoriteCounts.care) > 0 && (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

function PageLoading() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center rounded-sm border border-border bg-white p-6 text-center">
      <div>
        <div className="mx-auto mb-3 h-10 w-10 animate-pulse rounded-full bg-accent-light" />
        <p className="text-sm font-bold text-ink/70">正在加载 AquaGuide...</p>
        <p className="mt-1 text-[11px] font-medium text-ink/45">国内网络首次打开可能需要几秒</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <Router>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </Router>
    </AppErrorBoundary>
  );
}

function AppShell() {
  const location = useLocation();
  const isStructurePreview = location.pathname === '/project-structure';
  const isLogin = location.pathname === '/login';
  const [isPhoneShell, setIsPhoneShell] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('aquaguide_desktop_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const isDesktopShell = !isPhoneShell;
  const desktopShellStyle = useMemo(() => ({
    '--desktop-sidebar-width': isDesktopSidebarCollapsed ? '76px' : '280px',
  }) as CSSProperties, [isDesktopSidebarCollapsed]);

  const toggleDesktopSidebar = () => {
    setIsDesktopSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('aquaguide_desktop_sidebar_collapsed', String(next));
      } catch {
        // localStorage can be unavailable in private contexts.
      }
      return next;
    });
  };

  useEffect(() => {
    const root = document.querySelector('.aquaguide-app');
    if (!root) return;

    let touchTimer: number | null = null;
    const clearTouchTimer = () => {
      if (touchTimer !== null) {
        window.clearTimeout(touchTimer);
        touchTimer = null;
      }
    };

    const handleContextMenu = (event: Event) => {
      applySaveWatermark(getEventImage(event.target));
    };

    const handlePointerDown = (event: Event) => {
      const pointerEvent = event as PointerEvent;
      if (pointerEvent.pointerType !== 'touch' && pointerEvent.pointerType !== 'pen') return;
      const image = getEventImage(event.target);
      if (!image) return;
      clearTouchTimer();
      touchTimer = window.setTimeout(() => applySaveWatermark(image), 520);
    };

    root.addEventListener('contextmenu', handleContextMenu, true);
    root.addEventListener('dragstart', handleContextMenu, true);
    root.addEventListener('pointerdown', handlePointerDown, true);
    root.addEventListener('pointerup', clearTouchTimer, true);
    root.addEventListener('pointercancel', clearTouchTimer, true);

    return () => {
      clearTouchTimer();
      root.removeEventListener('contextmenu', handleContextMenu, true);
      root.removeEventListener('dragstart', handleContextMenu, true);
      root.removeEventListener('pointerdown', handlePointerDown, true);
      root.removeEventListener('pointerup', clearTouchTimer, true);
      root.removeEventListener('pointercancel', clearTouchTimer, true);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const phoneMedia = window.matchMedia('(max-width: 767px)');
    const sync = () => {
      setIsPhoneShell(phoneMedia.matches);
    };
    sync();
    phoneMedia.addEventListener('change', sync);
    return () => {
      phoneMedia.removeEventListener('change', sync);
    };
  }, []);

  if (isStructurePreview) {
    return (
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/project-structure" element={<ProjectStructurePreview />} />
          <Route path="*" element={<Navigate to="/project-structure" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (isLogin) {
    return (
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div
      className={cn(
        'aquaguide-app flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#dfe8e5] text-ink md:h-[100dvh] md:overflow-hidden',
        isDesktopShell ? 'desktop-shell-active' : 'phone-shell-active',
      )}
      style={desktopShellStyle}
    >
      <DesktopSidebar collapsed={isDesktopSidebarCollapsed} onToggleCollapsed={toggleDesktopSidebar} />
      <div className="desktop-too-narrow" role="status" aria-live="polite">
        <div className="rounded-[28px] bg-white p-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-accent">
            <ChevronLeft className="h-5 w-5" />
          </div>
          <div className="text-lg font-black text-ink">当前窗口太窄</div>
          <p className="mt-2 text-sm font-bold leading-6 text-ink/55">
            桌面工作台需要更多横向空间。请放大窗口，或收起左侧栏后继续使用。
          </p>
        </div>
      </div>
      {/* 主内容区：移动端保持居中卡片风格，桌面端占满剩余空间 */}
      <div className="app-main-shell mx-auto flex min-h-0 w-full max-w-[430px] flex-1 flex-col overflow-hidden bg-bg shadow-2xl md:mx-0 md:h-[100dvh] md:max-w-none md:bg-transparent md:shadow-none md:overflow-hidden">
        <main className="app-scrollbar-hidden desktop-workspace-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-[calc(88px+env(safe-area-inset-bottom))] pt-[calc(12px+env(safe-area-inset-top))] md:h-[100dvh] md:min-h-0 md:px-6 md:pb-3 md:pt-6">
          <div className="desktop-canvas mx-auto w-full max-w-full min-w-0 overflow-x-hidden md:overflow-visible">
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route path="/" element={<Navigate to="/aquarium" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/encyclopedia" element={<Encyclopedia />} />
                <Route path="/care" element={<CareEncyclopedia />} />
                <Route path="/aquarium" element={<AquariumManager />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
      {isPhoneShell && <BottomNavigation />}
    </div>
  );
}
