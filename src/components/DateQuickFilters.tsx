export type QuickDateValue = "today" | "7d" | "30d" | "custom";

const options: Array<{ value: QuickDateValue; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "Mês" },
  { value: "custom", label: "Data" },
];

export function DateQuickFilters({ value, onChange }: { value: QuickDateValue; onChange: (value: QuickDateValue) => void }) {
  return <SegmentedControl value={value} options={options} onChange={onChange} label="Filtro de data" />;
}
import { SegmentedControl } from "@/components/ui/SegmentedControl";
