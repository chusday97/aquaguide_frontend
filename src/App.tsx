/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, Suspense, useEffect, useMemo, useState, type CSSProperties, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  Activity,
  BookHeart,
  BookOpenCheck,
  BookOpen,
  ChevronLeft,
  Database,
  Droplets,
  Library,
  Medal,
  Heart,
  Skull,
  Settings,
} from 'lucide-react';
import { ToastProvider } from './components/common/ToastProvider';
import { WorkspaceNavigationProvider, useWorkspaceNavigation } from './components/layout/WorkspaceNavigationProvider';
import { LayoutModeProvider, useLayoutMode } from './components/layout/LayoutModeProvider';
import { DataRecoveryNotice, RouteErrorBoundary } from './components/common/RouteErrorBoundary';
import { lazyWithRecovery } from './lib/lazyWithRecovery';
import i18n from './i18n';
import { LanguageSettingsPanel } from './components/settings/LanguageSettingsPanel';
import { SettingsProvider, useSettings } from './components/settings/SettingsProvider';

const loadAquarium = () => import('./pages/Aquarium');
const loadEncyclopedia = () => import('./pages/Encyclopedia');
const loadCare = () => import('./pages/CareEncyclopedia');
const loadCollection = () => import('./pages/Collection');
const loadCollectionHub = () => import('./pages/CollectionHub');
const loadProjectStructure = () => import('./pages/ProjectStructurePreview');
const loadLogin = () => import('./pages/Login');
const loadAdminContent = () => import('./pages/AdminContent');
const loadIdentify = () => import('./pages/Identify');
const loadThreeDemo = () => import('./pages/ThreeDemo').then(module => ({ default: module.ThreeDemo }));

const AquariumManager = lazyWithRecovery(loadAquarium, 'aquarium');
const Encyclopedia = lazyWithRecovery(loadEncyclopedia, 'encyclopedia');
const CareEncyclopedia = lazyWithRecovery(loadCare, 'care');
const Collection = lazyWithRecovery(loadCollection, 'collection-module');
const CollectionHub = lazyWithRecovery(loadCollectionHub, 'collection-hub');
const ProjectStructurePreview = lazyWithRecovery(loadProjectStructure, 'project-structure');
const Login = lazyWithRecovery(loadLogin, 'login');
const AdminContent = lazyWithRecovery(loadAdminContent, 'admin-content');
const Identify = lazyWithRecovery(loadIdentify, 'identify');
const ThreeDemo = lazyWithRecovery(loadThreeDemo, '3d-demo');

const preloadRoute = (path: string) => {
  const loader = path === '/aquarium'
    ? loadAquarium
    : path === '/encyclopedia'
      ? loadEncyclopedia
      : path === '/identify'
        ? loadIdentify
      : path === '/care'
        ? loadCare
        : path === '/collection'
          ? loadCollectionHub
          : path.startsWith('/collection/')
            ? loadCollection
          : null;
  if (loader) void loader().catch(() => undefined);
};


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
            {i18n.t('common.pageError')}
          </div>
          <h1 className="text-xl font-black">{i18n.t('common.renderError')}</h1>
          <p className="mt-2 text-sm leading-6 text-ink/60">{i18n.t('common.renderErrorHint')}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" className="h-11 rounded-2xl bg-emerald-700 text-sm font-black text-white" onClick={() => this.setState({ error: null })}>{i18n.t('common.retry')}</button>
            <button type="button" className="h-11 rounded-2xl border border-emerald-100 bg-white text-sm font-black text-emerald-800" onClick={() => window.location.assign('/aquarium')}>{i18n.t('common.backToAquarium')}</button>
          </div>
        </div>
      </div>
    );
  }
}

const navItems = [
  { path: '/aquarium', labelKey: 'nav.aquarium', descriptionKey: 'nav.aquariumDescription', icon: Droplets },
  { path: '/encyclopedia', labelKey: 'nav.encyclopedia', descriptionKey: 'nav.encyclopediaDescription', icon: BookOpen },
  { path: '/care', labelKey: 'nav.care', descriptionKey: 'nav.careDescription', icon: Library },
  { path: '/collection', labelKey: 'nav.collection', descriptionKey: 'nav.collectionDescription', icon: BookHeart },
];

const mobileNavItems = navItems.map(item => item.path === '/collection' ? { ...item, labelKey: 'nav.collectionMobile' } : item);

const desktopSubMenus: Record<string, Array<{
  id: string;
  labelKey: string;
  descriptionKey: string;
  icon: typeof BookOpen;
  hash?: string;
  path?: string;
}>> = {
  '/encyclopedia': [
    { id: 'browse', labelKey: 'nav.browse', descriptionKey: 'nav.browseDescription', icon: BookOpen, hash: '#browse' },
    { id: 'compatibility', labelKey: 'nav.compatibility', descriptionKey: 'nav.compatibilityDescription', icon: Activity, hash: '#compatibility' },
  ],
  '/collection': [
    { id: 'wishlist', labelKey: 'nav.wishlist', descriptionKey: 'nav.wishlistDescription', icon: Heart, path: '/collection/wishlist' },
    { id: 'care', labelKey: 'nav.careFavorites', descriptionKey: 'nav.careFavoritesDescription', icon: BookOpenCheck, path: '/collection/care' },
    { id: 'memorial', labelKey: 'nav.memorial', descriptionKey: 'nav.memorialDescription', icon: Skull, path: '/collection/memorial' },
    { id: 'achievements', labelKey: 'nav.achievements', descriptionKey: 'nav.achievementsDescription', icon: Medal, path: '/collection/achievements' },
  ],
};

function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <>
      {/* ── 移动端：底部标签栏 ── */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-white/95 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(26,26,26,0.06)] backdrop-blur-md">
        <div className="grid grid-cols-4 gap-1">
          {mobileNavItems.map((item) => {
            const isActive = item.path === '/collection'
              ? location.pathname.startsWith('/collection')
              : location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                  onClick={() => navigate(item.path)}
                  onMouseEnter={() => preloadRoute(item.path)}
                  onFocus={() => preloadRoute(item.path)}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center rounded-2xl text-[11px] font-bold transition-all",
                  isActive
                    ? "bg-accent text-white shadow-sm"
                    : "text-ink/50 hover:bg-accent-light hover:text-accent"
                )}
              >
                <Icon className={cn("mb-1 h-5 w-5", isActive ? "stroke-white" : "")} />
                {t(item.labelKey)}
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
  const { navigateToRoute, navigateToView } = useWorkspaceNavigation();
  const { t } = useTranslation();
  const { openSettings } = useSettings();
  const activePath = location.pathname === '/wishlist'
    ? '/collection'
    : location.pathname === '/care-favorites'
      ? '/collection'
      : location.pathname.startsWith('/collection')
        ? '/collection'
      : navItems.some(item => item.path === location.pathname) ? location.pathname : '/aquarium';
  const activeMenu = desktopSubMenus[activePath] || [];

  const handlePrimaryNav = (path: string) => {
    navigateToRoute(path);
  };

  const handleSubNav = (item: (typeof activeMenu)[number]) => {
    if (item.path) navigateToRoute(item.path);
    else if (item.hash) navigateToView(activePath, item.hash);
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
              <div className="mt-0.5 text-[12px] font-bold text-ink/42">{t('nav.assistant')}</div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className="absolute -right-4 top-7 flex h-9 w-9 items-center justify-center rounded-full border border-white bg-white text-ink/50 shadow-[0_8px_24px_rgba(15,23,42,0.12)] transition-colors hover:text-accent"
          aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
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
                  onMouseEnter={() => preloadRoute(item.path)}
                  onFocus={() => preloadRoute(item.path)}
                  title={collapsed ? t(item.labelKey) : undefined}
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
                      <span className="block truncate text-[15px] font-black leading-tight">{t(item.labelKey)}</span>
                      <span className={cn('mt-1 block truncate text-[10px] font-bold leading-tight', isActive ? 'text-white/65' : 'text-ink/36')}>
                        {t(item.descriptionKey)}
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
                const isActive = item.path ? location.pathname === item.path : location.hash === item.hash;
                return (
                  <button
                    key={item.id}
                    type="button"
                      title={collapsed ? t(item.labelKey) : undefined}
                    onClick={() => handleSubNav(item)}
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
                        <span className="block truncate text-[13px] font-black leading-tight">{t(item.labelKey)}</span>
                        <span className="mt-0.5 block truncate text-[9px] font-bold leading-tight text-ink/34">{t(item.descriptionKey)}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          )}
        </nav>

        <div className={cn('shrink-0 border-t border-ink/6 py-4', collapsed ? 'px-3' : 'px-5')}>
          <button
            type="button"
            onClick={openSettings}
            title={collapsed ? t('common.settings') : undefined}
            className={cn('flex min-h-11 w-full items-center gap-3 rounded-[16px] bg-white px-3 text-left text-ink/58 shadow-sm transition-colors hover:text-emerald-700', collapsed && 'justify-center px-0')}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="text-[13px] font-black">{t('common.settings')}</span>}
          </button>
          {!collapsed && (
            <>
            <div className="flex items-start gap-2 rounded-[18px] bg-white/80 px-3 py-3 text-[11px] font-bold leading-relaxed text-ink/45 shadow-sm">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              {t('common.localDataHint')}
            </div>
            <div className="mt-3 text-[10px] font-black text-ink/28">AquaGuide v1.0</div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

function PageLoading() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60dvh] items-center justify-center rounded-sm border border-border bg-white p-6 text-center">
      <div>
        <div className="mx-auto mb-3 h-10 w-10 animate-pulse rounded-full bg-accent-light" />
        <p className="text-sm font-bold text-ink/70">{t('common.loading')}</p>
        <p className="mt-1 text-[11px] font-medium text-ink/45">{t('common.loadingHint')}</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <Router>
        <ToastProvider>
          <LayoutModeProvider>
            <SettingsProvider>
              <WorkspaceNavigationProvider>
                <AppShell />
              </WorkspaceNavigationProvider>
            </SettingsProvider>
          </LayoutModeProvider>
        </ToastProvider>
      </Router>
    </AppErrorBoundary>
  );
}

function AppShell() {
  const location = useLocation();
  const { isPhoneLayout } = useLayoutMode();
  const isStructurePreview = location.pathname === '/project-structure';
  const isLogin = location.pathname === '/login';
  const isAdminContent = location.pathname === '/admin/content';
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('aquaguide_desktop_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

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

  if (isAdminContent) {
    return (
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/admin/content" element={<RouteErrorBoundary page="admin-content"><AdminContent /></RouteErrorBoundary>} />
          <Route path="*" element={<Navigate to="/admin/content" replace />} />
        </Routes>
      </Suspense>
    );
  }

  const settingsPanel = <LanguageSettingsPanel />;

  if (isPhoneLayout) return <><MobileAppShell />{settingsPanel}</>;

  return (
    <>
      <DesktopAppShell
        collapsed={isDesktopSidebarCollapsed}
        onToggleCollapsed={toggleDesktopSidebar}
        style={desktopShellStyle}
      />
      {settingsPanel}
    </>
  );
}

function CollectionEntry() {
  const location = useLocation();
  const tab = new URLSearchParams(location.search).get('tab');
  const routeByTab: Record<string, string> = {
    wishlist: '/collection/wishlist',
    care: '/collection/care',
    memorial: '/collection/memorial',
    achievements: '/collection/achievements',
  };
  if (tab && routeByTab[tab]) return <Navigate to={routeByTab[tab]} replace />;
  return <CollectionHub />;
}

function WorkspaceRoutes() {
  const page = (content: ReactNode, name: string) => <RouteErrorBoundary page={name}>{content}</RouteErrorBoundary>;
  return (
    <>
      <DataRecoveryNotice />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Navigate to="/aquarium" replace />} />
          <Route path="/login" element={page(<Login />, 'login')} />
          <Route path="/encyclopedia" element={page(<Encyclopedia />, 'encyclopedia')} />
          <Route path="/identify" element={page(<Identify />, 'identify')} />
          <Route path="/care" element={page(<CareEncyclopedia />, 'care')} />
          <Route path="/collection" element={page(<CollectionEntry />, 'collection')} />
          <Route path="/collection/wishlist" element={page(<Collection module="wishlist" />, 'collection-wishlist')} />
          <Route path="/collection/care" element={page(<Collection module="care" />, 'collection-care')} />
          <Route path="/collection/memorial" element={page(<Collection module="memorial" />, 'collection-memorial')} />
          <Route path="/collection/achievements" element={page(<Collection module="achievements" />, 'collection-achievements')} />
          <Route path="/wishlist" element={<Navigate to="/collection/wishlist" replace />} />
          <Route path="/care-favorites" element={<Navigate to="/collection/care" replace />} />
          <Route path="/aquarium" element={page(<AquariumManager />, 'aquarium')} />
          <Route path="/3d-demo" element={page(<ThreeDemo />, '3d-demo')} />
          <Route path="/admin/content" element={page(<AdminContent />, 'admin-content')} />
        </Routes>
      </Suspense>
    </>
  );
}

function DesktopAppShell({
  collapsed,
  onToggleCollapsed,
  style,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  style: CSSProperties;
}) {
  return (
    <div
      className="aquaguide-app desktop-shell-active flex min-h-[100dvh] flex-col overflow-hidden bg-[#dfe8e5] text-ink"
      style={style}
      data-layout-mode="desktop"
    >
      <DesktopSidebar collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />
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
      <div className="app-main-shell flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-transparent">
        <main className="app-scrollbar-hidden desktop-workspace-scroll min-h-0 flex-1 overflow-y-auto">
          <div className="desktop-canvas mx-auto w-full">
            <WorkspaceRoutes />
          </div>
        </main>
      </div>
    </div>
  );
}

function MobileAppShell() {
  return (
    <div
      className="aquaguide-app phone-shell-active flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#dfe8e5] text-ink"
      data-layout-mode="phone"
    >
      <div className="app-main-shell mx-auto flex min-h-0 w-full max-w-[430px] flex-1 flex-col overflow-hidden bg-bg shadow-2xl">
        <main className="app-scrollbar-hidden min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-[calc(88px+env(safe-area-inset-bottom))] pt-[calc(12px+env(safe-area-inset-top))]">
          <div className="mx-auto w-full max-w-full min-w-0 overflow-x-hidden">
            <WorkspaceRoutes />
          </div>
        </main>
      </div>
      <BottomNavigation />
    </div>
  );
}
