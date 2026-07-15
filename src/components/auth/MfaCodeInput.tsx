"use client";

export function MfaCodeInput({ value, onChange, disabled, autoFocus = false }: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <input
      id="mfa-code"
      name="mfa-code"
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
      onPaste={(event) => {
        const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (digits) {
          event.preventDefault();
          onChange(digits);
        }
      }}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      autoFocus={autoFocus}
      disabled={disabled}
      aria-describedby="mfa-code-help"
      className="h-14 w-full rounded border border-[var(--input-border)] bg-[var(--input-background)] px-4 text-center font-mono text-2xl font-black tracking-[0.35em] outline-none focus:border-red-700 disabled:opacity-50"
    />
  );
}
