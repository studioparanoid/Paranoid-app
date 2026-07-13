import Link from "next/link";

export function EmptyState({ title, description, actionLabel, actionHref }: { title: string; description?: string; actionLabel?: string; actionHref?: string }) {
  return <div className="border-y border-zinc-900 py-10 text-center">
    <h2 className="text-xl font-black">{title}</h2>
    {description && <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">{description}</p>}
    {actionLabel && actionHref && <Link href={actionHref} className="mt-5 inline-flex rounded-full bg-[#f2f1ec] px-5 py-3 text-sm font-black text-black">{actionLabel}</Link>}
  </div>;
}
