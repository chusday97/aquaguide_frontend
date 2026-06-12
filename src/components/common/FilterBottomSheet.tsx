import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type FilterSheetOption = {
  label: string;
  hint?: string;
};

export type FilterSheetGroup = {
  title: string;
  options: FilterSheetOption[];
  selected: string | null;
  onSelect: (label: string) => void;
};

type FilterBottomSheetProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  groups: FilterSheetGroup[];
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
};

export function FilterBottomSheet({
  open,
  title,
  subtitle,
  groups,
  onClose,
  onReset,
  onApply,
}: FilterBottomSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-ink/28 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-sm">
      <button type="button" aria-label="关闭筛选" className="absolute inset-0" onClick={onClose} />
      <section className="relative z-[121] flex max-h-[82vh] w-full max-w-[430px] md:max-w-[600px] flex-col overflow-hidden rounded-t-[26px] border border-white/80 bg-white shadow-[0_-20px_60px_rgba(15,23,42,0.18)]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[16px] font-black text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11px] font-bold leading-relaxed text-ink/45">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg text-ink/45"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="app-scrollbar-hidden min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">
          <div className="grid gap-4">
            {groups.map(group => (
              <section key={group.title} className="grid gap-2">
                <div className="text-[12px] font-black text-ink/70">{group.title}</div>
                <div className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-3">
                  {group.options.map(option => {
                    const selected = group.selected === option.label || (!group.selected && option.label === '全部');
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => group.onSelect(option.label)}
                        className={`min-h-10 rounded-[14px] border px-2.5 py-2 text-left transition-colors ${
                          selected
                            ? 'border-emerald-700 bg-emerald-700 text-white'
                            : 'border-border bg-bg/60 text-ink/64 hover:border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        <div className="whitespace-nowrap text-[12px] font-black leading-tight">{option.label}</div>
                        {option.hint && <div className={`mt-0.5 line-clamp-1 text-[9px] font-bold ${selected ? 'text-white/72' : 'text-ink/38'}`}>{option.hint}</div>}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-border/70 bg-white px-4 py-3">
          <Button type="button" variant="outline" onClick={onReset} className="h-10 flex-1 rounded-full text-[13px] font-black">
            重置
          </Button>
          <Button type="button" onClick={onApply} className="h-10 flex-[1.4] rounded-full bg-emerald-700 text-[13px] font-black text-white hover:bg-emerald-800">
            应用筛选
          </Button>
        </div>
      </section>
    </div>
  );
}
