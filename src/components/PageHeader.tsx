type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return <header className="subtle-enter relative flex flex-col gap-5 border-b border-[var(--border)] pb-8 after:absolute after:-bottom-px after:left-0 after:h-px after:w-14 after:bg-[var(--accent)] sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0 pb-1">
      {eyebrow && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">{eyebrow}</p>}
      <h1 className="text-5xl font-semibold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">{title}</h1>
      {description && <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground-muted">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </header>;
}
