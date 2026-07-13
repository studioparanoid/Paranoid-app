export type QuickDateValue = "today" | "7d" | "30d" | "custom";

const options: Array<{ value: QuickDateValue; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "Mês" },
  { value: "custom", label: "Data" },
];

export function DateQuickFilters({ value, onChange }: { value: QuickDateValue; onChange: (value: QuickDateValue) => void }) {
  return <div className="grid grid-cols-4 rounded border border-zinc-800 bg-black p-1" aria-label="Filtro de data">{options.map((option) => <button key={option.value} type="button" onClick={() => onChange(option.value)} aria-pressed={value === option.value} className={`min-h-10 rounded px-2 text-xs font-black transition ${value === option.value ? "bg-[#f2f1ec] text-black" : "text-zinc-500 hover:text-zinc-200"}`}>{option.label}</button>)}</div>;
}
