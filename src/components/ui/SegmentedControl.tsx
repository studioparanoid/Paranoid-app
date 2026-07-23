"use client";

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  className = "",
}: {
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === value));

  return (
    <div
      className={`relative grid overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="group"
      aria-label={label}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1 top-1 rounded-md bg-[var(--foreground)] transition-transform duration-200 ease-out"
        style={{
          left: "0.25rem",
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={option.disabled}
            aria-pressed={active}
            className={`pressable focus-ring relative z-10 min-h-10 rounded px-2 text-xs font-black transition-colors ${active ? "text-[var(--background)]" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
