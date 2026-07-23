import { AlertTriangle, CalendarDays, Check, CheckCircle2, ChevronDown, Clock3, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { TagPill, type TagPillTone } from './TagPill';

export type AquariumStatusLevel = 'normal' | 'needs_attention' | 'urgent' | 'insufficient_data';

export type DailyActionType =
  | 'urgent_recovery'
  | 'compatibility_review'
  | 'care_plan'
  | 'water_change'
  | 'daily_check'
  | 'routine';

export type DailyAquariumStatus = {
  pendingTaskCount: number;
  maintenanceStatus: 'normal' | 'due' | 'overdue';
  knownRiskLevel: 'none_recorded' | 'low' | 'medium' | 'high';
  dataStatus: 'sufficient' | 'partial' | 'insufficient';
  missingData: string[];
};

export type TaskTrigger = {
  type:
    | 'maintenance_overdue'
    | 'maintenance_due'
    | 'user_reported_abnormality'
    | 'missing_important_data'
    | 'new_species_added'
    | 'scheduled_task';
  source:
    | 'water_change_record'
    | 'maintenance_schedule'
    | 'user_observation'
    | 'water_quality_record'
    | 'aquarium_stock';
  value?: Record<string, string | number | boolean>;
};

export type DailyActionTask = {
  id: string;
  actionType: DailyActionType;
  title: string;
  priority: 'normal' | 'medium' | 'high';
  reason: string;
  evidence: string;
  primaryLabel?: string;
  targetId?: string;
  trigger: TaskTrigger;
};

export type DailyActionViewModel = {
  level: AquariumStatusLevel;
  label: string;
  sourceLabel: string;
  status: DailyAquariumStatus;
  task: DailyActionTask;
  reasoning: string[];
};

export type CarePlanSummaryItem = {
  id: string;
  title: string;
  dateLabel: string;
  detail: string;
  status: 'overdue' | 'today' | 'upcoming';
};

export type CarePlanSummaryViewModel = {
  activeCount: number;
  dueCount: number;
  overdueCount: number;
  visibleItems: CarePlanSummaryItem[];
};

type StatusSummaryCardProps = {
  action: DailyActionViewModel;
  showWhy: boolean;
  carePlan: CarePlanSummaryViewModel;
  showCarePlan: boolean;
  onPrimaryAction: () => void;
  onToggleWhy: () => void;
  onToggleCarePlan: () => void;
  onOpenCarePlan: (id: string) => void;
  onCompleteCarePlan: (id: string) => void;
  onRescheduleCarePlan: (id: string) => void;
  onDeleteCarePlan: (id: string) => void;
  onBrowseCare: () => void;
};

const levelTone: Record<AquariumStatusLevel, TagPillTone> = {
  normal: 'normal',
  needs_attention: 'warning',
  urgent: 'danger',
  insufficient_data: 'info',
};

const levelStyles: Record<AquariumStatusLevel, string> = {
  normal: 'border-emerald-100 bg-[linear-gradient(145deg,#ffffff,#edf8f1)] text-emerald-700',
  needs_attention: 'border-amber-100 bg-[linear-gradient(145deg,#ffffff,#fff8e8)] text-amber-700',
  urgent: 'border-red-100 bg-[linear-gradient(145deg,#ffffff,#fff2f2)] text-red-600',
  insufficient_data: 'border-sky-100 bg-[linear-gradient(145deg,#ffffff,#eff8ff)] text-sky-700',
};

export function StatusSummaryCard({
  action,
  showWhy,
  carePlan,
  showCarePlan,
  onPrimaryAction,
  onToggleWhy,
  onToggleCarePlan,
  onOpenCarePlan,
  onCompleteCarePlan,
  onRescheduleCarePlan,
  onDeleteCarePlan,
  onBrowseCare,
}: StatusSummaryCardProps) {
  const { t } = useTranslation();
  const Icon = action.level === 'normal' ? CheckCircle2 : AlertTriangle;
  const hasPrimaryAction = Boolean(action.task.primaryLabel);
  const careItems = showCarePlan ? carePlan.visibleItems : carePlan.visibleItems.slice(0, 1);
  const careSummary = carePlan.overdueCount > 0
    ? t('aquarium.carePlanOverdueCount', { count: carePlan.overdueCount })
    : carePlan.dueCount > 0
      ? t('aquarium.carePlanDueCount', { count: carePlan.dueCount })
      : carePlan.activeCount > 0
        ? t('aquarium.carePlanActiveCount', { count: carePlan.activeCount })
        : t('aquarium.carePlanEmpty');
  const careStatusStyle = {
    overdue: 'bg-red-50 text-red-700',
    today: 'bg-amber-50 text-amber-800',
    upcoming: 'bg-sky-50 text-sky-700',
  } as const;
  const careStatusLabel = {
    overdue: t('aquarium.carePlanOverdue'),
    today: t('aquarium.carePlanToday'),
    upcoming: t('aquarium.carePlanUpcoming'),
  } as const;

  return (
    <section className={`flex min-h-[220px] flex-col rounded-[20px] border p-4 shadow-sm ${levelStyles[action.level]}`} data-daily-action={action.task.actionType}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-black text-ink">{t('aquarium.todayAction')}</div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <TagPill tone={levelTone[action.level]}>{action.label}</TagPill>
            <span className="text-[10px] font-black text-ink/38">{action.sourceLabel}</span>
          </div>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 rounded-[17px] bg-white/78 p-4">
        <h2 className="text-[18px] font-black leading-snug text-ink [text-wrap:pretty]">{action.task.title}</h2>
        <p className="mt-2 text-[12px] font-bold leading-5 text-ink/60">{action.task.reason}</p>

        <button
          type="button"
          aria-expanded={showWhy}
          onClick={onToggleWhy}
          className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-[11px] font-black text-ink/52 transition-colors hover:bg-white hover:text-emerald-800"
        >
          {t('aquarium.why')}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showWhy ? 'rotate-180' : ''}`} />
        </button>

        {showWhy && (
          <div className="mt-2 rounded-[14px] border border-ink/6 bg-white/80 p-3" aria-live="polite">
            <ul className="grid gap-2">
              {action.reasoning.slice(0, 3).map(reason => (
                <li key={reason} className="flex gap-2 text-[11px] font-bold leading-5 text-ink/58">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {hasPrimaryAction && (
        <Button
          type="button"
          onClick={onPrimaryAction}
          className="mt-auto h-11 w-full rounded-full bg-emerald-800 px-4 text-[12px] font-black text-white shadow-none hover:bg-emerald-900"
        >
          {action.task.primaryLabel}
        </Button>
      )}

      <section id="care-plan" className="mt-3 rounded-[17px] border border-white/80 bg-white/72 p-3 text-ink shadow-sm">
        <button
          type="button"
          onClick={onToggleCarePlan}
          aria-expanded={showCarePlan}
          className="flex min-h-10 w-full items-center justify-between gap-3 rounded-[12px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <CalendarDays className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-black text-ink">{t('aquarium.carePlan')}</span>
              <span className="block truncate text-[10px] font-bold text-ink/45">{careSummary}</span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-black text-ink/42">
            {carePlan.activeCount > 1 && (showCarePlan
              ? t('aquarium.collapse')
              : t('aquarium.carePlanMore', { count: carePlan.activeCount - 1 }))}
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showCarePlan ? 'rotate-180' : ''}`} />
          </span>
        </button>

        {carePlan.activeCount === 0 ? (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-[13px] bg-bg/75 px-3 py-2.5">
            <span className="text-[10px] font-bold leading-5 text-ink/48">{t('aquarium.carePlanEmptyHint')}</span>
            <button type="button" onClick={onBrowseCare} className="h-8 shrink-0 rounded-full bg-white px-3 text-[10px] font-black text-emerald-700 shadow-sm">
              {t('aquarium.browseCare')}
            </button>
          </div>
        ) : (
          <div className="mt-2 grid gap-2">
            {careItems.map(item => (
              <article key={item.id} className="rounded-[13px] border border-border/65 bg-white/90 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-black text-ink">{item.title}</div>
                    <div className="mt-0.5 text-[9px] font-bold text-ink/42">{item.dateLabel} · {item.detail}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${careStatusStyle[item.status]}`}>
                    {careStatusLabel[item.status]}
                  </span>
                </div>
                {showCarePlan && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <button type="button" onClick={() => onOpenCarePlan(item.id)} className="h-8 rounded-full bg-emerald-700 px-3 text-[10px] font-black text-white">
                      {t('aquarium.viewGuide')}
                    </button>
                    <button type="button" onClick={() => onCompleteCarePlan(item.id)} className="inline-flex h-8 items-center gap-1 rounded-full bg-emerald-50 px-2.5 text-[10px] font-black text-emerald-700">
                      <Check className="h-3 w-3" />{t('aquarium.complete')}
                    </button>
                    <button type="button" onClick={() => onRescheduleCarePlan(item.id)} className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-[10px] font-black text-ink/48 hover:bg-bg">
                      <Clock3 className="h-3 w-3" />{t('aquarium.reschedule')}
                    </button>
                    <button type="button" onClick={() => onDeleteCarePlan(item.id)} className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-[10px] font-black text-red-500 hover:bg-red-50">
                      <Trash2 className="h-3 w-3" />{t('aquarium.delete')}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
