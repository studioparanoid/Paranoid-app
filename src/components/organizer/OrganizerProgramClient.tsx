"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, LinkButton, LoadingButton } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { parseProgramCsv, parseQuickProgram, type ProgramDraft, zonedDateTimeToIso } from "@/lib/program-import";

type Mode = "quick" | "csv" | "visual";
type ProgramPayload = {
  event: { id: string; title: string; start_date: string | null; timezone: string | null };
  zones: Array<{ id: string; name: string }>;
  items: Array<{ id: string; zone_id: string | null; title: string; program_type: string; scheduled_start_at: string; scheduled_end_at: string | null; status: string }>;
};

const fieldClass = "min-h-11 w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]";
const typeOptions = ["concert", "dj_set", "performance", "workshop", "screening", "talk", "conference", "activity", "other"];
const statusOptions = ["draft", "scheduled", "confirmed", "delayed", "live", "finished", "moved", "cancelled"];

function localParts(value: string) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const time = new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  return { day, time };
}

function nextDay(day: string) {
  const value = new Date(`${day}T12:00:00`);
  value.setDate(value.getDate() + 1);
  return value.toISOString().slice(0, 10);
}

export function OrganizerProgramClient({ eventId }: { eventId: string }) {
  const [mode, setMode] = useState<Mode>("quick");
  const [event, setEvent] = useState<ProgramPayload["event"] | null>(null);
  const [items, setItems] = useState<ProgramDraft[]>([]);
  const [undo, setUndo] = useState<ProgramDraft[][]>([]);
  const [quickText, setQuickText] = useState("");
  const [csvText, setCsvText] = useState("");
  const [defaultDay, setDefaultDay] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const storageKey = `paranoid-program-draft:${eventId}`;

  function replaceItems(next: ProgramDraft[]) {
    setUndo((history) => [...history.slice(-9), items]);
    setItems(next);
  }

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/organizer/events/${eventId}/program`);
      const payload = await response.json() as ProgramPayload & { error?: string };
      if (!response.ok) { setMessage(payload.error || "Não foi possível abrir o programa."); setLoading(false); return; }
      setEvent(payload.event);
      setDefaultDay(payload.event.start_date || new Date().toISOString().slice(0, 10));
      const zoneById = new Map(payload.zones.map((zone) => [zone.id, zone.name]));
      const serverItems = payload.items.map((item) => {
        const start = localParts(item.scheduled_start_at);
        const end = item.scheduled_end_at ? localParts(item.scheduled_end_at).time : "";
        return { localId: crypto.randomUUID(), id: item.id, day: start.day, zone: item.zone_id ? zoneById.get(item.zone_id) || "Sem palco" : "Sem palco", startTime: start.time, endTime: end, title: item.title, programType: item.program_type, status: item.status };
      });
      const local = window.localStorage.getItem(storageKey);
      if (local) {
        try { const draft = JSON.parse(local) as ProgramDraft[]; setItems(Array.isArray(draft) && draft.length ? draft : serverItems); }
        catch { setItems(serverItems); }
      } else setItems(serverItems);
      setLoading(false);
    }
    void load();
  }, [eventId, storageKey]);

  useEffect(() => {
    if (!loading) window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, loading, storageKey]);

  const zones = useMemo(() => Array.from(new Set(items.map((item) => item.zone).filter(Boolean))).sort(), [items]);
  const completion = Math.round(items.filter((item) => item.title && item.zone && item.day && item.startTime).length / Math.max(items.length, 1) * 100);

  function previewImport(kind: "quick" | "csv") {
    const parsed = kind === "quick" ? parseQuickProgram(quickText, defaultDay) : parseProgramCsv(csvText, defaultDay);
    if (parsed.errors.length) { setMessage(parsed.errors.join(" ")); return; }
    replaceItems([...items, ...parsed.items]);
    setMessage(`${parsed.items.length} itens preparados. Revê antes de guardar.`);
    setMode("visual");
  }

  function updateItem(localId: string, field: keyof ProgramDraft, value: string) {
    setItems((current) => current.map((item) => item.localId === localId ? { ...item, [field]: value } : item));
  }

  function duplicateItem(item: ProgramDraft) {
    replaceItems([...items, { ...item, id: undefined, localId: crypto.randomUUID(), title: `${item.title} (cópia)` }]);
  }

  function copyDay() {
    const source = items.filter((item) => item.day === defaultDay);
    if (!source.length) { setMessage("Não existem itens no dia selecionado."); return; }
    const nextDay = new Date(`${defaultDay}T12:00:00`); nextDay.setDate(nextDay.getDate() + 1);
    const day = nextDay.toISOString().slice(0, 10);
    replaceItems([...items, ...source.map((item) => ({ ...item, id: undefined, localId: crypto.randomUUID(), day }))]);
    setMessage(`Dia copiado para ${day}.`);
  }

  async function save() {
    setMessage("");
    if (!items.length) { setMessage("Adiciona pelo menos um item."); return; }
    if (items.some((item) => !item.title || !item.zone || !item.day || !item.startTime)) { setMessage("Revê os itens incompletos."); return; }
    setSaving(true);
    const timezone = event?.timezone || "Europe/Lisbon";
    const response = await fetch(`/api/organizer/events/${eventId}/program`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: items.map((item) => ({ id: item.id, title: item.title, zoneName: item.zone, programType: item.programType, status: item.status, scheduledStartAt: zonedDateTimeToIso(item.day, item.startTime, timezone), scheduledEndAt: item.endTime ? zonedDateTimeToIso(item.endTime <= item.startTime ? nextDay(item.day) : item.day, item.endTime, timezone) : null })) }) });
    const payload = await response.json() as { error?: string };
    setSaving(false);
    if (!response.ok) { setMessage(payload.error || "Não foi possível guardar."); return; }
    window.localStorage.removeItem(storageKey);
    setMessage("Programa guardado e confirmado.");
  }

  if (loading) return <main className="mx-auto max-w-6xl px-5 py-10"><p className="text-sm text-[var(--foreground-muted)]">A carregar programa...</p></main>;

  return <main className="mx-auto max-w-6xl px-5 py-8 pb-28 lg:px-8 lg:py-12">
    <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[var(--border)] pb-6">
      <div><p className="text-xs font-black uppercase text-danger">Programa e lineup</p><h1 className="mt-2 text-3xl font-black text-[var(--foreground)]">{event?.title || "Evento"}</h1><p className="mt-2 text-sm text-[var(--foreground-muted)]">Programa {completion}% completo · rascunho protegido neste dispositivo</p></div>
      <LinkButton href={`/organizador/eventos/${eventId}`} variant="secondary" size="sm">Voltar ao evento</LinkButton>
    </header>

    <SegmentedControl value={mode} onChange={setMode} label="Modo de edição" options={[{ value: "quick", label: "Rápido" }, { value: "csv", label: "CSV" }, { value: "visual", label: "Editor" }]} className="mt-6 max-w-xl" />

    {mode === "quick" && <section className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <label><span className="mb-2 block text-sm font-black">Colar programa</span><textarea value={quickText} onChange={(e) => setQuickText(e.target.value)} rows={15} className={`${fieldClass} resize-y py-3 font-mono`} placeholder={"Palco Principal\n18:00 Banda A\n19:15-20:00 Banda B\n\nPalco Secundário\n18:30 DJ X"} /></label>
      <div><label><span className="mb-2 block text-sm font-black">Dia</span><input type="date" value={defaultDay} onChange={(e) => setDefaultDay(e.target.value)} className={fieldClass} /></label><Button onClick={() => previewImport("quick")} className="mt-4 w-full">Pré-visualizar</Button></div>
    </section>}

    {mode === "csv" && <section className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <label><span className="mb-2 block text-sm font-black">CSV</span><textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={15} className={`${fieldClass} resize-y py-3 font-mono`} placeholder={"day,zone,start_time,end_time,title,artist,type,status\n2026-08-01,Palco 1,18:00,19:00,Banda A,Banda A,concert,confirmed"} /></label>
      <div><label><span className="mb-2 block text-sm font-black">Dia por omissão</span><input type="date" value={defaultDay} onChange={(e) => setDefaultDay(e.target.value)} className={fieldClass} /></label><Button onClick={() => previewImport("csv")} className="mt-4 w-full">Validar CSV</Button></div>
    </section>}

    {mode === "visual" && <section className="mt-7">
      <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => replaceItems([...items, { localId: crypto.randomUUID(), day: defaultDay, zone: zones[0] || "Palco principal", startTime: "18:00", endTime: "19:00", title: "", programType: "other", status: "draft" }])}>Adicionar item</Button><Button size="sm" variant="secondary" onClick={copyDay}>Copiar dia</Button><Button size="sm" variant="ghost" disabled={!undo.length} onClick={() => { const previous = undo.at(-1); if (previous) { setItems(previous); setUndo((history) => history.slice(0, -1)); } }}>Desfazer</Button></div>

      {zones.length > 0 && <div className="mt-6 grid gap-3 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${zones.length}, minmax(220px, 1fr))` }}>
        {zones.map((zone) => <div key={zone} className="min-h-28 border-t-2 border-danger bg-[var(--surface)] p-3" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const localId = e.dataTransfer.getData("text/plain"); if (localId) updateItem(localId, "zone", zone); }}><h2 className="text-sm font-black">{zone}</h2>{items.filter((item) => item.zone === zone).map((item) => <div key={item.localId} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", item.localId)} className="mt-3 cursor-grab border-l-2 border-[var(--border-strong)] pl-3 text-xs"><strong>{item.startTime}</strong><p className="truncate">{item.title || "Sem título"}</p></div>)}</div>)}
      </div>}

      <div className="mt-7 overflow-x-auto border-y border-[var(--border)]"><table className="w-full min-w-[960px] text-left text-sm"><thead className="text-xs uppercase text-[var(--foreground-muted)]"><tr>{["Dia", "Início", "Fim", "Palco", "Título", "Tipo", "Estado", "Ações"].map((label) => <th key={label} className="px-2 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border)]">{items.map((item) => <tr key={item.localId}><td className="p-2"><input type="date" value={item.day} onChange={(e) => updateItem(item.localId, "day", e.target.value)} className={fieldClass} /></td><td className="p-2"><input type="time" value={item.startTime} onChange={(e) => updateItem(item.localId, "startTime", e.target.value)} className={fieldClass} /></td><td className="p-2"><input type="time" value={item.endTime} onChange={(e) => updateItem(item.localId, "endTime", e.target.value)} className={fieldClass} /></td><td className="p-2"><input value={item.zone} onChange={(e) => updateItem(item.localId, "zone", e.target.value)} className={fieldClass} /></td><td className="p-2"><input value={item.title} onChange={(e) => updateItem(item.localId, "title", e.target.value)} className={fieldClass} /></td><td className="p-2"><select value={item.programType} onChange={(e) => updateItem(item.localId, "programType", e.target.value)} className={fieldClass}>{typeOptions.map((value) => <option key={value}>{value}</option>)}</select></td><td className="p-2"><select value={item.status} onChange={(e) => updateItem(item.localId, "status", e.target.value)} className={fieldClass}>{statusOptions.map((value) => <option key={value}>{value}</option>)}</select></td><td className="p-2"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => duplicateItem(item)}>Duplicar</Button>{!item.id && <Button size="sm" variant="ghost" onClick={() => replaceItems(items.filter((candidate) => candidate.localId !== item.localId))}>Remover</Button>}</div></td></tr>)}</tbody></table></div>
    </section>}

    {message && <p role="status" className="mt-5 border-l-2 border-danger pl-3 text-sm text-[var(--foreground-secondary)]">{message}</p>}
    <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-6"><p className="text-xs text-[var(--foreground-muted)]">{items.length} itens · alterações existentes nunca são removidas automaticamente</p><LoadingButton loading={saving} loadingText="A guardar..." onClick={save}>Guardar programa</LoadingButton></footer>
  </main>;
}
