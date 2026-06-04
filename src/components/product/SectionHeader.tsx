type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionText?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, subtitle, actionText, onAction }: SectionHeaderProps) {
  return (
    <div className="flex min-w-0 items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-black leading-tight text-ink">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-ink/50">{subtitle}</p>
        )}
      </div>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-bold text-ink/62 transition-colors hover:border-accent hover:text-accent"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
