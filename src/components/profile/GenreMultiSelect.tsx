"use client";

import { useId, useMemo, useState } from "react";
import { maxMusicGenres, musicGenres } from "@/lib/profileOptions";

export function GenreMultiSelect({ values, onChange }: { values: string[]; onChange: (values: string[]) => void }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const options = useMemo(() => musicGenres.filter((genre) => !values.includes(genre) && genre.toLocaleLowerCase("pt-PT").includes(query.trim().toLocaleLowerCase("pt-PT"))).slice(0, 8), [query, values]);

  function add(value: string) {
    const clean = value.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!clean || values.some((item) => item.toLocaleLowerCase("pt-PT") === clean.toLocaleLowerCase("pt-PT")) || values.length >= maxMusicGenres) return;
    onChange([...values, clean]);
    setQuery("");
    setOpen(false);
  }

  return <fieldset className="sm:col-span-2">
    <legend className="mb-2 text-xs font-bold text-[var(--foreground-muted)]">Géneros musicais</legend>
    <div className="flex flex-wrap gap-2">{values.map((genre) => <button key={genre} type="button" onClick={() => onChange(values.filter((item) => item !== genre))} aria-label={`Remover ${genre}`} className="min-h-10 rounded-full border border-red-900 bg-red-950/20 px-3 text-xs font-black text-red-400">{genre} ×</button>)}</div>
    <div className="relative mt-2">
      <input id={id} role="combobox" aria-expanded={open} aria-controls={`${id}-options`} aria-autocomplete="list" value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(options[0] || query); } if (event.key === "Escape") setOpen(false); }} disabled={values.length >= maxMusicGenres} placeholder={values.length >= maxMusicGenres ? "Limite de 6 géneros" : "Pesquisar género"} className="h-12 w-full rounded border border-[var(--border)] bg-[var(--input-background)] px-4 outline-none focus:border-red-800" />
      {open && options.length > 0 && <div id={`${id}-options`} role="listbox" className="shadow-dropdown absolute inset-x-0 top-[calc(100%+0.25rem)] z-30 max-h-56 overflow-y-auto rounded border border-[var(--border)] bg-[var(--dropdown-background)] p-1 text-[var(--foreground)]">{options.map((option) => <button key={option} type="button" role="option" aria-selected="false" onMouseDown={(event) => event.preventDefault()} onClick={() => add(option)} className="block min-h-11 w-full rounded px-3 text-left text-sm font-bold hover:bg-[var(--surface-hover)]">{option}</button>)}</div>}
    </div>
  </fieldset>;
}
