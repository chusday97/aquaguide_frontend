import type { ReactNode } from 'react';
import { CheckCircle2, Clock3, Eye, AlertTriangle } from 'lucide-react';

export type TodayTaskStatus = '待处理' | '已完成' | '建议处理' | '观察';

type TodayTaskCardProps = {
  title: string;
  status: TodayTaskStatus;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionTone?: 'primary' | 'outline' | 'ghost' | 'done';
  icon?: ReactNode;
};

const statusStyle: Record<TodayTaskStatus, { className: string; icon: ReactNode }> = {
  已完成: {
    className: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  待处理: {
    className: 'border-amber-100 bg-amber-50 text-amber-700',
    icon: <Clock3 className="h-3.5 w-3.5" />,
  },
  建议处理: {
    className: 'border-red-100 bg-red-50 text-red-600',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  观察: {
    className: 'border-sky-100 bg-sky-50 text-sky-700',
    icon: <Eye className="h-3.5 w-3.5" />,
  },
};

const actionStyle: Record<NonNullable<TodayTaskCardProps['actionTone']>, string> = {
  primary: 'bg-emerald-700 text-white hover:bg-emerald-800',
  outline: 'border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50',
  ghost: 'bg-transparent text-ink/55 hover:bg-bg',
  done: 'bg-emerald-50 text-emerald-700',
};

export function TodayTaskCard({ title, status, description, actionText, onAction, actionTone, icon }: TodayTaskCardProps) {
  const resolvedActionTone = actionTone || (status === '已完成' ? 'done' : status === '观察' ? 'ghost' : 'outline');

  return (
    <div className="grid grid-cols-[34px_1fr_auto] items-center gap-2 rounded-[14px] bg-white p-2.5 shadow-sm">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${statusStyle[status].className}`}>
        {icon || statusStyle[status].icon}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-[13px] font-black leading-tight text-ink">{title}</h3>
          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-black leading-none ${statusStyle[status].className}`}>
            {status}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-[10px] font-medium leading-relaxed text-ink/52">{description}</p>
      </div>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={`shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-black transition-colors ${actionStyle[resolvedActionTone]}`}
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
