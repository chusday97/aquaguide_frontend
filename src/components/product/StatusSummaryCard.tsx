import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Thermometer, Waves } from 'lucide-react';
import { TagPill, type TagPillTone } from './TagPill';

export type AquariumHealthStatus = '正常' | '提醒' | '风险';

type StatusSummaryCardProps = {
  status: AquariumHealthStatus;
  healthPercent: number;
  temperatureStatus: string;
  waterChangeStatus: string;
  speciesCount: number;
  riskCount: number;
  conclusion: string;
  meta?: ReactNode;
  actionSlot?: ReactNode;
};

const statusTone: Record<AquariumHealthStatus, TagPillTone> = {
  正常: 'normal',
  提醒: 'warning',
  风险: 'danger',
};

export function StatusSummaryCard({
  status,
  healthPercent,
  temperatureStatus,
  waterChangeStatus,
  speciesCount,
  riskCount,
  conclusion,
  meta,
  actionSlot,
}: StatusSummaryCardProps) {
  const scoreTone = healthPercent >= 80 ? 'normal' : healthPercent >= 60 ? 'warning' : 'danger';
  const Icon = scoreTone === 'danger' ? AlertTriangle : CheckCircle2;
  const barClassName = scoreTone === 'normal' ? 'bg-emerald-500' : scoreTone === 'warning' ? 'bg-amber-500' : 'bg-red-500';
  const riskTextClassName = status === '风险' ? 'text-red-600' : status === '提醒' ? 'text-amber-700' : 'text-ink/45';
  const cardClassName =
    scoreTone === 'normal'
      ? 'border-emerald-100 bg-white text-emerald-700'
      : scoreTone === 'warning'
        ? 'border-amber-100 bg-white text-amber-700'
        : 'border-red-100 bg-white text-red-600';

  return (
    <section className={`overflow-hidden rounded-[18px] border p-4 shadow-sm ${cardClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TagPill tone={statusTone[status]}>{status}</TagPill>
            {meta}
          </div>
          <p className="mt-3 text-[17px] font-black leading-snug text-ink">{conclusion}</p>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/85 shadow-sm">
          <Icon className="h-7 w-7" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[76px_1fr] items-end gap-3">
        <div>
          <div className="text-[30px] font-black leading-none tracking-[-0.04em] text-ink">{healthPercent}%</div>
          <div className="mt-1 text-[10px] font-black text-ink/45">健康度</div>
        </div>
        <div className="pb-1">
          <div className="h-2 overflow-hidden rounded-full bg-white/80">
            <div className={`h-full rounded-full ${barClassName}`} style={{ width: `${healthPercent}%` }} />
          </div>
          <div className="mt-1 text-right text-[10px] font-bold text-ink/45">
            <span className={riskCount > 0 ? riskTextClassName : ''}>
              {riskCount > 0 ? `${riskCount} 条风险提醒` : '暂无风险提醒'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatusMetric icon={<Waves className="h-3.5 w-3.5" />} label="换水" value={waterChangeStatus} />
        <StatusMetric icon={<Thermometer className="h-3.5 w-3.5" />} label="水温" value={temperatureStatus} />
        <StatusMetric label="生物" value={`${speciesCount} 种`} />
      </div>

      {actionSlot && (
        <div className="mt-3 border-t border-ink/6 pt-3">
          {actionSlot}
        </div>
      )}
    </section>
  );
}

function StatusMetric({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-sm bg-white/70 px-2 py-2">
      <div className="flex items-center gap-1 text-[9px] font-black text-ink/42">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 truncate text-[11px] font-black text-ink">{value}</div>
    </div>
  );
}
