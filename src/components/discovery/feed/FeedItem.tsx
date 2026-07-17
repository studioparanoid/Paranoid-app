"use client";

import Image from "next/image";
import Link from "next/link";
import { SaveEventButton } from "@/components/SaveEventButton";
import { useHubOverlay } from "@/components/hub/HubOverlayProvider";
import { ParanoidCloseIcon, ParanoidMark } from "@/components/navigation/ParanoidIconSystem";
import type { DiscoveryAction, DiscoveryItem } from "@/lib/discovery/types";

type FeedItemProps = {
  item: DiscoveryItem;
  onDismiss: (item: DiscoveryItem) => void;
  onOpen: () => void;
};

export function FeedItem({ item, onDismiss, onOpen }: FeedItemProps) {
  const { openHub } = useHubOverlay();
  const imageUrl = safeImageUrl(item.imageUrl);
  const showsSaveAction = item.kind === "event";
  const secondaryAction = showsSaveAction ? undefined : item.secondaryAction;
  const showsHubAction = !showsSaveAction && !secondaryAction;

  return (
    <article className="feed-item-enter relative border-b border-[var(--border)] pb-7 pt-5 last:border-b-0 sm:pb-9 sm:pt-7">
      <header className="flex items-start justify-between gap-4 px-4 sm:px-0">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-black uppercase text-red-600">{item.eyebrow}</p>
          <h3 className="mt-1 text-[1.05rem] font-black leading-6 text-[var(--foreground)] sm:text-xl">{item.title}</h3>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(item)}
          title="Ocultar recomendação"
          aria-label={`Ocultar ${item.title}`}
          className="focus-ring pressable grid h-10 w-10 shrink-0 place-items-center text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        >
          <ParanoidCloseIcon className="h-4 w-4" />
        </button>
      </header>

      {imageUrl && (
        <FeedMediaLink item={item} imageUrl={imageUrl} onOpen={onOpen} />
      )}

      <div className="px-4 pt-4 sm:px-0">
        {item.reason && <p className="text-sm font-bold text-[var(--foreground-secondary)]">{item.reason}</p>}
        {item.description && <p className="mt-2 text-[0.94rem] leading-6 text-[var(--foreground-secondary)]">{item.description}</p>}
        {item.meta.length > 0 && <p className="mt-2 text-xs leading-5 text-[var(--foreground-muted)]">{item.meta.join(" · ")}</p>}
        <div className="mt-4 flex min-h-10 flex-wrap items-center gap-x-5 gap-y-1 border-t border-[var(--border)] pt-2">
          {showsSaveAction && <SaveEventButton eventId={item.id} feed />}
          <FeedActionLink action={item.primaryAction} primary onOpen={onOpen} />
          {secondaryAction && <FeedActionLink action={secondaryAction} onOpen={onOpen} />}
          {showsHubAction && (
            <button
              type="button"
              onClick={openHub}
              aria-label={`Perguntar à Paranoid sobre ${item.title}`}
              className="focus-ring pressable ml-auto inline-flex min-h-9 items-center gap-1.5 text-xs font-black text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
              <ParanoidMark className="h-4 w-4" />
              Perguntar
            </button>
          )}
        </div>
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
  const className = "focus-ring relative mt-3 block aspect-[4/3] w-full overflow-hidden bg-[var(--surface-secondary)] sm:rounded-sm";
  if (item.primaryAction.external) return <a href={item.primaryAction.href} target="_blank" rel="noreferrer" onClick={onOpen} className={className}>{media}</a>;
  return <Link href={item.primaryAction.href} onClick={onOpen} className={className}>{media}</Link>;
}

function FeedActionLink({ action, onOpen, primary = false }: { action: DiscoveryAction; onOpen: () => void; primary?: boolean }) {
  const className = `focus-ring pressable inline-flex min-h-9 items-center text-xs font-black ${
    primary ? "text-red-600 hover:text-red-500" : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
  }`;
  if (action.external) return <a href={action.href} target="_blank" rel="noreferrer" onClick={onOpen} className={className}>{action.label}</a>;
  return <Link href={action.href} onClick={onOpen} className={className}>{action.label}</Link>;
}

function safeImageUrl(value: string | null) {
  if (!value) return null;
  if (value.startsWith("/") || /^https?:\/\//i.test(value)) return value;
  return null;
}
