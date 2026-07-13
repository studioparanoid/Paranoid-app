export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3" aria-label="A carregar">{Array.from({ length: rows }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded bg-zinc-950" />)}</div>;
}
