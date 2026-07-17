"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { FeedEventItem, FeedItem, FeedSignalItem, FeedVenueItem } from "@/components/discovery/feed/FeedItem";
import type { DiscoveryAction, DiscoveryItem, DiscoveryLocation, DiscoveryResponse } from "@/lib/discovery/types";
import type { HubConversationContext, HubHistoryItem } from "@/lib/hub/types";

const manualLocationKey = "paranoid.map.manualLocation";

type DiscoveryFeedProps = {
  history: HubHistoryItem[];
  standalone?: boolean;
  variant?: "compact" | "immersive";
};

function readManualLocation(): DiscoveryLocation | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(manualLocationKey) || "null") as Record<string, unknown> | null;
    if (!value || value.source !== "manual" || typeof value.latitude !== "number" || typeof value.longitude !== "number") return null;
    if (!Number.isFinite(value.latitude) || !Number.isFinite(value.longitude) || Math.abs(value.latitude) > 90 || Math.abs(value.longitude) > 180) return null;
    return {
      latitude: value.latitude,
      longitude: value.longitude,
      label: typeof value.label === "string" ? value.label.slice(0, 120) : undefined,
      source: "manual",
    };
  } catch {
    return null;
  }
}

function isDiscoveryResponse(value: unknown): value is DiscoveryResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<DiscoveryResponse>;
  return typeof response.heading === "string" && typeof response.summary === "string" && Array.isArray(response.items) && Array.isArray(response.signals);
}

function safeImageUrl(value: string | null) {
  if (!value) return null;
  if (value.startsWith("/") || /^https?:\/\//i.test(value)) return value;
  return null;
}

function sendInteraction(item: DiscoveryItem, action: "open" | "dismiss", intent: string) {
  void fetch("/api/discovery/interactions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ itemType: item.kind, itemId: item.id, action, intent }),
    keepalive: true,
  }).catch(() => undefined);
}

export function DiscoveryFeed({ history, standalone = false, variant = "compact" }: DiscoveryFeedProps) {
  const [location] = useState<DiscoveryLocation | null>(() => typeof window === "undefined" ? null : readManualLocation());
  const [response, setResponse] = useState<DiscoveryResponse | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [resolvedRequestKey, setResolvedRequestKey] = useState("");
  const [requestError, setRequestError] = useState<{ key: string; message: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const latest = history.at(-1);
  const context = useMemo(() => history.reduce<HubConversationContext>((current, item) => ({ ...current, ...(item.response.context || {}) }), {}), [history]);
  const requestKey = JSON.stringify({ query: latest?.query || "", intent: latest?.response.intent, context, location, refreshKey });
  const loading = resolvedRequestKey !== requestKey;
  const error = requestError?.key === requestKey ? requestError.message : "";

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/discovery", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: requestKey,
      signal: controller.signal,
    }).then(async (request) => {
      const payload = await request.json().catch(() => ({}));
      if (!request.ok || !isDiscoveryResponse(payload)) throw new Error("Não foi possível atualizar o feed.");
      setResponse(payload);
      setRequestError(null);
    }).catch((requestError: unknown) => {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      setRequestError({ key: requestKey, message: requestError instanceof Error ? requestError.message : "Não foi possível atualizar o feed." });
    }).finally(() => {
      if (!controller.signal.aborted) setResolvedRequestKey(requestKey);
    });
    return () => controller.abort();
  }, [requestKey]);

  const visibleItems = (response?.items || []).filter((item) => !dismissed.has(`${item.kind}:${item.id}`));

  function dismiss(item: DiscoveryItem) {
    setDismissed((current) => new Set(current).add(`${item.kind}:${item.id}`));
    sendInteraction(item, "dismiss", latest?.response.intent || "general");
  }

  return (
    <section className={`content-transition pb-3 ${variant === "immersive" ? "pt-5 sm:px-6" : ""}`} aria-labelledby={standalone ? "standalone-discovery-title" : "discovery-title"} aria-busy={loading}>
      <header className={`flex items-end justify-between gap-4 ${variant === "immersive" ? "px-4 sm:px-0" : ""}`}>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-red-600">Para ti agora</p>
          <h2 id={standalone ? "standalone-discovery-title" : "discovery-title"} className="mt-1 text-xl font-black text-[var(--foreground)] sm:text-2xl">
            {response?.heading || "A preparar possibilidades"}
          </h2>
        </div>
        {loading && response && <span className="shrink-0 text-xs text-[var(--foreground-muted)]">A ajustar</span>}
      </header>

      {response && response.items.length > 0 && <p className={`mt-2 max-w-2xl text-sm leading-6 text-[var(--foreground-muted)] ${variant === "immersive" ? "px-4 sm:px-0" : ""}`}>{response.summary}</p>}
      {response && response.signals.length > 0 && (
        <p className={`mt-2 text-xs text-[var(--foreground-muted)] ${variant === "immersive" ? "px-4 sm:px-0" : ""}`}>Com base em {response.signals.join(" · ")}.</p>
      )}

      {error && !response && (
        <div className={`mt-6 border-l-2 border-red-600 pl-4 ${variant === "immersive" ? "mr-4" : ""}`} role="alert">
          <p className="text-sm text-[var(--foreground-secondary)]">{error}</p>
          <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="pressable focus-ring mt-2 rounded py-1 text-xs font-black text-red-600 hover:text-red-500">Tentar novamente</button>
        </div>
      )}

      {loading && !response && <DiscoveryFeedSkeleton variant={variant} />}

      {!loading && response && visibleItems.length === 0 && (
        <div className={`mt-7 border-y border-[var(--border)] py-7 ${variant === "immersive" ? "px-4 sm:px-0" : ""}`}>
          <p className="text-sm leading-6 text-[var(--foreground-secondary)]">Ainda não há conteúdo publicado para este contexto.</p>
          <div className="mt-3 flex flex-wrap gap-5">
            <Link href="/agenda" className="pressable focus-ring rounded py-1 text-xs font-black text-red-600">Abrir Agenda</Link>
            <Link href="/mapa" className="pressable focus-ring rounded py-1 text-xs font-black text-[var(--foreground-secondary)]">Abrir Mapa</Link>
          </div>
        </div>
      )}

      {visibleItems.length > 0 && (
        <div className={variant === "immersive" ? "mt-4" : "mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]"}>
          {visibleItems.map((item) => variant === "immersive"
            ? <ImmersiveDiscoveryFeedItem key={`${item.kind}:${item.id}`} item={item} intent={latest?.response.intent || "general"} onDismiss={dismiss} />
            : <DiscoveryFeedItem key={`${item.kind}:${item.id}`} item={item} intent={latest?.response.intent || "general"} onDismiss={dismiss} />)}
        </div>
      )}

      {error && response && (
        <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className={`pressable focus-ring mt-4 rounded py-1 text-xs font-bold text-[var(--foreground-muted)] hover:text-[var(--foreground)] ${variant === "immersive" ? "ml-4 sm:ml-0" : ""}`}>Atualizar novamente</button>
      )}
    </section>
  );
}

function ImmersiveDiscoveryFeedItem({ item, intent, onDismiss }: { item: DiscoveryItem; intent: string; onDismiss: (item: DiscoveryItem) => void }) {
  const props = { item, onDismiss, onOpen: () => sendInteraction(item, "open", intent) };
  if (item.kind === "event") return <FeedEventItem {...props} />;
  if (item.kind === "venue") return <FeedVenueItem {...props} />;
  if (item.kind === "promotion" || item.kind === "community") return <FeedSignalItem {...props} />;
  return <FeedItem {...props} />;
}

function DiscoveryFeedItem({ item, intent, onDismiss }: { item: DiscoveryItem; intent: string; onDismiss: (item: DiscoveryItem) => void }) {
  const imageUrl = safeImageUrl(item.imageUrl);
  const open = () => sendInteraction(item, "open", intent);
  return (
    <article className={`relative grid gap-4 py-5 pr-9 sm:gap-6 sm:py-6 ${imageUrl ? "grid-cols-[7rem_minmax(0,1fr)] sm:grid-cols-[12rem_minmax(0,1fr)]" : "grid-cols-1"}`}>
      <button type="button" onClick={() => onDismiss(item)} title="Ocultar recomendação" aria-label={`Ocultar ${item.title}`} className="pressable focus-ring absolute right-0 top-4 grid h-8 w-8 place-items-center rounded text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
        <AppIcon name="close" className="h-4 w-4" />
      </button>
      {imageUrl && (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-[var(--surface-secondary)]">
          <Image src={imageUrl} alt="" fill unoptimized sizes="(max-width: 639px) 112px, 192px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0 self-center">
        <p className="text-[11px] font-black uppercase text-red-600">{item.eyebrow}</p>
        <h3 className="mt-1 pr-1 text-base font-black leading-6 text-[var(--foreground)] sm:text-lg">{item.title}</h3>
        {item.reason && <p className="mt-1 text-xs font-bold text-[var(--foreground-secondary)]">{item.reason}</p>}
        {item.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--foreground-muted)]">{item.description}</p>}
        {item.meta.length > 0 && <p className="mt-2 text-xs leading-5 text-[var(--foreground-muted)]">{item.meta.join(" · ")}</p>}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          <DiscoveryActionLink action={item.primaryAction} primary onOpen={open} />
          {item.secondaryAction && <DiscoveryActionLink action={item.secondaryAction} onOpen={open} />}
        </div>
      </div>
    </article>
  );
}

function DiscoveryActionLink({ action, primary = false, onOpen }: { action: DiscoveryAction; primary?: boolean; onOpen: () => void }) {
  const className = `pressable focus-ring inline-flex min-h-8 items-center gap-0.5 rounded text-xs font-black ${primary ? "text-red-600 hover:text-red-500" : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"}`;
  const content = <>{action.label}<AppIcon name="chevron" className="h-3 w-3" /></>;
  if (action.external) return <a href={action.href} target="_blank" rel="noreferrer" onClick={onOpen} className={className}>{content}</a>;
  return <Link href={action.href} onClick={onOpen} className={className}>{content}</Link>;
}

function DiscoveryFeedSkeleton({ variant = "compact" }: { variant?: "compact" | "immersive" }) {
  if (variant === "immersive") {
    return (
      <div className="mt-5" aria-hidden="true">
        {[0, 1].map((item) => (
          <div key={item} className="border-b border-[var(--border)] pb-7 pt-4">
            <div className="mx-4 h-3 w-20 animate-pulse rounded bg-[var(--surface-secondary)]" />
            <div className="mx-4 mt-3 h-5 w-2/3 animate-pulse rounded bg-[var(--surface-secondary)]" />
            <div className="mt-4 aspect-[4/3] w-full animate-pulse bg-[var(--surface-secondary)]" />
            <div className="mx-4 mt-4 h-3 w-4/5 animate-pulse rounded bg-[var(--surface-secondary)]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 py-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6 sm:py-6">
          <div className="aspect-[4/3] animate-pulse rounded-md bg-[var(--surface-secondary)]" />
          <div className="self-center">
            <div className="h-3 w-20 animate-pulse rounded bg-[var(--surface-secondary)]" />
            <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-[var(--surface-secondary)]" />
            <div className="mt-3 h-3 w-full animate-pulse rounded bg-[var(--surface-secondary)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
