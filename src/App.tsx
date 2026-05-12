/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import Encyclopedia from './pages/Encyclopedia';
import AquariumManager from './pages/Aquarium';
import AIAssistant from './pages/AIAssistant';
import { cn } from '@/lib/utils';
import { BookOpen, Droplets, Bot } from 'lucide-react';

const navItems = [
  { path: '/aquarium', label: '我的鱼缸', icon: Droplets },
  { path: '/encyclopedia', label: '图鉴', icon: BookOpen },
  { path: '/assistant', label: 'AI助手', icon: Bot },
];

function BottomNavigation() {
  const location = useLocation();

  return (
    <nav className="shrink-0 border-t border-border/80 bg-white/95 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(26,26,26,0.06)] backdrop-blur-md">
      <div className="grid grid-cols-3 gap-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex h-14 flex-col items-center justify-center rounded-2xl text-[11px] font-bold transition-all",
                isActive
                  ? "bg-accent text-white shadow-sm"
                  : "text-ink/50 hover:bg-accent-light hover:text-accent"
              )}
            >
              <Icon className={cn("mb-1 h-5 w-5", isActive ? "stroke-white" : "")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-[100dvh] overflow-x-hidden bg-[#dfe8e5] text-ink md:flex md:items-center md:justify-center md:p-6">
        <div className="mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-bg shadow-2xl md:h-[min(100dvh-48px,932px)] md:rounded-[34px] md:border md:border-white/70">
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 pt-[calc(12px+env(safe-area-inset-top))]">
            <div className="mx-auto w-full max-w-full min-w-0 overflow-x-hidden">
            <Routes>
              <Route path="/" element={<Navigate to="/aquarium" replace />} />
              <Route path="/encyclopedia" element={<Encyclopedia />} />
              <Route path="/aquarium" element={<AquariumManager />} />
              <Route path="/assistant" element={<AIAssistant />} />
            </Routes>
            </div>
          </main>

          <BottomNavigation />
        </div>
      </div>
    </Router>
  );
}
