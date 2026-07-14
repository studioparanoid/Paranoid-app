"use client";

import { AppIcon } from "@/components/AppIcon";
import { useTheme, type PreferredTheme } from "@/components/theme/ThemeProvider";

const options: Array<{
  value: PreferredTheme;
  label: string;
  description: string;
  icon: "monitor" | "moon" | "sun";
}> = [
  { value: "system", label: "Automático", description: "Segue o tema do dispositivo.", icon: "monitor" },
  { value: "dark", label: "Escuro", description: "Identidade original Paranoid.", icon: "moon" },
  { value: "light", label: "Claro", description: "Leitura clara e editorial.", icon: "sun" },
];

export function themeLabel(theme: PreferredTheme) {
  if (theme === "system") return "Automático";
  if (theme === "light") return "Claro";
  return "Escuro";
}

export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const { preferredTheme, setTheme } = useTheme();

  return (
    <div role="radiogroup" aria-label="Tema" className={compact ? "grid gap-1" : "grid gap-2"}>
      {options.map((option) => {
        const selected = preferredTheme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(option.value)}
            className={`pressable focus-ring flex w-full items-center gap-3 rounded border text-left transition-colors ${compact ? "min-h-11 px-3 py-2" : "min-h-16 px-4 py-3"} ${selected ? "border-[var(--accent)] bg-[var(--surface-active)] text-[var(--foreground)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"}`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-[var(--surface-secondary)] text-[var(--foreground)]">
              <AppIcon name={option.icon} className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black">{option.label}</span>
              {!compact && <span className="mt-0.5 block text-xs text-[var(--foreground-muted)]">{option.description}</span>}
            </span>
            {selected && <AppIcon name="check" className="h-4 w-4 shrink-0 text-[var(--accent)]" />}
          </button>
        );
      })}
    </div>
  );
}
