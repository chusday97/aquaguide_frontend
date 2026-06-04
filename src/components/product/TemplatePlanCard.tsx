import { TagPill } from './TagPill';

type TemplatePlanCardProps = {
  name: string;
  difficulty: '新手' | '进阶';
  bestFor: string;
  tankSize: string;
  maintenance: string;
  tagline: string;
  benefitTags: string[];
  imageUrls: string[];
  visualLabel: string;
  visualGradient: string;
  environmentSummary: string;
  layoutSummary: string;
  livestockSummary: string;
  selected?: boolean;
  onClick: () => void;
};

export function TemplatePlanCard({
  name,
  difficulty,
  bestFor,
  tankSize,
  maintenance,
  tagline,
  benefitTags,
  imageUrls,
  visualLabel,
  visualGradient,
  environmentSummary,
  layoutSummary,
  livestockSummary,
  selected = false,
  onClick,
}: TemplatePlanCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`overflow-hidden rounded-[18px] border p-2 text-left transition-colors ${
        selected
          ? 'border-emerald-300 bg-emerald-50 shadow-sm'
          : 'border-transparent bg-white shadow-sm hover:border-emerald-200'
      }`}
    >
      <div className="relative mb-2 aspect-[16/9] overflow-hidden rounded-[14px] bg-slate-100" style={{ background: visualGradient }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_22%,rgba(255,255,255,0.7),transparent_26%),linear-gradient(to_top,rgba(0,0,0,0.26),transparent_58%)]" />
        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
          <span className="rounded-full bg-white/82 px-2 py-0.5 text-[9px] font-black text-ink/62 backdrop-blur-sm">{visualLabel}</span>
          <span className="rounded-full bg-black/20 px-2 py-0.5 text-[9px] font-black text-white backdrop-blur-sm">{maintenance}</span>
        </div>
        <div className="absolute inset-x-3 top-4 flex items-end justify-center gap-1.5">
          {imageUrls.slice(0, 3).map((src, index) => (
            <span key={`${src}-${index}`} className="flex h-14 w-16 items-end justify-center rounded-full bg-white/18 backdrop-blur-[1px]">
              <img src={src} alt="" className="max-h-14 max-w-full object-contain drop-shadow-[0_10px_12px_rgba(0,0,0,0.18)]" referrerPolicy="no-referrer" />
            </span>
          ))}
        </div>
      </div>

      <div className="mb-2 flex items-start justify-between gap-2 px-1">
        <h3 className="min-w-0 text-[14px] font-black leading-tight text-ink">{name}</h3>
        <TagPill tone={difficulty === '新手' ? 'normal' : 'warning'}>{difficulty}</TagPill>
      </div>
      <div className="flex flex-wrap gap-1 px-1">
        {benefitTags.slice(0, 3).map(tag => (
          <span key={tag} className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-black text-emerald-700">
            {tag}
          </span>
        ))}
      </div>
      <p className="mt-2 line-clamp-2 px-1 text-[11px] font-medium leading-relaxed text-ink/55">{tagline}</p>
      <div className="mt-2 grid gap-1.5 rounded-[12px] bg-bg/70 px-2 py-2 text-[10px] font-bold leading-tight text-ink/55">
        <span>缸型：{bestFor}</span>
        <span>尺寸：{tankSize}</span>
        <span>环境：{environmentSummary}</span>
        <span>造景：{layoutSummary}</span>
        <span>生物：{livestockSummary}</span>
      </div>
    </button>
  );
}
