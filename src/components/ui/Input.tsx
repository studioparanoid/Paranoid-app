import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

function join(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

function fieldClassName(error: boolean | undefined, className: string | undefined) {
  return join(
    "focus-ring w-full rounded-md border bg-input px-3.5 py-2.5 text-sm text-foreground placeholder:text-input-placeholder disabled:cursor-not-allowed disabled:opacity-50",
    error ? "border-danger" : "border-input-border",
    className
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { error?: boolean };

export function Input({ error, className, ...props }: InputProps) {
  return <input className={fieldClassName(error, className)} aria-invalid={error || undefined} {...props} />;
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean };

export function Textarea({ error, className, ...props }: TextareaProps) {
  return <textarea className={fieldClassName(error, className)} aria-invalid={error || undefined} {...props} />;
}
