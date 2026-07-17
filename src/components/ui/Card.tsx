import type { HTMLAttributes, ReactNode } from "react";

function join(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  interactive?: boolean;
};

export function Card({ children, interactive = false, className, ...props }: CardProps) {
  return (
    <div
      className={join(
        "rounded-lg border border-border bg-card",
        interactive && "card-hover pressable focus-ring",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
