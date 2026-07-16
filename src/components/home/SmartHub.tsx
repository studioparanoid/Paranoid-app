"use client";

import Link from "next/link";
import { type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import type { HubHistoryItem, HubResponse } from "@/lib/hub/types";

const historyKey = "paranoid.hub-history";
const suggestions = [
  "O que há hoje perto de mim?",
  "Onde está a noite?",
  "Tenho fome",
  "Concertos",
  "Lineup",
  "Os meus bilhetes",
];

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
    )).slice(-3);
  } catch {
    return [];
  }
}

export function SmartHub() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<HubHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => setHistory(readHistory()), 0);
    const focusHub = () => {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      inputRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener("paranoid:focus-hub", focusHub);
    const focusTimer = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).get("focus") === "hub") focusHub();
    }, 80);
    return () => {
      window.clearTimeout(restoreTimer);
      window.clearTimeout(focusTimer);
      window.removeEventListener("paranoid:focus-hub", focusHub);
    };
  }, []);

  useEffect(() => {
    if (history.length === 0 && !loading && !error) return;
    const frame = window.requestAnimationFrame(() => {
      conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [error, history, loading]);

  async function runQuery(value: string) {
    const cleanQuery = value.trim();
    if (!cleanQuery || busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    setError("");
    setQuery(cleanQuery);

    try {
      const response = await fetch("/api/hub", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: cleanQuery }),
      });
      const payload = await response.json().catch(() => ({})) as HubResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível responder agora.");
      const item: HubHistoryItem = {
        id: crypto.randomUUID(),
        query: cleanQuery,
        response: payload,
      };
      setHistory((current) => {
        const next = [...current, item].slice(-3);
        window.sessionStorage.setItem(historyKey, JSON.stringify(next));
        return next;
      });
      setQuery("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível responder agora.");
    } finally {
      busyRef.current = false;
      setLoading(false);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runQuery(query);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void runQuery(query);
    }
  }

  function clearHistory() {
    window.sessionStorage.removeItem(historyKey);
    setHistory([]);
    setError("");
    inputRef.current?.focus();
  }

  return (
    <section className="mx-auto max-w-4xl pb-10 pt-10 sm:pb-14 sm:pt-14 lg:pt-16" aria-labelledby="hub-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 id="hub-title" className="text-4xl font-black leading-none sm:text-5xl">Paranoid Hub</h1>
          <p className="mt-3 text-sm text-[var(--foreground-muted)] sm:text-base">Diz-nos o que procuras.</p>
        </div>
        {history.length > 0 && <button type="button" onClick={clearHistory} className="pressable focus-ring shrink-0 rounded text-xs font-bold text-[var(--foreground-muted)] underline underline-offset-4 hover:text-[var(--foreground)]">Limpar conversa</button>}
      </div>

      <div className="mt-7 border-y border-[var(--border)]">
        <div className="paranoid-scrollbar min-h-48 max-h-[52vh] overflow-y-auto py-6 sm:min-h-56" aria-live="polite">
          {history.length === 0 && !loading ? (
            <div className="py-3">
              <p className="text-sm leading-relaxed text-[var(--foreground-secondary)]">Podes começar por uma destas perguntas.</p>
              <div className="mt-4 flex flex-wrap gap-2" aria-label="Sugestões rápidas">
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => void runQuery(suggestion)} className="pressable focus-ring min-h-9 rounded-full border border-[var(--border)] px-3.5 py-1.5 text-xs font-bold text-[var(--foreground-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]">
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-7">
            {history.map((item) => <HubExchange key={item.id} item={item} />)}
            {loading && <ParanoidMessage><span className="inline-flex items-center gap-2 text-[var(--foreground-muted)]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" aria-hidden="true" />A procurar...</span></ParanoidMessage>}
            {error && <ParanoidMessage><span className="text-red-600">{error}</span></ParanoidMessage>}
          </div>
          <div ref={conversationEndRef} aria-hidden="true" />
        </div>

        <form onSubmit={submit} className="border-t border-[var(--border)] py-4" aria-busy={loading}>
          <label htmlFor="paranoid-hub-query" className="sr-only">Pergunta à Paranoid</label>
          <div className="shadow-panel flex items-end gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-2 transition-[border-color,box-shadow] duration-200 focus-within:border-red-700">
            <textarea
              ref={inputRef}
              id="paranoid-hub-query"
              rows={2}
              value={query}
              onChange={(event) => setQuery(event.target.value.slice(0, 240))}
              onKeyDown={handleKeyDown}
              placeholder="Pergunta o que fazer, onde ir ou o que está a acontecer…"
              autoComplete="off"
              enterKeyHint="send"
              className="max-h-28 min-h-12 min-w-0 flex-1 resize-none bg-transparent px-3 py-3 text-base font-bold leading-relaxed text-[var(--foreground)] outline-none placeholder:font-medium placeholder:text-[var(--foreground-muted)]"
            />
            <button type="submit" disabled={loading || !query.trim()} aria-label={loading ? "A procurar" : "Enviar pergunta"} className="pressable focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--foreground)] text-[var(--background)] disabled:cursor-wait disabled:opacity-45">
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> : <AppIcon name="send" className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function ParanoidMessage({ children }: { children: ReactNode }) {
  return <div className="flex max-w-3xl items-start gap-3">
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black text-xs font-black text-white" aria-hidden="true">P</span>
    <div className="min-w-0 pt-0.5 text-sm leading-relaxed text-[var(--foreground-secondary)] sm:text-base">{children}</div>
  </div>;
}

function HubExchange({ item }: { item: HubHistoryItem }) {
  return (
    <article className="content-transition space-y-4" aria-label={`Pergunta: ${item.query}`}>
      <div className="flex justify-end">
        <p className="max-w-[82%] rounded-lg bg-[var(--surface-secondary)] px-4 py-2.5 text-sm font-bold leading-relaxed text-[var(--foreground)] sm:max-w-[70%]">{item.query}</p>
      </div>
      <ParanoidMessage>
        <p><strong className="font-black text-[var(--foreground)]">{item.response.title}.</strong> {item.response.description}</p>

        {item.response.results.length > 0 && (
          <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {item.response.results.map((event) => (
              <li key={event.id}>
                <Link href={`/eventos/${event.slug}`} className="focus-ring grid gap-1 rounded py-3 text-[var(--foreground)] hover:text-red-600 sm:grid-cols-[auto_1fr] sm:gap-3">
                  <span className="font-black">{event.displayTime || event.displayDate}</span>
                  <span><strong>{event.title}</strong>{[event.venueName, event.city].filter(Boolean).length ? ` · ${[event.venueName, event.city].filter(Boolean).join(" · ")}` : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {item.response.details && item.response.details.length > 0 && (
          <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {item.response.details.map((detail) => (
              <li key={detail.id} className="py-3">
                {detail.href ? (
                  <Link href={detail.href} className="focus-ring block rounded text-[var(--foreground)] hover:text-red-600">
                    <strong>{detail.title}</strong>{detail.meta ? ` · ${detail.meta}` : ""}
                  </Link>
                ) : (
                  <p className="text-[var(--foreground)]"><strong>{detail.title}</strong>{detail.meta ? ` · ${detail.meta}` : ""}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {item.response.actions.map((action) => (
            <Link key={`${action.href}-${action.label}`} href={action.href} className={`pressable focus-ring inline-flex min-h-9 items-center rounded-full px-3.5 py-1.5 text-xs font-black ${action.primary ? "bg-[var(--foreground)] text-[var(--background)]" : "border border-[var(--border-strong)] text-[var(--foreground)]"}`}>
              {action.label}
            </Link>
          ))}
        </div>
      </ParanoidMessage>
    </article>
  );
}
