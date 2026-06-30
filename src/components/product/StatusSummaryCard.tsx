import { AlertTriangle, Bot, CheckCircle2, ClipboardList, Clock3, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TagPill, type TagPillTone } from './TagPill';

export type AquariumStatusLevel = 'normal' | 'needs_attention' | 'urgent' | 'insufficient_data';

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

export type DailyAdviceTask = {
  id: string;
  type: 'water_change' | 'observation' | 'setup' | 'data_check';
  title: string;
  priority: 'normal' | 'medium' | 'high';
  reason: string;
  evidence: string;
  trigger: TaskTrigger;
  steps: string[];
  observationNote: string;
};

export type DailyAdviceViewModel = {
  level: AquariumStatusLevel;
  label: string;
  sourceLabel: string;
  referenceTank: {
    name: string;
    waterType: string;
    temperature: string;
  };
  status: DailyAquariumStatus;
  task: DailyAdviceTask | null;
  statusItems: Array<{
    title: string;
    value: string;
    tone: TagPillTone;
    note?: string;
  }>;
  reasoning: string[];
};

type DailyAdviceAction =
  | 'start'
  | 'complete'
  | 'snooze'
  | 'toggle_steps'
  | 'open_ai_chat';

type StatusSummaryCardProps = {
  advice: DailyAdviceViewModel;
  showDetails: boolean;
  aiQuestion: string;
  aiAnswer?: string;
  aiError?: string;
  isAiLoading?: boolean;
  onAiQuestionChange: (value: string) => void;
  onAskAI: (question: string) => void;
  onAction: (action: DailyAdviceAction) => void;
};

const levelTone: Record<AquariumStatusLevel, TagPillTone> = {
  normal: 'normal',
  needs_attention: 'warning',
  urgent: 'danger',
  insufficient_data: 'info',
};

const levelStyles: Record<AquariumStatusLevel, string> = {
  normal: 'border-emerald-100 bg-white text-emerald-700',
  needs_attention: 'border-amber-100 bg-white text-amber-700',
  urgent: 'border-red-100 bg-white text-red-600',
  insufficient_data: 'border-sky-100 bg-white text-sky-700',
};

const quickQuestions = [
  '为什么今天需要换水？',
  '我可以推迟到明天吗？',
  '换水时需要注意什么？',
  '换水后应该观察什么？',
];

export function StatusSummaryCard({
  advice,
  showDetails,
  aiQuestion,
  aiAnswer,
  aiError,
  isAiLoading = false,
  onAiQuestionChange,
  onAskAI,
  onAction,
}: StatusSummaryCardProps) {
  const Icon = advice.level === 'normal' ? CheckCircle2 : AlertTriangle;
  const task = advice.task;
  const primaryButtonLabel = task ? '开始处理' : '记录鱼缸状态';
  const canCompleteTask = Boolean(task);

  return (
    <section className={`overflow-visible rounded-[18px] border p-4 shadow-sm ${levelStyles[advice.level]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-black text-ink">AquaGuide 今日建议</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TagPill tone={levelTone[advice.level]}>{advice.label}</TagPill>
            <TagPill tone={advice.status.pendingTaskCount > 0 ? 'warning' : 'normal'}>
              {advice.status.pendingTaskCount > 0 ? `今天有 ${advice.status.pendingTaskCount} 项待处理` : '今天暂无必须处理'}
            </TagPill>
            <TagPill tone="muted">{advice.sourceLabel}</TagPill>
          </div>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/85 shadow-sm">
          <Icon className="h-7 w-7" />
        </div>
      </div>

      <div className="mt-4 rounded-[16px] bg-white/75 p-3">
        <div className="grid gap-3 md:grid-cols-[1fr_140px]">
          <div className="min-w-0">
            <div className="text-[11px] font-black text-ink/45">今日优先任务</div>
            <h3 className="mt-1 text-[17px] font-black leading-snug text-ink [text-wrap:pretty]">
              {task ? task.title : '今天保持常规观察'}
            </h3>
            <p className="mt-2 text-[12px] font-bold leading-relaxed text-ink/65">
              {task ? task.reason : '当前没有来自养护记录的必须处理任务。'}
            </p>
            {task && (
              <p className="mt-1 text-[11px] font-bold leading-relaxed text-ink/45">
                依据：{task.evidence}
              </p>
            )}
          </div>
          <div className="rounded-[14px] border border-ink/8 bg-white px-3 py-2 text-[11px] font-bold text-ink/55">
            <div className="text-[10px] font-black text-ink/35">参考鱼缸</div>
            <div className="mt-1 font-black text-ink">{advice.referenceTank.name}</div>
            <div className="mt-1">{advice.referenceTank.waterType}</div>
            <div>{advice.referenceTank.temperature}</div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {advice.statusItems.map(item => (
          <div key={item.title} className="min-w-0 rounded-[14px] bg-white/70 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-black text-ink/45">{item.title}</div>
              <TagPill tone={item.tone}>{item.tone === 'normal' ? '已记录' : item.tone === 'danger' || item.tone === 'warning' ? '需处理' : '需确认'}</TagPill>
            </div>
            <div className="mt-1 text-[12px] font-black leading-snug text-ink [overflow-wrap:anywhere]">{item.value}</div>
            {item.note && <div className="mt-1 text-[10px] font-bold leading-snug text-ink/45">{item.note}</div>}
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-[14px] bg-white/65 p-3">
        <button
          type="button"
          onClick={() => onAction('toggle_steps')}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="flex items-center gap-2 text-[12px] font-black text-ink">
            <ClipboardList className="h-4 w-4 text-emerald-700" />
            为什么建议今天处理？
          </span>
          <span className="text-[11px] font-black text-ink/45">{showDetails ? '收起步骤' : '查看完整步骤'}</span>
        </button>
        {showDetails && (
          <div className="mt-3 space-y-3">
            <div className="grid gap-2">
              {advice.reasoning.map(reason => (
                <div key={reason} className="rounded-[12px] bg-white px-3 py-2 text-[12px] font-bold leading-relaxed text-ink/65">
                  {reason}
                </div>
              ))}
            </div>
            {task && (
              <div className="rounded-[12px] border border-emerald-100 bg-emerald-50/70 p-3">
                <div className="text-[11px] font-black text-emerald-700">处理步骤</div>
                <ol className="mt-2 grid gap-2">
                  {task.steps.map((step, index) => (
                    <li key={step} className="flex gap-2 text-[12px] font-bold leading-relaxed text-ink/70">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-[10px] text-white">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-2 rounded-[10px] bg-white px-3 py-2 text-[11px] font-bold text-ink/55">
                  {task.observationNote}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button
          type="button"
          onClick={() => onAction('start')}
          className="h-10 rounded-full bg-emerald-700 px-2 text-[12px] font-black text-white shadow-none hover:bg-emerald-800"
        >
          {primaryButtonLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!canCompleteTask}
          onClick={() => onAction('complete')}
          className="h-10 rounded-full border-ink/10 bg-white px-2 text-[12px] font-black text-ink/70 disabled:opacity-45"
        >
          标记完成
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!canCompleteTask}
          onClick={() => onAction('snooze')}
          className="h-10 rounded-full border-ink/10 bg-white px-2 text-[12px] font-black text-ink/70 disabled:opacity-45"
        >
          推迟一天
        </Button>
      </div>

      <div className="mt-3 rounded-[14px] border border-ink/6 bg-white/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[12px] font-black text-ink">
            <Bot className="h-4 w-4 text-emerald-700" />
            问问 AquaGuide
          </div>
          <div className="text-[10px] font-black text-ink/35">只解释今日建议</div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {quickQuestions.map(question => (
            <button
              key={question}
              type="button"
              onClick={() => onAskAI(question)}
              className="rounded-full bg-bg px-3 py-1.5 text-[10px] font-black text-ink/58 hover:bg-emerald-50 hover:text-emerald-700"
            >
              {question}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={aiQuestion}
            onChange={event => onAiQuestionChange(event.target.value)}
            placeholder="针对今天的建议继续提问……"
            className="min-w-0 flex-1 rounded-full border border-ink/10 bg-white px-3 text-[12px] font-bold outline-none focus:border-emerald-200"
          />
          <Button
            type="button"
            disabled={isAiLoading || !aiQuestion.trim()}
            onClick={() => onAskAI(aiQuestion)}
            className="h-9 w-9 rounded-full bg-emerald-700 p-0 text-white shadow-none hover:bg-emerald-800 disabled:opacity-45"
          >
            {isAiLoading ? <Clock3 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        {(aiAnswer || aiError) && (
          <div className="mt-2 rounded-[12px] bg-bg px-3 py-2 text-[11px] font-bold leading-relaxed text-ink/62">
            {aiError || aiAnswer}
          </div>
        )}
      </div>
    </section>
  );
}
