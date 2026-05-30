/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BookOpen, Droplets, Library } from 'lucide-react';

const AquariumManager = lazy(() => import('./pages/Aquarium'));
const Encyclopedia = lazy(() => import('./pages/Encyclopedia'));
const CareEncyclopedia = lazy(() => import('./pages/CareEncyclopedia'));
const ProjectStructurePreview = lazy(() => import('./pages/ProjectStructurePreview'));

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
    <Router>
      <AppShell />
    </Router>
  );
}

function AppShell() {
  const location = useLocation();
  const isStructurePreview = location.pathname === '/project-structure';

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
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#dfe8e5] text-ink md:flex md:items-center md:justify-center md:p-6">
      <div className="mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-bg shadow-2xl md:h-[min(100dvh-48px,932px)] md:rounded-[34px] md:border md:border-white/70">
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 pt-[calc(12px+env(safe-area-inset-top))]">
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
