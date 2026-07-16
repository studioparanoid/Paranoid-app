import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ProgramInput = {
  id?: unknown;
  title?: unknown;
  zoneName?: unknown;
  programType?: unknown;
  scheduledStartAt?: unknown;
  scheduledEndAt?: unknown;
  status?: unknown;
};

const programTypes = new Set(["concert", "dj_set", "performance", "workshop", "screening", "talk", "conference", "signing", "meet_and_greet", "opening", "break", "afterparty", "transport", "activity", "other"]);
const programStatuses = new Set(["draft", "scheduled", "confirmed", "delayed", "starting_soon", "live", "finished", "moved", "cancelled"]);

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function validIso(value: unknown): string;
function validIso(value: unknown, required: false): string | null;
function validIso(value: unknown, required = true): string | null {
  if (!value && !required) return null;
  if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) throw new Error("Horário inválido.");
  return new Date(value).toISOString();
}

async function authorize(eventId: string, permission: "program") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Autenticação necessária." }, { status: 401 }) };
  const { data: event, error } = await supabase.from("events").select("id,title,organizer_id,start_date,end_date,timezone").eq("id", eventId).maybeSingle();
  if (error || !event?.organizer_id) return { error: NextResponse.json({ error: "Evento não encontrado." }, { status: 404 }) };
  const [{ data: admin }, { data: membership }] = await Promise.all([
    supabase.from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("organizer_members").select("role,status,can_manage_program").eq("organizer_id", event.organizer_id).eq("user_id", user.id).maybeSingle(),
  ]);
  const allowed = Boolean(admin) || Boolean(membership && membership.status === "active" && (["owner", "admin"].includes(membership.role) || membership.can_manage_program));
  if (!allowed) return { error: NextResponse.json({ error: `Sem permissão para gerir ${permission}.` }, { status: 403 }) };
  return { supabase, event };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await authorize(id, "program");
  if ("error" in access) return access.error;
  const { supabase, event } = access;
  const [days, zones, items] = await Promise.all([
    supabase.from("event_days").select("id,date,title,status,sort_order").eq("event_id", id).order("date"),
    supabase.from("event_zones").select("id,name,slug,zone_type,sort_order").eq("event_id", id).eq("status", "active").order("sort_order"),
    supabase.from("event_program_items").select("id,event_day_id,zone_id,title,program_type,scheduled_start_at,scheduled_end_at,status,sort_order").eq("event_id", id).order("scheduled_start_at"),
  ]);
  const error = days.error || zones.error || items.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 503 });
  return NextResponse.json({ event, days: days.data || [], zones: zones.data || [], items: items.data || [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await authorize(id, "program");
  if ("error" in access) return access.error;
  const { supabase } = access;
  const payload = await request.json().catch(() => null) as { items?: ProgramInput[] } | null;
  if (!payload || !Array.isArray(payload.items) || payload.items.length > 200) return NextResponse.json({ error: "Programa inválido." }, { status: 400 });

  try {
    const { data: currentZones, error: zonesError } = await supabase.from("event_zones").select("id,name,slug").eq("event_id", id);
    if (zonesError) throw zonesError;
    const zones = new Map((currentZones || []).map((zone) => [zone.name.trim().toLocaleLowerCase("pt-PT"), zone]));
    const savedIds: string[] = [];

    for (let index = 0; index < payload.items.length; index += 1) {
      const input = payload.items[index];
      const title = typeof input.title === "string" ? input.title.trim().slice(0, 180) : "";
      const zoneName = typeof input.zoneName === "string" ? input.zoneName.trim().slice(0, 100) : "";
      const programType = typeof input.programType === "string" && programTypes.has(input.programType) ? input.programType : "other";
      const status = typeof input.status === "string" && programStatuses.has(input.status) ? input.status : "scheduled";
      const start = validIso(input.scheduledStartAt);
      const end = validIso(input.scheduledEndAt, false);
      if (!title || !zoneName || (end && new Date(end) <= new Date(start))) throw new Error(`Revê o item ${index + 1}.`);

      const zoneKey = zoneName.toLocaleLowerCase("pt-PT");
      let zone = zones.get(zoneKey);
      if (!zone) {
        const baseSlug = slugify(zoneName) || `zona-${index + 1}`;
        const usedSlugs = new Set(Array.from(zones.values()).map((item) => item.slug));
        let zoneSlug = baseSlug;
        let suffix = 1;
        while (usedSlugs.has(zoneSlug)) { suffix += 1; zoneSlug = `${baseSlug}-${suffix}`; }
        const created = await supabase.from("event_zones").insert({ event_id: id, zone_type: "stage", name: zoneName, slug: zoneSlug, status: "active", sort_order: zones.size }).select("id,name,slug").single();
        if (created.error) throw created.error;
        zone = created.data;
        zones.set(zoneKey, zone);
      }

      const row = { event_id: id, zone_id: zone.id, title, program_type: programType, scheduled_start_at: start, scheduled_end_at: end, status, source_type: "organizer", last_confirmed_at: new Date().toISOString(), sort_order: index };
      if (typeof input.id === "string") {
        const updated = await supabase.from("event_program_items").update(row).eq("id", input.id).eq("event_id", id).select("id").single();
        if (updated.error) throw updated.error;
        savedIds.push(updated.data.id);
      } else {
        const inserted = await supabase.from("event_program_items").insert(row).select("id").single();
        if (inserted.error) throw inserted.error;
        savedIds.push(inserted.data.id);
      }
    }
    return NextResponse.json({ savedIds });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível guardar o programa." }, { status: 400 });
  }
}
