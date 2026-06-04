import type { ReactNode } from 'react';

export type QuickActionItem = {
  label: string;
  description?: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: 'normal' | 'warning' | 'danger' | 'info' | 'muted';
  active?: boolean;
};

type QuickActionGridProps = {
  actions: QuickActionItem[];
};

const toneClassName: Record<NonNullable<QuickActionItem['tone']>, string> = {
  normal: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  warning: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100',
  info: 'bg-sky-50 text-sky-700 hover:bg-sky-100',
  muted: 'bg-white text-ink/70 hover:bg-bg',
};

const activeToneClassName: Record<NonNullable<QuickActionItem['tone']>, string> = {
  normal: 'bg-emerald-700 text-white hover:bg-emerald-800',
  warning: 'bg-amber-600 text-white hover:bg-amber-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  info: 'bg-sky-700 text-white hover:bg-sky-800',
  muted: 'bg-ink text-white hover:bg-ink/90',
};

export function QuickActionGrid({ actions }: QuickActionGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map(action => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          className={`grid min-h-[50px] grid-cols-[30px_1fr] items-center gap-2 rounded-[16px] px-3 py-2 text-left shadow-sm transition-colors ${
            action.active ? activeToneClassName[action.tone || 'muted'] : toneClassName[action.tone || 'muted']
          }`}
        >
          <span className={`flex h-8 w-8 items-center justify-center rounded-full shadow-sm ${action.active ? 'bg-white/18 text-white' : 'bg-white/75'}`}>
            {action.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-[12px] font-black leading-tight">{action.label}</span>
            {action.description && (
              <span className="mt-0.5 block truncate text-[9px] font-medium opacity-60">{action.description}</span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
