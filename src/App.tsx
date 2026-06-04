/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, lazy, Suspense, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BookOpen, Droplets, Library } from 'lucide-react';

const AquariumManager = lazy(() => import('./pages/Aquarium'));
const Encyclopedia = lazy(() => import('./pages/Encyclopedia'));
const CareEncyclopedia = lazy(() => import('./pages/CareEncyclopedia'));
const ProjectStructurePreview = lazy(() => import('./pages/ProjectStructurePreview'));

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
      <div className="mx-auto flex min-h-[100dvh] max-w-[430px] items-center justify-center bg-[#eef4f1] p-5 text-ink">
        <div className="w-full rounded-3xl bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
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
  { path: '/aquarium', label: '我的鱼缸', icon: Droplets },
  { path: '/encyclopedia', label: '图鉴', icon: BookOpen },
  { path: '/care', label: '养护百科', icon: Library },
];

function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="relative z-50 shrink-0 border-t border-border/80 bg-white/95 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(26,26,26,0.06)] backdrop-blur-md">
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
        <AppShell />
      </Router>
    </AppErrorBoundary>
  );
}

function AppShell() {
  const location = useLocation();
  const isStructurePreview = location.pathname === '/project-structure';

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

  return (
    <div className="aquaguide-app min-h-[100dvh] overflow-x-hidden bg-[#dfe8e5] text-ink md:flex md:items-center md:justify-center md:p-6">
      <div className="mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-bg shadow-2xl md:h-[min(100dvh-48px,932px)] md:rounded-[34px] md:border md:border-white/70">
        <main className="app-scrollbar-hidden min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 pt-[calc(12px+env(safe-area-inset-top))]">
          <div className="mx-auto w-full max-w-full min-w-0 overflow-x-hidden">
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route path="/" element={<Navigate to="/aquarium" replace />} />
                <Route path="/encyclopedia" element={<Encyclopedia />} />
                <Route path="/care" element={<CareEncyclopedia />} />
                <Route path="/aquarium" element={<AquariumManager />} />
              </Routes>
            </Suspense>
          </div>
        </main>

        <BottomNavigation />
      </div>
    </div>
  );
}
