type SectionHeaderProps = { title: string; meta?: string; action?: React.ReactNode };

export function SectionHeader({ title, meta, action }: SectionHeaderProps) {
  return <div className="mb-3 flex items-center justify-between gap-4">
    <div><h2 className="text-xs font-black uppercase tracking-[0.24em] text-foreground-muted">{title}</h2>{meta && <p className="mt-1 text-xs text-foreground-muted">{meta}</p>}</div>
    {action}
  </div>;
}
