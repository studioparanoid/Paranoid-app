export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const tones = { neutral: "border-zinc-800 text-zinc-500", success: "border-green-950 text-green-500", warning: "border-yellow-950 text-yellow-500", danger: "border-red-950 text-red-400" };
  return <span className={`interactive inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${tones[tone]}`}>{label}</span>;
}
