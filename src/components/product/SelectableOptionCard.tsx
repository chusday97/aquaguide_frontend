import type { ReactNode } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

type SelectableOptionCardProps = {
  label: string;
  description?: string;
  selected?: boolean;
  disabled?: boolean;
  mode?: 'single' | 'multi';
  visual?: ReactNode;
  onClick?: () => void;
};

export function SelectableOptionCard({
  label,
  description,
  selected = false,
  disabled = false,
  mode = 'single',
  visual,
  onClick,
}: SelectableOptionCardProps) {
  const Marker = selected ? CheckCircle2 : Circle;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-[58px] items-center gap-2 rounded-[14px] border px-2.5 py-2 text-left transition-colors ${
        selected
          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
          : 'border-transparent bg-bg/70 text-ink hover:border-emerald-200 hover:bg-white'
      } ${disabled ? 'cursor-not-allowed opacity-45 hover:border-transparent hover:bg-bg/70' : ''}`}
    >
      {visual && <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white">{visual}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-black leading-tight">{label}</span>
        {description && <span className="mt-0.5 block line-clamp-2 text-[10px] font-medium leading-relaxed text-ink/48">{description}</span>}
      </span>
      <Marker className={`h-4 w-4 shrink-0 ${selected ? 'text-emerald-600' : mode === 'multi' ? 'text-ink/20' : 'text-ink/16'}`} />
    </button>
  );
}
