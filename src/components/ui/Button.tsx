import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg" | "icon";
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variants: Record<ButtonVariant, string> = {
  primary: "border border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]",
  secondary: "border border-[var(--border-strong)] bg-transparent text-current hover:border-[var(--foreground-muted)] hover:bg-white/10",
  danger: "border border-red-900 bg-red-950/35 text-red-200 hover:border-red-700 hover:bg-red-950/55",
  ghost: "border border-transparent bg-transparent text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-10 rounded-full px-4 py-2 text-xs",
  md: "min-h-11 rounded-full px-5 py-2.5 text-sm",
  lg: "min-h-12 rounded-full px-6 py-3 text-base",
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
    "interactive pressable focus-ring inline-flex shrink-0 items-center justify-center gap-2 font-black disabled:pointer-events-none disabled:opacity-45",
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
