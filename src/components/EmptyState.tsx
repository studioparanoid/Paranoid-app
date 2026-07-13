import { LinkButton } from "@/components/ui/Button";

export function EmptyState({ title, description, actionLabel, actionHref }: { title: string; description?: string; actionLabel?: string; actionHref?: string }) {
  return <div className="subtle-enter border-y border-zinc-900 py-10 text-center">
    <h2 className="text-xl font-black">{title}</h2>
    {description && <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">{description}</p>}
    {actionLabel && actionHref && <LinkButton href={actionHref} className="mt-5">{actionLabel}</LinkButton>}
  </div>;
}
