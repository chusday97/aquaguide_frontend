import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, HelpCircle, ImageOff, Loader2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { VisualResultStatus, VisualResultSubject, VisualResultViewModel } from './visual-result.types';

const statusPresentation: Record<VisualResultStatus, { tone: string; line: string; icon: typeof CheckCircle2 }> = {
  compatible: { tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', line: '#16a36a', icon: CheckCircle2 },
  routine: { tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', line: '#16a36a', icon: CheckCircle2 },
  caution: { tone: 'border-amber-200 bg-amber-50 text-amber-700', line: '#d97706', icon: AlertTriangle },
  watch: { tone: 'border-amber-200 bg-amber-50 text-amber-700', line: '#d97706', icon: AlertTriangle },
  not_recommended: { tone: 'border-red-200 bg-red-50 text-red-700', line: '#ef4444', icon: XCircle },
  urgent: { tone: 'border-red-200 bg-red-50 text-red-700', line: '#ef4444', icon: XCircle },
  insufficient_data: { tone: 'border-sky-200 bg-sky-50 text-sky-700', line: '#0284c7', icon: HelpCircle },
};

function HighlightedText({ text, emphasis }: { text: string; emphasis: string[] }) {
  const tokens = useMemo(() => emphasis.filter(item => item && text.includes(item)).sort((a, b) => b.length - a.length), [emphasis, text]);
  if (tokens.length === 0) return <>{text}</>;
  const output: Array<{ text: string; highlighted: boolean }> = [];
  let cursor = 0;
  while (cursor < text.length) {
    const next = tokens
      .map(token => ({ token, index: text.indexOf(token, cursor) }))
      .filter(item => item.index >= 0)
      .sort((a, b) => a.index - b.index || b.token.length - a.token.length)[0];
    if (!next) {
      output.push({ text: text.slice(cursor), highlighted: false });
      break;
    }
    if (next.index > cursor) output.push({ text: text.slice(cursor, next.index), highlighted: false });
    output.push({ text: next.token, highlighted: true });
    cursor = next.index + next.token.length;
  }
  return <>{output.map((item, index) => item.highlighted
    ? <strong key={`${item.text}-${index}`} className="font-black text-current underline decoration-current/25 decoration-2 underline-offset-2">{item.text}</strong>
    : <span key={`${item.text}-${index}`}>{item.text}</span>)}</>;
}

function SubjectImage({ subject, large = false }: { subject: VisualResultSubject; large?: boolean }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(Boolean(subject.image));
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setLoading(Boolean(subject.image));
    setFailed(false);
  }, [subject.image]);
  const meta = statusPresentation[subject.status];
  const Icon = meta.icon;
  return (
    <span className={`relative flex items-center justify-center overflow-hidden rounded-full bg-white ${large ? 'h-[138px] w-[190px]' : 'h-14 w-14'} border shadow-sm`} style={{ borderColor: meta.line }}>
      {loading && <Loader2 className="absolute h-5 w-5 animate-spin text-ink/20" aria-hidden="true" />}
      {subject.image && !failed ? (
        <img
          src={subject.image}
          alt={subject.name}
          loading={large ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setFailed(true); }}
          className={`${large ? 'h-[112px] w-[164px]' : 'h-11 w-11'} object-contain`}
        />
      ) : failed ? <ImageOff className="h-5 w-5 text-ink/30" role="img" aria-label={t('visualResult.imageUnavailable')} /> : <Icon className={`${large ? 'h-9 w-9' : 'h-5 w-5'} opacity-65`} aria-hidden="true" />}
    </span>
  );
}

function MiniSubjectImage({ subject }: { subject: VisualResultSubject }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const Icon = statusPresentation[subject.status].icon;
  useEffect(() => setFailed(false), [subject.image]);
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-bg" title={subject.name}>
      {subject.image && !failed
        ? <img src={subject.image} alt={subject.name} loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-6 w-6 object-contain" />
        : <Icon className="h-3.5 w-3.5 text-ink/35" role="img" aria-label={`${subject.name}：${t('visualResult.imageUnavailable')}`} />}
    </span>
  );
}

export function VisualResultCard({
  model,
  onPrimaryAction,
  onSubjectSelect,
  actionPending = false,
  className = '',
}: {
  model: VisualResultViewModel;
  onPrimaryAction: () => void;
  onSubjectSelect?: (subject: VisualResultSubject) => void;
  actionPending?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const [activeSubjectId, setActiveSubjectId] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const focus = model.subjects.find(subject => subject.role === 'focus') || model.subjects[0];
  const related = model.subjects.filter(subject => subject.id !== focus?.id);
  const visibleRelated = showAllSubjects ? related : related.slice(0, 3);
  const activeSubject = related.find(subject => subject.id === activeSubjectId);
  const meta = statusPresentation[model.status];
  const Icon = meta.icon;
  const conclusion = activeSubject?.shortReason || model.conclusion;
  const emphasis = activeSubject?.emphasis || model.emphasis;
  const detailCount = model.detailSections.reduce((sum, section) => sum + section.items.length, 0);

  useEffect(() => {
    setActiveSubjectId('');
    setDetailsOpen(false);
    setShowAllSubjects(false);
  }, [focus?.id, model.status]);

  const selectSubject = (subject: VisualResultSubject) => {
    setActiveSubjectId(subject.id);
    onSubjectSelect?.(subject);
  };

  return (
    <section className={`visual-result-card overflow-hidden rounded-[22px] border bg-white shadow-sm ${className}`} data-visual-result-status={model.status}>
      <div className="px-3.5 pb-3 pt-3.5 min-[500px]:px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-[0.08em] text-emerald-800/65">AquaGuide</div>
            <h3 className="mt-0.5 text-[19px] font-black leading-tight text-ink">{model.title}</h3>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-[10px] font-black ${meta.tone}`}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {t(`visualResult.status.${model.status}`)}
          </span>
        </div>
        <p className={`mt-2 line-clamp-2 text-[14px] font-bold leading-relaxed ${model.status === 'urgent' || model.status === 'not_recommended' ? 'text-red-800' : 'text-ink'}`} aria-live="polite">
          <HighlightedText text={conclusion} emphasis={emphasis} />
        </p>
      </div>

      <div className="visual-result-stage mx-3.5 mb-3 rounded-[20px] border border-emerald-100 bg-[#F3F7F4] min-[500px]:mx-4">
        <div className="visual-result-stage-label">{t('visualResult.relationshipTitle')}</div>
        {focus ? (
          <>
            <svg className="visual-result-connectors" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {visibleRelated.slice(0, 3).map((subject, index) => (
                <line key={subject.id} x1="48" y1="50" x2="78" y2={22 + index * 28} stroke={statusPresentation[subject.status].line} strokeWidth="1.3" strokeLinecap="round" />
              ))}
            </svg>
            <div className="visual-result-focus">
              <SubjectImage subject={focus} large />
              <span className="mt-2 max-w-[210px] truncate rounded-full bg-accent px-3 py-1.5 text-[11px] font-black text-white">{focus.name} · {focus.badgeLabel || t('visualResult.focus')}</span>
            </div>
            <div className="visual-result-related">
              {visibleRelated.map(subject => {
                const subjectMeta = statusPresentation[subject.status];
                const selected = activeSubjectId === subject.id;
                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => selectSubject(subject)}
                    aria-pressed={selected}
                    aria-label={`${subject.name}：${subject.badgeLabel || subject.shortReason}`}
                    className={`visual-result-subject min-h-11 rounded-[15px] p-1.5 text-center transition ${selected ? 'bg-white shadow-md ring-2 ring-emerald-400' : 'hover:bg-white/75 focus-visible:bg-white'}`}
                  >
                    <SubjectImage subject={subject} />
                    <span className="mt-1 block max-w-[92px] truncate text-[10px] font-black text-ink">{subject.name}</span>
                    <span className={`mt-1 inline-flex max-w-full truncate rounded-full border px-1.5 py-0.5 text-[8px] font-black ${subjectMeta.tone}`}>{subject.badgeLabel || t(`visualResult.status.${subject.status}`)}</span>
                  </button>
                );
              })}
              {related.length > 3 && (
                <button type="button" onClick={() => setShowAllSubjects(value => !value)} className="min-h-11 rounded-full px-3 text-[10px] font-black text-emerald-800 underline underline-offset-2">
                  {showAllSubjects ? t('visualResult.collapseSubjects') : t('visualResult.showAllSubjects', { count: related.length })}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex min-h-[190px] flex-col items-center justify-center px-6 text-center">
            <HelpCircle className="h-8 w-8 text-ink/25" />
            <div className="mt-2 text-[12px] font-black text-ink/55">{t('visualResult.noSubject')}</div>
          </div>
        )}
      </div>

      <div className="mx-3.5 mb-3 grid gap-2 min-[500px]:mx-4 min-[720px]:grid-cols-[1fr_220px]">
        <div className="rounded-[16px] border border-border bg-bg px-3 py-2.5">
          <div className="text-[10px] font-black text-emerald-800">{t('visualResult.doNow')}</div>
          <p className="mt-0.5 text-[12px] font-bold leading-relaxed text-ink">{model.currentAction}</p>
        </div>
        <button
          type="button"
          disabled={actionPending}
          data-action-type={model.primaryAction.actionType}
          onClick={onPrimaryAction}
          className="flex min-h-11 items-center justify-center rounded-[16px] bg-accent px-4 text-[12px] font-black text-white transition hover:bg-[#123e31] disabled:cursor-not-allowed disabled:bg-ink/20"
        >
          {actionPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {model.primaryAction.label}
        </button>
      </div>

      {detailCount > 0 && (
        <div className="mx-3.5 mb-3 overflow-hidden rounded-[16px] border border-border bg-white min-[500px]:mx-4">
          <button
            type="button"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen(value => !value)}
            className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-[11px] font-black text-ink/65"
          >
            <span>{detailsOpen ? t('visualResult.collapseDetails') : t('visualResult.expandDetails', { count: detailCount })}</span>
            <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${detailsOpen ? 'rotate-180' : ''}`} />
          </button>
          {detailsOpen && (
            <div className="grid gap-2 border-t border-border bg-bg/45 p-3 min-[640px]:grid-cols-2">
              {model.detailSections.map(section => (
                <section key={section.id} className="rounded-[13px] bg-white p-3">
                  <h4 className="text-[11px] font-black text-ink">{section.title}</h4>
                  <div className="mt-1.5 grid gap-1">
                    {section.items.map(item => <p key={item} className="text-[10px] font-medium leading-relaxed text-ink/62">{item}</p>)}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function VisualResultMini({
  status,
  subjects,
  summary,
  onOpen,
}: {
  status: VisualResultStatus;
  subjects: VisualResultSubject[];
  summary: string;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const meta = statusPresentation[status];
  const Icon = meta.icon;
  return (
    <div className="grid min-w-0 gap-2 min-[560px]:grid-cols-[1fr_auto] min-[560px]:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black ${meta.tone}`}><Icon className="h-3 w-3" />{t(`visualResult.status.${status}`)}</span>
          <div className="flex -space-x-2" aria-label={subjects.map(subject => subject.name).join('、')}>
            {subjects.slice(0, 4).map(subject => <MiniSubjectImage key={subject.id} subject={subject} />)}
          </div>
        </div>
        <p className="mt-1.5 line-clamp-1 text-[11px] font-bold text-ink/62">{summary}</p>
      </div>
      <button type="button" onClick={onOpen} className="min-h-10 rounded-full bg-emerald-700 px-4 text-[11px] font-black text-white">{t('visualResult.viewFull')}</button>
    </div>
  );
}
