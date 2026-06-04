import type { ReactNode } from 'react';

type ConfigSectionProps = {
  title: string;
  subtitle?: string;
  actionText?: string;
  onAction?: () => void;
  children: ReactNode;
};

export function ConfigSection({ title, subtitle, actionText, onAction, children }: ConfigSectionProps) {
  return (
    <section className="rounded-[16px] bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[14px] font-black leading-tight text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-ink/50">{subtitle}</p>}
        </div>
        {actionText && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="shrink-0 rounded-full bg-bg px-2.5 py-1 text-[11px] font-bold text-accent transition-colors hover:bg-accent-light"
          >
            {actionText}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
