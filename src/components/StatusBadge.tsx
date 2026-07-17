export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const tones = {
    neutral: "border-[var(--border)] text-[var(--foreground-muted)]",
    success: "border-[var(--success)]/35 text-[var(--success)]",
    warning: "border-[var(--warning)]/35 text-[var(--warning)]",
    danger: "border-[var(--danger)]/35 text-[var(--danger)]",
  };
  return <span className={`interactive inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${tones[tone]}`}>{label}</span>;
}
