import { AlertTriangle, Bot, CheckCircle2, ChevronDown } from 'lucide-react';
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

type StatusSummaryCardProps = {
  action: DailyActionViewModel;
  showWhy: boolean;
  aiAnswer?: string;
  aiError?: string;
  aiSource?: 'model' | 'fallback' | null;
  isAiLoading?: boolean;
  onAskAI: (question: string) => void;
  onPrimaryAction: () => void;
  onToggleWhy: () => void;
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
  aiAnswer,
  aiError,
  aiSource = null,
  isAiLoading = false,
  onAskAI,
  onPrimaryAction,
  onToggleWhy,
}: StatusSummaryCardProps) {
  const Icon = action.level === 'normal' ? CheckCircle2 : AlertTriangle;
  const canExplainWithAi = ['urgent_recovery', 'compatibility_review'].includes(action.task.actionType);
  const hasPrimaryAction = Boolean(action.task.primaryLabel);

  return (
    <section className={`flex min-h-[220px] flex-col rounded-[20px] border p-4 shadow-sm ${levelStyles[action.level]}`} data-daily-action={action.task.actionType}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-black text-ink">今日行动</div>
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
          为什么
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
            {canExplainWithAi && !aiAnswer && !aiError && (
              <Button
                type="button"
                variant="outline"
                disabled={isAiLoading}
                onClick={() => onAskAI('请用三句话解释为什么这件事现在优先，以及我下一步要注意什么。')}
                className="mt-3 h-9 rounded-full border-emerald-100 bg-white px-3 text-[11px] font-black text-emerald-800"
              >
                <Bot className="mr-1.5 h-3.5 w-3.5" />
                {isAiLoading ? '正在解释…' : '让 AI 简短解释'}
              </Button>
            )}
            {(aiAnswer || aiError) && (
              <div className={`mt-3 rounded-[12px] px-3 py-2 text-[11px] font-bold leading-5 ${aiError ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-900'}`}>
                <div className="mb-1 text-[9px] font-black opacity-55">{aiSource === 'model' ? '模型解释' : '本地提示'}</div>
                {aiAnswer || aiError}
              </div>
            )}
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
    </section>
  );
}
