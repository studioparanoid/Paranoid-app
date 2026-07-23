export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3 fade-in" role="status" aria-label="A carregar"><span className="sr-only">A carregar...</span>{Array.from({ length: rows }).map((_, index) => <div key={index} className="skeleton-shimmer h-16 rounded" />)}</div>;
}

export function EventCardSkeleton({ rows = 4 }: { rows?: number }) {
  return <div className="grid grid-cols-1 gap-x-4 gap-y-7 md:grid-cols-2 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-9" role="status" aria-label="A carregar eventos"><span className="sr-only">A carregar eventos...</span>{Array.from({ length: rows }).map((_, index) => <div key={index} className="overflow-hidden rounded-lg border border-[var(--border)]"><div className="skeleton-shimmer aspect-[4/5]" /><div className="space-y-3 p-4"><div className="skeleton-shimmer h-5 w-4/5 rounded" /><div className="skeleton-shimmer h-3 w-2/3 rounded" /><div className="skeleton-shimmer h-3 w-1/2 rounded" /></div></div>)}</div>;
}

export function ProductCardSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="grid grid-cols-1 gap-x-4 gap-y-7 md:grid-cols-2 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-9" role="status" aria-label="A carregar produtos"><span className="sr-only">A carregar produtos...</span>{Array.from({ length: rows }).map((_, index) => <div key={index} className="overflow-hidden rounded-lg border border-[var(--border)]"><div className="skeleton-shimmer aspect-[4/5]" /><div className="space-y-3 p-4"><div className="skeleton-shimmer h-3 w-20 rounded" /><div className="skeleton-shimmer h-6 w-3/4 rounded" /></div></div>)}</div>;
}

export function TicketSkeleton() {
  return <LoadingSkeleton rows={3} />;
}

export function ProfileSkeleton() {
  return <div className="space-y-6" role="status" aria-label="A carregar perfil"><span className="sr-only">A carregar perfil...</span><div className="flex items-center gap-4"><div className="skeleton-shimmer h-16 w-16 shrink-0 rounded-full" /><div className="w-full space-y-3"><div className="skeleton-shimmer h-6 w-44 max-w-full rounded" /><div className="skeleton-shimmer h-3 w-64 max-w-full rounded" /></div></div><div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="skeleton-shimmer h-14 rounded" />)}</div></div>;
}

export function AdminListSkeleton() {
  return <LoadingSkeleton rows={6} />;
}

export function MapLoadingState() {
  return <div className="grid min-h-[520px] place-items-center bg-[var(--background)]" role="status"><div className="text-center"><div className="skeleton-shimmer mx-auto h-10 w-10 rounded-full" /><p className="mt-4 text-sm font-bold text-[var(--foreground-muted)]">A preparar o radar...</p></div></div>;
}
