"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { HubGlobe, type HubGlobeState } from "@/components/home/HubGlobe";
import {
  clearHubHistory,
  HUB_HISTORY_LIMIT,
  readHubHistory,
  writeHubHistory,
} from "@/lib/hub/client-history";
import type { HubAction, HubHistoryItem, HubIntent, HubResponse } from "@/lib/hub/types";

const requestTimeoutMs = 10_000;
const minimumThinkingMs = 360;
const navigationTransitionMs = 850;
const genericErrorMessage = "O Hub falhou a responder. Tenta novamente.";
const timeoutErrorMessage = "Demorei demasiado a obter a informação. Tenta novamente.";
const directNavIntents = new Set<HubIntent>(["tickets", "shop", "map", "profile"]);
const directNavLabels: Partial<Record<HubIntent, string>> = { tickets: "Bilhetes", shop: "Loja", map: "Mapa", profile: "Perfil" };

function directNavAction(response: HubResponse): HubAction | null {
  if (!directNavIntents.has(response.intent)) return null;
  if (response.results.length > 0 || response.actions.length !== 1) return null;
  return response.actions[0];
}

function isHubResponse(value: unknown): value is HubResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<HubResponse>;
  return typeof response.title === "string" && typeof response.description === "string" && Array.isArray(response.results) && Array.isArray(response.actions);
}

function thinkingLabel(value: string) {
  const query = value.toLocaleLowerCase("pt-PT");
  if (/toca|programa|lineup|seguir/.test(query)) return "A consultar programação";
  if (/fome|sede|comer|jantar|almoçar|restaurante|bar/.test(query)) return "A verificar espaços";
  if (/mapa|onde fica|como chegar/.test(query)) return "A situar-te";
  if (/evento|concerto|festival|noite|sair|agenda/.test(query)) return "A procurar eventos";
  return "A pensar";
}

function resizeInput(input: HTMLTextAreaElement) {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
}

type SmartHubProps = {
  autoFocus?: boolean;
  discoveryMode?: boolean;
  discoveryFeed?: ReactNode;
  onHistoryChange?: (history: HubHistoryItem[]) => void;
  onResponse?: (response: HubResponse) => void;
  onBeforeNavigate?: () => void;
  instanceId?: string;
  overlayMode?: boolean;
};

export function SmartHub({
  autoFocus = true,
  discoveryMode = false,
  discoveryFeed,
  onHistoryChange,
  onResponse,
  onBeforeNavigate,
  instanceId = "main",
  overlayMode = false,
}: SmartHubProps = {}) {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<HubHistoryItem[]>([]);
  const [pendingQuery, setPendingQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [navigatingLabel, setNavigatingLabel] = useState("");
  const [pulse, setPulse] = useState(0);
  const [historyRestored, setHistoryRestored] = useState(false);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      setHistory(readHubHistory());
      setHistoryRestored(true);
    }, 0);
    const focusHub = () => {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      inputRef.current?.focus({ preventScroll: true });
    };
    const focusTimer = window.setTimeout(() => {
      if (autoFocus && (new URLSearchParams(window.location.search).get("focus") === "hub" || window.matchMedia("(pointer: fine)").matches)) focusHub();
    }, 100);
    window.addEventListener("paranoid:focus-hub", focusHub);
    return () => {
      window.clearTimeout(restoreTimer);
      window.clearTimeout(focusTimer);
      window.removeEventListener("paranoid:focus-hub", focusHub);
    };
  }, [autoFocus]);

  useEffect(() => {
    if (historyRestored) onHistoryChange?.(history);
  }, [history, historyRestored, onHistoryChange]);

  useEffect(() => {
    if (history.length === 0 && !loading) return;
    const frame = window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      conversationEndRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [history, loading, pendingQuery]);

  function appendHistory(item: HubHistoryItem) {
    const next = [...history, item].slice(-HUB_HISTORY_LIMIT);
    setHistory(next);
    writeHubHistory(next);
    setPulse((value) => value + 1);
  }

  async function runQuery(value: string) {
    const cleanQuery = value.trim();
    if (!cleanQuery || busyRef.current) return;
    const startedAt = window.performance.now();
    busyRef.current = true;
    setLoading(true);
    setPendingQuery(cleanQuery);
    setQuery("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), requestTimeoutMs);

    try {
      const context = history.reduce((current, item) => ({ ...current, ...(item.response.context || {}) }), {});
      const response = await fetch("/api/hub", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: cleanQuery, context }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(response.status === 504 ? timeoutErrorMessage : genericErrorMessage);
      if (!isHubResponse(payload)) throw new Error(genericErrorMessage);
      const remainingThinkingTime = minimumThinkingMs - (window.performance.now() - startedAt);
      if (remainingThinkingTime > 0) await new Promise((resolve) => window.setTimeout(resolve, remainingThinkingTime));

      const navigation = directNavAction(payload);
      if (navigation) {
        setNavigatingLabel(`A levar-te para ${directNavLabels[payload.intent] || navigation.label}...`);
        await new Promise((resolve) => window.setTimeout(resolve, navigationTransitionMs));
        onBeforeNavigate?.();
        router.push(navigation.href);
        return;
      }

      appendHistory({ id: crypto.randomUUID(), query: cleanQuery, response: payload });
      onResponse?.(payload);
    } catch (requestError) {
      const timedOut = requestError instanceof DOMException && requestError.name === "AbortError" || requestError instanceof Error && requestError.message === timeoutErrorMessage;
      if (process.env.NODE_ENV === "development") console.error("[hub] Falha no pedido", requestError);
      appendHistory({
        id: crypto.randomUUID(),
        query: cleanQuery,
        response: {
          intent: "unknown",
          title: timedOut ? "Demorei demasiado" : "Alguma coisa falhou aqui",
          description: "Tenta outra vez.",
          results: [],
          actions: [],
          context: history.reduce((current, item) => ({ ...current, ...(item.response.context || {}) }), {}),
        },
      });
    } finally {
      window.clearTimeout(timeout);
      busyRef.current = false;
      setLoading(false);
      setPendingQuery("");
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runQuery(query);
  }

  function handleInput(event: ChangeEvent<HTMLTextAreaElement>) {
    setQuery(event.target.value.slice(0, 240));
    resizeInput(event.target);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void runQuery(query);
    }
  }

  function clearHistory() {
    clearHubHistory();
    setHistory([]);
    setQuery("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    inputRef.current?.focus();
  }

  const visibleHistory = discoveryMode ? history.slice(-3) : history;
  const titleId = `hub-title-${instanceId}`;
  const inputId = `paranoid-hub-query-${instanceId}`;
  const showChatZone = history.length > 0 || Boolean(pendingQuery);
  const stageFillsHeight = !discoveryMode || !discoveryFeed;
  const globeState: HubGlobeState = navigatingLabel ? "navigating" : loading ? "thinking" : "idle";

  return (
    <section
      className={`brand-surface mx-auto flex h-full w-full flex-col bg-[var(--brand-surface)] ${overlayMode ? "max-w-none" : "max-w-[52rem]"}`}
      aria-labelledby={titleId}
    >
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 py-3 sm:py-4">
        <h1 id={titleId} className="sr-only">{discoveryMode ? "Paranoid" : "Paranoid Hub"}</h1>
        <span aria-hidden="true" />
        {history.length > 0 && (
          <button type="button" onClick={clearHistory} className="pressable focus-ring inline-flex min-h-9 items-center gap-1.5 rounded px-2 text-xs font-bold text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
            <AppIcon name="plus" className="h-3.5 w-3.5" />
            Nova conversa
          </button>
        )}
      </header>

      <div className="paranoid-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-live="polite">
        <div className={`relative overflow-hidden rounded-lg ${stageFillsHeight ? "h-full" : "h-[68vh] sm:h-[36rem]"}`}>
          <div className={`absolute inset-0 transition-transform duration-[900ms] ease-out ${navigatingLabel ? "scale-[1.35]" : "scale-100"}`}>
            <HubGlobe state={globeState} pulse={pulse} className="h-full w-full" />
          </div>

          {!showChatZone && (
            <div className="feed-item-enter absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-10 text-center sm:pb-14">
              <p className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">O que te apetece fazer?</p>
            </div>
          )}

          <div
            className={`absolute inset-x-0 bottom-0 flex h-[64%] flex-col overflow-hidden transition-transform duration-500 ease-out ${showChatZone ? "translate-y-0" : "translate-y-full"}`}
            aria-hidden={!showChatZone}
            inert={!showChatZone || undefined}
          >
            <div aria-hidden="true" className="h-10 shrink-0 bg-gradient-to-b from-transparent to-[var(--brand-surface)] sm:h-14" />
            <div className={`paranoid-scrollbar flex min-h-0 flex-1 flex-col justify-end overflow-y-auto bg-[var(--brand-surface)] px-4 pb-4 sm:px-6 ${discoveryMode ? "gap-6 sm:gap-8" : "gap-8 sm:gap-10"}`}>
              {visibleHistory.map((item) => <HubExchange key={item.id} item={item} />)}
              {pendingQuery && <PendingHubExchange query={pendingQuery} />}
              <div ref={conversationEndRef} className="h-1" aria-hidden="true" />
            </div>
          </div>

          <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--brand-surface)]/85 text-center backdrop-blur-md transition-opacity duration-500 ease-out ${navigatingLabel ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={!navigatingLabel}>
            <p className="text-base font-black text-[var(--foreground)]">{navigatingLabel}</p>
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">Vais ser reencaminhado</p>
          </div>
        </div>

        {discoveryMode && discoveryFeed && <div className="mt-10 px-1 sm:mt-12 sm:px-2">{discoveryFeed}</div>}
      </div>

      <form onSubmit={submit} className="shrink-0 pb-3 pt-2 sm:pb-5" aria-busy={loading}>
        <label htmlFor={inputId} className="sr-only">Fala com a Paranoid</label>
        <div className="hub-composer flex min-h-16 items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2.5 pl-5 focus-within:border-[var(--border-strong)]">
          <textarea
            ref={inputRef}
            id={inputId}
            rows={1}
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={discoveryMode ? "O que procuras?" : "Diz-me o que tens em mente"}
            autoComplete="off"
            enterKeyHint="send"
            className="max-h-32 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-2 text-base leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-muted)]"
          />
          <button type="submit" disabled={loading || !query.trim()} aria-label={loading ? thinkingLabel(pendingQuery) : "Enviar"} className="pressable focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--foreground)] text-[var(--background)] transition-opacity disabled:cursor-default disabled:opacity-25">
            <AppIcon name="send" className="h-4 w-4" />
          </button>
        </div>
      </form>

      {!showChatZone && (
        <div className="feed-item-enter flex shrink-0 justify-center gap-2 pb-3 sm:gap-3 sm:pb-5">
          <SatelliteLink href="/agenda" icon="calendar" label="Agenda" onClick={onBeforeNavigate} />
          <SatelliteLink href="/descobrir" icon="compass" label="Nexus" onClick={onBeforeNavigate} />
          <SatelliteLink href="/loja" icon="store" label="Loja" onClick={onBeforeNavigate} />
        </div>
      )}
    </section>
  );
}

function SatelliteLink({ href, icon, label, onClick }: { href: string; icon: "calendar" | "store" | "compass" | "spark"; label: string; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="pressable focus-ring flex shrink-0 flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-black/35 px-2.5 py-2 backdrop-blur-md transition-colors hover:border-white/25 hover:bg-black/50 sm:px-3 sm:py-2.5">
      <AppIcon name={icon} className="h-4 w-4 text-[var(--foreground)]" />
      <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-wide text-[var(--foreground-secondary)]">{label}</span>
    </Link>
  );
}

function ParanoidMessage({ children }: { children: ReactNode }) {
  return <div className="flex max-w-[44rem] items-start gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" aria-hidden="true" /><div className="min-w-0 text-[15px] leading-7 text-[var(--foreground-secondary)] sm:text-base">{children}</div></div>;
}

function UserMessage({ query }: { query: string }) {
  return <div className="flex justify-end"><p className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--surface-secondary)] px-4 py-2.5 text-[15px] leading-6 text-[var(--foreground)] sm:max-w-[72%] sm:text-base">{query}</p></div>;
}

function PendingHubExchange({ query }: { query: string }) {
  return <article className="hub-message-enter space-y-4" aria-label={`Pergunta: ${query}`}><UserMessage query={query} /><ParanoidMessage><span className="inline-flex items-center gap-2 text-sm text-[var(--foreground-muted)]"><span className="hub-thinking-dots" aria-hidden="true"><i /><i /><i /></span>{thinkingLabel(query)}</span></ParanoidMessage></article>;
}

function HubExchange({ item }: { item: HubHistoryItem }) {
  const titleSuffix = /[.!?]$/.test(item.response.title) ? "" : ".";
  return (
    <article className="hub-message-enter space-y-4" aria-label={`Pergunta: ${item.query}`}>
      <UserMessage query={item.query} />
      <ParanoidMessage>
        <p>
          <span className="block text-[var(--foreground)]">{item.response.title}{titleSuffix}</span>
          {item.response.description && <span className="mt-1 block whitespace-pre-line">{item.response.description}</span>}
        </p>

        {item.response.results.length > 0 && (
          <ul className="mt-4 space-y-1">
            {item.response.results.map((event) => (
              <li key={event.id}>
                <Link href={`/eventos/${event.slug}`} className="focus-ring -ml-2 flex items-baseline gap-3 rounded-md px-2 py-2 text-[var(--foreground)] hover:bg-[var(--surface-secondary)]">
                  <span className="shrink-0 text-xs font-bold text-danger">{event.displayTime || event.displayDate}</span>
                  <span className="min-w-0"><strong className="font-bold">{event.title}</strong>{[event.venueName, event.city].filter(Boolean).length ? ` · ${[event.venueName, event.city].filter(Boolean).join(" · ")}` : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {item.response.details && item.response.details.length > 0 && (
          <ul className="mt-4 space-y-1">
            {item.response.details.map((detail) => (
              <li key={detail.id}>
                {detail.href ? (
                  <Link href={detail.href} className="focus-ring -ml-2 block rounded-md px-2 py-2 text-[var(--foreground)] hover:bg-[var(--surface-secondary)]"><strong className="font-bold">{detail.title}</strong>{detail.meta ? ` · ${detail.meta}` : ""}</Link>
                ) : (
                  <p className="py-2 text-[var(--foreground)]"><strong className="font-bold">{detail.title}</strong>{detail.meta ? ` · ${detail.meta}` : ""}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        {item.response.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {item.response.actions.map((action) => (
              <Link key={`${action.href}-${action.label}`} href={action.href} className={`pressable focus-ring inline-flex min-h-8 items-center gap-0.5 rounded text-xs font-bold ${action.primary ? "text-danger hover:text-danger" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"}`}>
                {action.label}<AppIcon name="chevron" className="h-3 w-3" />
              </Link>
            ))}
          </div>
        )}
      </ParanoidMessage>
    </article>
  );
}
