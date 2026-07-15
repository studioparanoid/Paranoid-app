type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return <header className="subtle-enter relative flex flex-col gap-4 border-b border-[var(--border)] pb-6 after:absolute after:-bottom-px after:left-0 after:h-px after:w-14 after:bg-red-600 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0 pb-1">
      {eyebrow && <p className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-red-600">{eyebrow}</p>}
      <h1 className="text-4xl font-black leading-none [text-shadow:0_1px_1px_rgb(0_0_0_/_0.12)] sm:text-5xl lg:text-6xl">{title}</h1>
      {description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </header>;
}
