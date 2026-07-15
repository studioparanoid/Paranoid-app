"use client";

import { useId, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import {
  normalizeLocationText,
  portugalMunicipalities,
  portugalMunicipalitiesByDistrict,
} from "@/lib/portugalLocations";

const municipalityDistrict = new Map(
  Object.entries(portugalMunicipalitiesByDistrict).flatMap(([district, municipalities]) =>
    municipalities.map((municipality) => [municipality, district] as const)
  )
);

export function CityCombobox({
  value,
  onChange,
  label = "Cidade/localidade",
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}) {
  const id = useId();
  const listId = `${id}-cities`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const options = useMemo(() => {
    const query = normalizeLocationText(value);
    return portugalMunicipalities
      .filter((city) => !query || normalizeLocationText(city).includes(query))
      .slice(0, 10);
  }, [value]);

  function selectCity(city: string) {
    onChange(city);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, options.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (current <= 0 ? options.length - 1 : current - 1));
      return;
    }
    if (event.key === "Enter" && open && options.length > 0) {
      event.preventDefault();
      selectCity(options[activeIndex >= 0 ? activeIndex : 0]);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <label htmlFor={id} className="mb-2 block text-xs font-bold text-[var(--foreground-muted)]">
        {label}
      </label>
      <div className="relative">
        <AppIcon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" />
        <input
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          required={required}
          autoComplete="address-level2"
          placeholder="Pesquisar concelho"
          className="h-12 w-full rounded border border-[var(--input-border)] bg-[var(--input-background)] pl-10 pr-11 text-[var(--foreground)] outline-none placeholder:text-[var(--input-placeholder)] focus:border-[var(--accent)]"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(true);
              setActiveIndex(-1);
            }}
            aria-label="Limpar cidade"
            className="focus-ring absolute inset-y-0 right-0 grid w-11 place-items-center text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          >
            <AppIcon name="close" className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div
          id={listId}
          role="listbox"
          className="shadow-dropdown absolute inset-x-0 top-[calc(100%+0.25rem)] z-40 max-h-64 overflow-x-hidden overflow-y-auto rounded border border-[var(--border)] bg-[var(--dropdown-background)] p-1 text-[var(--foreground)]"
        >
          {options.length === 0 ? (
            <p className="px-3 py-4 text-sm text-[var(--foreground-muted)]" role="status">
              Sem concelhos encontrados.
            </p>
          ) : (
            options.map((city, index) => {
              const selected = city === value;
              const active = index === activeIndex;
              const district = municipalityDistrict.get(city) || "Região Autónoma";
              return (
                <button
                  id={`${listId}-${index}`}
                  key={city}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectCity(city)}
                  className={`focus-ring flex min-h-12 w-full items-center gap-3 rounded px-3 py-2 text-left ${
                    active || selected ? "bg-[var(--surface-hover)]" : "hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[var(--foreground)]">{city}</span>
                    <span className="block truncate text-xs text-[var(--foreground-muted)]">Concelho · {district}</span>
                  </span>
                  {selected && <AppIcon name="check" className="h-4 w-4 shrink-0 text-[var(--accent)]" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function isKnownPortugueseMunicipality(value: string) {
  return !value || portugalMunicipalities.includes(value);
}
