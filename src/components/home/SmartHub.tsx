"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import type { HubHistoryItem, HubResponse } from "@/lib/hub/types";

const historyKey = "paranoid.hub-history";
const suggestions = [
  "Hoje perto de mim",
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
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<HubHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => setHistory(readHistory()), 0);
    const focusHub = () => inputRef.current?.focus({ preventScroll: false });
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
        id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`,
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
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runQuery(query);
  }

  function clearHistory() {
    window.sessionStorage.removeItem(historyKey);
    setHistory([]);
    setError("");
    inputRef.current?.focus();
  }

  return (
    <section className="mx-auto max-w-5xl pb-12 pt-12 sm:pb-16 sm:pt-16 lg:pb-20 lg:pt-24" aria-labelledby="hub-title">
      <p className="text-xs font-black uppercase text-red-600">Centro Paranoid</p>
      <h1 id="hub-title" className="mt-4 max-w-3xl text-4xl font-black leading-none sm:text-6xl lg:text-7xl">
        O que precisas?
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--foreground-muted)] sm:text-base">
        Procura eventos, localizações, bilhetes e tudo o que já está publicado na Paranoid.
      </p>

      <form onSubmit={submit} className="mt-8 sm:mt-10" role="search" aria-busy={loading}>
        <label htmlFor="paranoid-hub-query" className="sr-only">Pergunta à Paranoid</label>
        <div className="shadow-panel flex min-h-16 items-center gap-3 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-2 transition-[border-color,box-shadow,transform] duration-200 focus-within:border-red-700 focus-within:shadow-[0_14px_35px_rgb(0_0_0_/_0.2)] sm:min-h-20 sm:p-3">
          <input
            ref={inputRef}
            id="paranoid-hub-query"
            value={query}
            onChange={(event) => setQuery(event.target.value.slice(0, 240))}
            placeholder="Pergunta o que fazer, onde ir ou o que está a acontecer..."
            autoComplete="off"
            enterKeyHint="send"
            className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base font-bold text-[var(--foreground)] outline-none placeholder:font-medium placeholder:text-[var(--foreground-muted)] sm:text-lg"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            aria-label={loading ? "A procurar" : "Enviar pergunta"}
            className="pressable focus-ring grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--foreground)] text-[var(--background)] disabled:cursor-wait disabled:opacity-45 sm:h-14 sm:w-14"
          >
            {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> : <AppIcon name="send" className="h-5 w-5" />}
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Sugestões rápidas">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => void runQuery(suggestion)}
            disabled={loading}
            className="pressable focus-ring min-h-10 rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-2 text-xs font-bold text-[var(--foreground-secondary)] hover:border-[var(--border-strong)] disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mt-5 border-l-2 border-red-700 pl-4 text-sm font-bold text-red-600">{error}</p>}

      {history.length > 0 && (
        <div className="mt-10 border-t border-[var(--border)] pt-7">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-black uppercase text-[var(--foreground-muted)]">Contexto recente</h2>
            <button type="button" onClick={clearHistory} className="pressable focus-ring rounded text-xs font-bold text-[var(--foreground-muted)] underline underline-offset-4 hover:text-[var(--foreground)]">Limpar</button>
          </div>
          <div className="mt-5 space-y-7" aria-live="polite">
            {history.map((item) => <HubExchange key={item.id} item={item} />)}
          </div>
        </div>
      )}
    </section>
  );
}

function HubExchange({ item }: { item: HubHistoryItem }) {
  return (
    <article className="content-transition" aria-labelledby={`hub-response-${item.id}`}>
      <p className="text-xs font-bold text-[var(--foreground-muted)]">“{item.query}”</p>
      <h3 id={`hub-response-${item.id}`} className="mt-2 text-2xl font-black sm:text-3xl">{item.response.title}</h3>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--foreground-secondary)]">{item.response.description}</p>

      {item.response.results.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {item.response.results.map((event) => (
            <Link key={event.id} href={`/eventos/${event.slug}`} className="interactive-card focus-ring group grid min-h-32 grid-cols-[7rem_1fr] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] sm:grid-cols-[8rem_1fr]">
              <span className="relative block bg-[var(--surface-secondary)]">
                {event.imageUrl ? (
                  <Image src={event.imageUrl} alt="" fill sizes="128px" unoptimized className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                ) : (
                  <span className="grid h-full place-items-center text-3xl font-black text-[var(--foreground-muted)]" aria-hidden="true">P</span>
                )}
              </span>
              <span className="min-w-0 p-4">
                <span className="block text-xs font-bold text-red-600">{[event.category, event.price].filter(Boolean).join(" · ") || "Agenda"}</span>
                <span className="mt-1 block text-base font-black leading-tight">{event.title}</span>
                <span className="mt-2 block text-xs leading-relaxed text-[var(--foreground-muted)]">{[event.displayDate, event.displayTime, event.venueName, event.city].filter(Boolean).join(" · ")}</span>
                <span className="mt-3 block text-xs font-black text-[var(--foreground)]">{item.response.intent === "lineup" ? "Ver programa" : "Ver evento"}</span>
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {item.response.actions.map((action) => (
          <Link key={`${action.href}-${action.label}`} href={action.href} className={`pressable focus-ring inline-flex min-h-11 items-center rounded-full px-5 py-2 text-sm font-black ${action.primary ? "bg-[var(--foreground)] text-[var(--background)]" : "border border-[var(--border-strong)] text-[var(--foreground)]"}`}>
            {action.label}
          </Link>
        ))}
      </div>
    </article>
  );
}
