"use client";

import { useMemo, useState } from "react";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toIso(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

const weekdayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];

export function BusyDaysCalendar({ busyDates, selectedDate, onSelectDate }: { busyDates: string[]; selectedDate: string | null; onSelectDate: (date: string) => void }) {
  const today = new Date();
  const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const busySet = useMemo(() => new Set(busyDates), [busyDates]);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(viewDate);
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  function changeMonth(delta: number) {
    setViewDate(new Date(year, month + delta, 1));
  }

  const cells: Array<{ day: number; iso: string } | null> = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push({ day, iso: toIso(year, month, day) });

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => changeMonth(-1)} disabled={isCurrentMonth} className="pressable focus-ring rounded-full px-2 py-1 text-sm font-bold text-foreground-muted hover:text-foreground disabled:opacity-30">‹</button>
        <p className="text-sm font-black capitalize">{monthLabel}</p>
        <button type="button" onClick={() => changeMonth(1)} className="pressable focus-ring rounded-full px-2 py-1 text-sm font-bold text-foreground-muted hover:text-foreground">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-foreground-muted">
        {weekdayLabels.map((label, index) => <div key={index}>{label}</div>)}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell) return <div key={`empty-${index}`} />;
          const isPast = cell.iso < todayIso;
          const isBusy = busySet.has(cell.iso);
          const isSelected = cell.iso === selectedDate;
          const disabled = isPast || isBusy;
          return (
            <button
              key={cell.iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(cell.iso)}
              className={`pressable focus-ring aspect-square rounded text-xs font-bold ${
                isBusy
                  ? "text-[var(--danger)]"
                  : isSelected
                    ? "bg-[var(--success)] text-black"
                    : isPast
                      ? "text-foreground-muted opacity-30"
                      : "text-foreground hover:bg-surface-hover"
              }`}
            >
              {isBusy ? "✕" : isSelected ? "✕" : cell.day}
            </button>
          );
        })}
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-foreground-muted">
        <span><span className="text-[var(--danger)]">✕</span> Ocupado</span>
        <span><span className="text-[var(--success)]">✕</span> Escolhido</span>
      </p>
    </div>
  );
}
