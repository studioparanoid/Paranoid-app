"use client";

import Link from "next/link";
import { type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import type { HubHistoryItem, HubResponse } from "@/lib/hub/types";

const historyKey = "paranoid.hub-history";
const historyLimit = 32;
const requestTimeoutMs = 10_000;
const minimumThinkingMs = 360;
const genericErrorMessage = "O Hub falhou a responder. Tenta novamente.";
const timeoutErrorMessage = "Demorei demasiado a obter a informação. Tenta novamente.";
const suggestions = ["Quero sair hoje", "Tenho fome", "O que está a acontecer?", "Estou num festival"];

function readHistory() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(historyKey) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is HubHistoryItem => Boolean(
      item &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.query === "string" &&
      item.response &&
      typeof item.response.title === "string" &&
      Array.isArray(item.response.results) &&
      Array.isArray(item.response.actions)
    )).slice(-historyLimit);
  } catch {
    return [];
  }
}

function persistHistory(history: HubHistoryItem[]) {
  try {
    window.sessionStorage.setItem(historyKey, JSON.stringify(history));
  } catch (storageError) {
    if (process.env.NODE_ENV === "development") console.warn("[hub] Não foi possível guardar a conversa na sessão.", storageError);
  }
}

function isHubResponse(value: unknown): value is HubResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<HubResponse>;
  return typeof response.title === "string" && typeof response.description === "string" && Array.isArray(response.results) && Array.isArray(response.actions);
}

function thinkingLabel(value: string) {
  const query = value.toLocaleLowerCase("pt-PT");
  if (/toca|programa|lineup|seguir/.test(query)) return "A consultar programação";
  if (/fome|comer|jantar|almoçar|restaurante/.test(query)) return "A verificar restaurantes";
  if (/mapa|onde fica|como chegar/.test(query)) return "A situar-te";
  if (/evento|concerto|festival|noite|sair|agenda/.test(query)) return "A procurar eventos";
  return "A pensar";
}

function resizeInput(input: HTMLTextAreaElement) {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
}

export function SmartHub() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<HubHistoryItem[]>([]);
  const [pendingQuery, setPendingQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => setHistory(readHistory()), 0);
    const focusHub = () => {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      inputRef.current?.focus({ preventScroll: true });
    };
    const focusTimer = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).get("focus") === "hub" || window.matchMedia("(pointer: fine)").matches) focusHub();
    }, 100);
    window.addEventListener("paranoid:focus-hub", focusHub);
    return () => {
      window.clearTimeout(restoreTimer);
      window.clearTimeout(focusTimer);
      window.removeEventListener("paranoid:focus-hub", focusHub);
    };
  }, []);

  useEffect(() => {
    if (history.length === 0 && !loading) return;
    const frame = window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      conversationEndRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [history, loading, pendingQuery]);

  function appendHistory(item: HubHistoryItem) {
    setHistory((current) => {
      const next = [...current, item].slice(-historyLimit);
      persistHistory(next);
      return next;
    });
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
      appendHistory({ id: crypto.randomUUID(), query: cleanQuery, response: payload });
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
    try {
      window.sessionStorage.removeItem(historyKey);
    } catch (storageError) {
      if (process.env.NODE_ENV === "development") console.warn("[hub] Não foi possível limpar a conversa guardada.", storageError);
    }
    setHistory([]);
    setQuery("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    inputRef.current?.focus();
  }

  return (
    <section className="mx-auto flex h-full w-full max-w-[52rem] flex-col" aria-labelledby="hub-title">
      <header className="flex shrink-0 items-center justify-between gap-4 py-4 sm:py-5">
        <div>
          <h1 id="hub-title" className="text-xl font-black sm:text-2xl">Paranoid Hub</h1>
          <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">O centro da tua noite.</p>
        </div>
        {history.length > 0 && (
          <button type="button" onClick={clearHistory} className="pressable focus-ring inline-flex min-h-9 items-center gap-1.5 rounded px-2 text-xs font-bold text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
            <AppIcon name="plus" className="h-3.5 w-3.5" />
            Nova conversa
          </button>
        )}
      </header>

      <div className="paranoid-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-5 sm:px-2 sm:py-8" aria-live="polite">
        {history.length === 0 && !loading && (
          <div className="hub-message-enter max-w-2xl pt-[clamp(2rem,10vh,6rem)]">
            <ParanoidMessage><p className="text-lg text-[var(--foreground)] sm:text-xl">O que te apetece fazer?</p></ParanoidMessage>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 pl-4" aria-label="Sugestões rápidas">
              {suggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => void runQuery(suggestion)} className="pressable focus-ring rounded py-1 text-left text-sm font-bold text-[var(--foreground-secondary)] hover:text-[var(--foreground)]">
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-8 sm:space-y-10">
          {history.map((item) => <HubExchange key={item.id} item={item} />)}
          {pendingQuery && <PendingHubExchange query={pendingQuery} />}
        </div>
        <div ref={conversationEndRef} className="h-1" aria-hidden="true" />
      </div>

      <form onSubmit={submit} className="shrink-0 bg-[var(--background)] pb-3 pt-2 sm:pb-5" aria-busy={loading}>
        <label htmlFor="paranoid-hub-query" className="sr-only">Fala com a Paranoid</label>
        <div className="hub-composer flex min-h-14 items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 pl-3.5 focus-within:border-[var(--border-strong)]">
          <textarea
            ref={inputRef}
            id="paranoid-hub-query"
            rows={1}
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Diz-me o que tens em mente"
            autoComplete="off"
            enterKeyHint="send"
            className="max-h-32 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-2 text-base leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-muted)]"
          />
          <button type="submit" disabled={loading || !query.trim()} aria-label={loading ? thinkingLabel(pendingQuery) : "Enviar"} className="pressable focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--foreground)] text-[var(--background)] transition-opacity disabled:cursor-default disabled:opacity-25">
            <AppIcon name="send" className="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>
  );
}

function ParanoidMessage({ children }: { children: ReactNode }) {
  return <div className="flex max-w-[44rem] items-start gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" aria-hidden="true" /><div className="min-w-0 text-[15px] leading-7 text-[var(--foreground-secondary)] sm:text-base">{children}</div></div>;
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
                  <span className="shrink-0 text-xs font-bold text-red-600">{event.displayTime || event.displayDate}</span>
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
              <Link key={`${action.href}-${action.label}`} href={action.href} className={`pressable focus-ring inline-flex min-h-8 items-center gap-0.5 rounded text-xs font-bold ${action.primary ? "text-red-600 hover:text-red-500" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"}`}>
                {action.label}<AppIcon name="chevron" className="h-3 w-3" />
              </Link>
            ))}
          </div>
        )}
      </ParanoidMessage>
    </article>
  );
}
