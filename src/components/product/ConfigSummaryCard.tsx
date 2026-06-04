type ConfigSummaryItem = {
  label: string;
  value: string;
};

type ConfigSummaryCardProps = {
  title?: string;
  items: ConfigSummaryItem[];
  note?: string;
};

export function ConfigSummaryCard({ title = '当前配置预览', items, note }: ConfigSummaryCardProps) {
  return (
    <div className="rounded-[16px] border border-sky-100 bg-sky-50/70 p-3">
      <div className="mb-2 text-[12px] font-black text-sky-800">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <span key={`${item.label}-${item.value}`} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-ink/70">
            <span className="text-ink/42">{item.label}</span> {item.value}
          </span>
        ))}
      </div>
      {note && <p className="mt-2 text-[11px] font-medium leading-relaxed text-sky-900/70">{note}</p>}
    </div>
  );
}
