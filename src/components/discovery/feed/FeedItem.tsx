"use client";

import Image from "next/image";
import Link from "next/link";
import { AppIcon } from "@/components/AppIcon";
import { SaveEventButton } from "@/components/SaveEventButton";
import { useHubOverlay } from "@/components/hub/HubOverlayProvider";
import { ParanoidCloseIcon, ParanoidMark } from "@/components/navigation/ParanoidIconSystem";
import type { DiscoveryAction, DiscoveryItem, DiscoveryItemKind } from "@/lib/discovery/types";

type FeedItemProps = {
  item: DiscoveryItem;
  onDismiss: (item: DiscoveryItem) => void;
  onOpen: () => void;
};

export const kindIcon: Record<DiscoveryItemKind, "calendar" | "venue" | "spark" | "store" | "compass" | "gallery"> = {
  event: "calendar",
  venue: "venue",
  promotion: "spark",
  product: "store",
  community: "compass",
  album: "gallery",
};

export function FeedItem({ item, onDismiss, onOpen }: FeedItemProps) {
  const { openHub } = useHubOverlay();
  const imageUrl = safeImageUrl(item.imageUrl);
  const showsSaveAction = item.kind === "event";
  const secondaryAction = showsSaveAction ? undefined : item.secondaryAction;
  const showsHubAction = !showsSaveAction && !secondaryAction;

  return (
    <article className="feed-item-enter mx-4 mb-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] sm:mx-0">
      <header className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--surface-secondary)] text-[var(--accent)]">
          <AppIcon name={kindIcon[item.kind]} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.72rem] font-black uppercase text-[var(--accent)]">{item.eyebrow}</p>
          <h3 className="truncate text-[0.95rem] font-black leading-5 text-[var(--foreground)]">{item.title}</h3>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(item)}
          title="Ocultar recomendação"
          aria-label={`Ocultar ${item.title}`}
          className="focus-ring pressable grid h-9 w-9 shrink-0 place-items-center text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        >
          <ParanoidCloseIcon className="h-3.5 w-3.5" />
        </button>
      </header>

      {imageUrl && (
        <FeedMediaLink item={item} imageUrl={imageUrl} onOpen={onOpen} />
      )}

      <div className="px-3.5 pb-3.5 pt-3">
        <div className="flex min-h-8 flex-wrap items-center gap-x-5 gap-y-1.5">
          {showsSaveAction && <SaveEventButton eventId={item.id} feed />}
          <FeedActionLink action={item.primaryAction} primary onOpen={onOpen} />
          {secondaryAction && <FeedActionLink action={secondaryAction} onOpen={onOpen} />}
          {showsHubAction && (
            <button
              type="button"
              onClick={openHub}
              aria-label={`Perguntar à Paranoid sobre ${item.title}`}
              className="focus-ring pressable ml-auto inline-flex min-h-8 items-center gap-1.5 text-xs font-black text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
              <ParanoidMark className="h-4 w-4" />
              Perguntar
            </button>
          )}
        </div>
        {item.reason && <p className="mt-2 text-[0.85rem] font-bold text-[var(--foreground-secondary)]">{item.reason}</p>}
        {item.description && <p className="mt-1.5 line-clamp-2 text-[0.85rem] leading-5 text-[var(--foreground-secondary)]">{item.description}</p>}
        {item.meta.length > 0 && <p className="mt-1.5 text-xs leading-4 text-[var(--foreground-muted)]">{item.meta.join(" · ")}</p>}
      </div>
    </article>
  );
}

export function FeedEventItem(props: FeedItemProps) {
  return <FeedItem {...props} />;
}

export function FeedVenueItem(props: FeedItemProps) {
  return <FeedItem {...props} />;
}

export function FeedSignalItem(props: FeedItemProps) {
  return <FeedItem {...props} />;
}

function FeedMediaLink({ item, imageUrl, onOpen }: { item: DiscoveryItem; imageUrl: string; onOpen: () => void }) {
  const media = (
    <Image
      src={imageUrl}
      alt={item.title}
      fill
      unoptimized
      sizes="(max-width: 1023px) 100vw, 760px"
      className="object-cover transition-transform duration-300 motion-safe:hover:scale-[1.015]"
    />
  );
  const className = "focus-ring relative block aspect-square w-full overflow-hidden bg-[var(--surface-secondary)]";
  if (item.primaryAction.external) return <a href={item.primaryAction.href} target="_blank" rel="noreferrer" onClick={onOpen} className={className}>{media}</a>;
  return <Link href={item.primaryAction.href} onClick={onOpen} className={className}>{media}</Link>;
}

function FeedActionLink({ action, onOpen, primary = false }: { action: DiscoveryAction; onOpen: () => void; primary?: boolean }) {
  const className = `focus-ring pressable inline-flex min-h-8 items-center text-xs font-black ${
    primary ? "text-[var(--accent)] hover:text-[var(--accent-hover)]" : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
  }`;
  if (action.external) return <a href={action.href} target="_blank" rel="noreferrer" onClick={onOpen} className={className}>{action.label}</a>;
  return <Link href={action.href} onClick={onOpen} className={className}>{action.label}</Link>;
}

function safeImageUrl(value: string | null) {
  if (!value) return null;
  if (value.startsWith("/") || /^https?:\/\//i.test(value)) return value;
  return null;
}
