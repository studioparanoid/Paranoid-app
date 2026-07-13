import type { ReactNode } from "react";

export function CardGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 gap-x-4 gap-y-7 md:grid-cols-2 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-9 ${className}`}>{children}</div>;
}
