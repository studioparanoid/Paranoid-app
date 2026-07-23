import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg" | "icon";
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variants: Record<ButtonVariant, string> = {
  primary: "shadow-button border border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] hover:border-[var(--accent-hover)]",
  secondary: "border border-[var(--border)] bg-transparent text-current hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]",
  danger: "border border-[var(--danger)]/35 bg-[var(--danger)]/10 text-[var(--danger)] hover:border-[var(--danger)]/60 hover:bg-[var(--danger)]/16",
  ghost: "border border-transparent bg-transparent text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-10 rounded-lg px-4 py-2 text-xs tracking-wide",
  md: "min-h-12 rounded-xl px-6 py-3 text-sm tracking-wide",
  lg: "min-h-14 rounded-xl px-8 py-4 text-base tracking-wide",
  icon: "h-11 w-11 rounded-full",
};

function join(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return join(
    "interactive pressable focus-ring inline-flex shrink-0 items-center justify-center gap-2 font-semibold disabled:pointer-events-none disabled:opacity-40",
    variants[variant],
    sizes[size],
    className
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClassName({ variant, size, className })} {...props} />;
}

export function LoadingButton({
  loading,
  loadingText = "A processar...",
  children,
  disabled,
  ...props
}: ButtonProps & {
  loading: boolean;
  loadingText?: string;
}) {
  return (
    <Button {...props} disabled={disabled || loading} aria-busy={loading}>
      <span className="grid place-items-center">
        <span className="invisible col-start-1 row-start-1">{children}</span>
        <span className="col-start-1 row-start-1">{loading ? loadingText : children}</span>
      </span>
    </Button>
  );
}

export function IconButton({
  label,
  tooltip,
  children,
  variant = "ghost",
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  label: string;
  tooltip?: string;
  children: ReactNode;
  variant?: ButtonVariant;
}) {
  return (
    <Button
      {...props}
      size="icon"
      variant={variant}
      aria-label={label}
      title={tooltip || label}
      className={className}
    >
      {children}
    </Button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link href={href} className={buttonClassName({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
