import type { ReactNode } from 'react';

export type TagPillTone = 'normal' | 'warning' | 'danger' | 'info' | 'muted';

const toneClassName: Record<TagPillTone, string> = {
  normal: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-red-200 bg-red-50 text-red-600',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
  muted: 'border-slate-200 bg-slate-50 text-slate-500',
};

type TagPillProps = {
  children: ReactNode;
  tone?: TagPillTone;
  className?: string;
};

export function TagPill({ children, tone = 'muted', className = '' }: TagPillProps) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-black leading-tight ${toneClassName[tone]} ${className}`}>
      {children}
    </span>
  );
}
