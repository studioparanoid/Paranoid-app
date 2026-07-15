"use client";

import { useId } from "react";
import { portugalMunicipalities } from "@/lib/portugalLocations";

export function CityCombobox({ value, onChange, label = "Cidade/localidade", required = false }: { value: string; onChange: (value: string) => void; label?: string; required?: boolean }) {
  const id = useId();
  const listId = `${id}-cities`;
  return <label htmlFor={id}>
    <span className="mb-2 block text-xs font-bold text-[var(--foreground-muted)]">{label}</span>
    <div className="relative">
      <input id={id} list={listId} role="combobox" aria-autocomplete="list" aria-controls={listId} aria-expanded="false" value={value} onChange={(event) => onChange(event.target.value)} required={required} autoComplete="address-level2" placeholder="Pesquisar concelho" className="h-12 w-full rounded border border-[var(--border)] bg-[var(--input-background)] px-4 pr-11 outline-none focus:border-red-800" />
      {value && <button type="button" onClick={() => onChange("")} aria-label="Limpar cidade" className="focus-ring absolute inset-y-0 right-0 grid w-11 place-items-center text-lg text-[var(--foreground-muted)]">×</button>}
    </div>
    <datalist id={listId}>{portugalMunicipalities.map((city) => <option key={city} value={city} />)}</datalist>
  </label>;
}

export function isKnownPortugueseMunicipality(value: string) {
  return !value || portugalMunicipalities.includes(value);
}
