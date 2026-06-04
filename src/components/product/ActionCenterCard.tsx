import type { ReactNode } from 'react';

export type ActionCenterStatus = '建议处理' | '待处理' | '观察' | '已完成' | '暂无任务' | '工具';

type ActionCenterCardProps = {
  title: string;
  status: ActionCenterStatus;
  description: string;
  actionText: string;
  icon: ReactNode;
  onAction: () => void;
  tone?: 'normal' | 'warning' | 'danger' | 'info' | 'muted';
  size?: 'priority' | 'tool';
};

const toneClassName: Record<NonNullable<ActionCenterCardProps['tone']>, string> = {
  normal: 'border-emerald-100 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-100 bg-amber-50 text-amber-800',
  danger: 'border-red-100 bg-red-50 text-red-700',
  info: 'border-sky-100 bg-sky-50 text-sky-800',
  muted: 'border-white bg-white text-ink',
};

const statusClassName: Record<ActionCenterStatus, string> = {
  建议处理: 'bg-red-100 text-red-700',
  待处理: 'bg-amber-100 text-amber-700',
  观察: 'bg-sky-100 text-sky-700',
  已完成: 'bg-emerald-100 text-emerald-700',
  暂无任务: 'bg-slate-100 text-slate-500',
  工具: 'bg-white/70 text-ink/50',
};

export function ActionCenterCard({
  title,
  status,
  description,
  actionText,
  icon,
  onAction,
  tone = 'muted',
  size = 'priority',
}: ActionCenterCardProps) {
  return (
    <button
      type="button"
      onClick={onAction}
      className={`flex min-h-[118px] flex-col justify-between rounded-[18px] border p-3 text-left shadow-sm transition-transform active:scale-[0.98] ${toneClassName[tone]} ${
        size === 'tool' ? 'min-h-[92px]' : ''
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/78 shadow-sm">
          {icon}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${statusClassName[status]}`}>
          {status}
        </span>
      </span>
      <span className="mt-3 min-w-0">
        <span className="block text-[13px] font-black leading-tight">{title}</span>
        <span className="mt-1 line-clamp-2 block text-[10px] font-medium leading-relaxed opacity-65">{description}</span>
      </span>
      <span className="mt-3 text-[11px] font-black opacity-80">{actionText}</span>
    </button>
  );
}
