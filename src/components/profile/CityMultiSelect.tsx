"use client";

import { useId, useMemo, useState } from "react";
import { normalizeLocationText, portugalMunicipalities } from "@/lib/portugalLocations";

export function CityMultiSelect({ values, onChange, label = "Cidades" }: { values: string[]; onChange: (values: string[]) => void; label?: string }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const options = useMemo(() => {
    const normalizedQuery = normalizeLocationText(query);
    return portugalMunicipalities
      .filter((city) => !values.includes(city) && normalizeLocationText(city).includes(normalizedQuery))
      .slice(0, 8);
  }, [query, values]);

  function add(city: string) {
    if (!city || values.includes(city)) return;
    onChange([...values, city]);
    setQuery("");
    setOpen(false);
  }

  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-2 text-xs font-bold text-[var(--foreground-muted)]">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {values.map((city) => (
          <button key={city} type="button" onClick={() => onChange(values.filter((item) => item !== city))} aria-label={`Remover ${city}`} className="min-h-10 rounded-full border border-accent/40 bg-accent/12 px-3 text-xs font-black text-accent">
            {city} ×
          </button>
        ))}
      </div>
      <div className="relative mt-2">
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-options`}
          aria-autocomplete="list"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); add(options[0] || ""); }
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder="Pesquisar concelho (todo o país)"
          className="h-12 w-full rounded-md border border-input-border bg-input px-4 text-foreground outline-none focus:border-accent"
        />
        {open && options.length > 0 && (
          <div id={`${id}-options`} role="listbox" className="shadow-dropdown absolute inset-x-0 top-[calc(100%+0.25rem)] z-30 max-h-56 overflow-y-auto rounded-md border border-border bg-dropdown p-1 text-foreground">
            {options.map((option) => (
              <button key={option} type="button" role="option" aria-selected="false" onMouseDown={(event) => event.preventDefault()} onClick={() => add(option)} className="block min-h-11 w-full rounded px-3 text-left text-sm font-bold hover:bg-surface-hover">
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </fieldset>
  );
}
