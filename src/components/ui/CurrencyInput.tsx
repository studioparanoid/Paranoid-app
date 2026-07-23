import type { InputHTMLAttributes } from "react";
import { formatDecimalInput, sanitizeDecimalInput } from "@/lib/inputFormatting";

type CurrencyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "value"> & {
  value: string;
  onChange: (value: string) => void;
};

export function CurrencyInput({ value, onChange, className = "", ...props }: CurrencyInputProps) {
  return (
    <div className="relative">
      <input
        {...props}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(sanitizeDecimalInput(event.target.value))}
        onBlur={(event) => {
          onChange(formatDecimalInput(event.currentTarget.value));
          props.onBlur?.(event);
        }}
        className={`${className} pr-12`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center font-semibold text-[var(--foreground-muted)]" aria-hidden="true">€</span>
    </div>
  );
}
