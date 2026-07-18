import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type FilterSheetOption = {
  label: string;
  /** Internal filter value. If provided, used for selection matching and onSelect; otherwise label is used. */
  value?: string;
  hint?: string;
  count?: number;
  disabled?: boolean;
  noMatchLabel?: string;
};

export type FilterSheetGroup = {
  title: string;
  options: FilterSheetOption[];
  selected: string | null;
  onSelect: (value: string) => void;
};

type FilterBottomSheetProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  groups: FilterSheetGroup[];
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
  resetLabel?: string;
  applyLabel?: string;
};

export function FilterBottomSheet({
  open,
  title,
  subtitle,
  groups,
  onClose,
  onReset,
  onApply,
  resetLabel = 'Reset',
  applyLabel = 'Apply Filters',
}: FilterBottomSheetProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(frame);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[180] flex items-end justify-center bg-ink/28 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] backdrop-blur-sm md:px-6 md:pb-[calc(24px+env(safe-area-inset-bottom))]">
      <button type="button" aria-label="Close filters" className="absolute inset-0" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[181] flex max-h-[82vh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[26px] border border-white/80 bg-white shadow-[0_-20px_60px_rgba(15,23,42,0.18)] md:max-w-[600px] md:rounded-[26px]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[16px] font-black text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11px] font-bold leading-relaxed text-ink/45">{subtitle}</p>}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg text-ink/45"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="app-scrollbar-hidden min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 pb-8">
          <div className="grid gap-4">
            {groups.map(group => (
              <section key={group.title} className="grid gap-2">
                <div className="text-[12px] font-black text-ink/70">{group.title}</div>
                <div className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-3">
                  {group.options.map(option => {
                    const optionValue = option.value ?? option.label;
                    const isAllOption = option.value === '全部' || option.label === 'All' || option.value === null;
                    const selected = group.selected === optionValue || (!group.selected && (optionValue === '全部' || isAllOption));
                    const disabled = Boolean(option.disabled && !selected && !isAllOption);
                    return (
                      <button
                        key={optionValue}
                        type="button"
                        onClick={() => group.onSelect(optionValue)}
                        disabled={disabled}
                        className={`min-h-10 rounded-[14px] border px-2.5 py-2 text-left transition-colors ${
                          selected
                            ? 'border-emerald-700 bg-emerald-700 text-white'
                            : disabled
                              ? 'cursor-not-allowed border-border/70 bg-bg/35 text-ink/26'
                              : 'border-border bg-bg/60 text-ink/64 hover:border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="min-w-0 truncate text-[12px] font-black leading-tight">{option.label}</span>
                          {typeof option.count === 'number' && (
                            <span className={`shrink-0 text-[9px] font-black ${selected ? 'text-white/70' : disabled ? 'text-ink/24' : 'text-ink/36'}`}>
                              {option.count}
                            </span>
                          )}
                        </div>
                        {(option.hint || disabled) && (
                          <div className={`mt-0.5 line-clamp-1 text-[9px] font-bold ${selected ? 'text-white/72' : disabled ? 'text-ink/24' : 'text-ink/38'}`}>
                            {disabled ? (option.noMatchLabel ?? 'No match') : option.hint}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="modalFooter flex shrink-0 gap-2 border-t border-border/70 bg-white">
          <Button type="button" variant="outline" onClick={onReset} className="h-10 flex-1 rounded-full text-[13px] font-black">
            {resetLabel}
          </Button>
          <Button type="button" onClick={onApply} className="h-10 flex-[1.4] rounded-full bg-emerald-700 text-[13px] font-black text-white hover:bg-emerald-800">
            {applyLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
