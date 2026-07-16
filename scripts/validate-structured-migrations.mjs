import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationNames = [
  "20260716130000_structured_entities.sql",
  "20260716131000_structured_events.sql",
  "20260716132000_event_operations.sql",
  "20260716133000_structured_rls.sql",
  "20260716134000_structured_backfill.sql",
];
const root = process.cwd();
const sql = migrationNames.map((name) => readFileSync(join(root, "supabase", "migrations", name), "utf8")).join("\n").toLowerCase();

const requiredTables = [
  "user_preferences", "organizer_private_details", "communities", "community_members",
  "genres", "artist_genres", "artist_members", "artist_professional_details",
  "venue_features", "venue_opening_hours", "venue_opening_exceptions", "event_types",
  "event_categories", "event_category_links", "event_days", "event_zones",
  "event_program_items", "program_item_artists", "ticket_channels", "ticket_products",
  "event_vendors", "menu_categories", "menu_items", "allergens", "menu_item_allergens",
  "promotions", "promotion_items", "event_services", "event_transport_routes",
  "event_transport_departures", "live_status_updates", "event_templates",
  "data_migration_review_items",
];

for (const table of requiredTables) {
  assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`), `Missing table ${table}`);
  const directRls = new RegExp(`alter table public\\.${table} enable row level security`).test(sql);
  const loopRls = sql.includes("execute format('alter table public.%i enable row level security'") && new RegExp(`'${table}'`).test(sql);
  assert.ok(directRls || loopRls, `Missing RLS for ${table}`);
}

for (const index of [
  "events_publication_starts_idx", "events_organizer_id_idx", "events_primary_venue_id_idx",
  "event_days_event_date_idx", "event_program_items_event_start_idx",
  "event_program_items_zone_start_idx", "program_item_artists_artist_idx",
  "live_status_updates_event_expiry_idx", "live_status_updates_target_idx", "event_vendors_event_idx",
  "menu_items_vendor_available_idx", "promotions_event_dates_idx",
  "transport_departures_route_start_idx",
]) assert.match(sql, new RegExp(`create index if not exists ${index}\\b`), `Missing index ${index}`);

assert.match(sql, /expires_at timestamptz not null/);
assert.match(sql, /expires_at > starts_at/);
assert.match(sql, /where starts_at <= now\(\) and expires_at > now\(\)/);
assert.doesNotMatch(sql, /drop\s+(table|column)\b/);
assert.match(sql, /legacy compatibility/);

console.log(`Validated ${migrationNames.length} structured migrations, ${requiredTables.length} tables and their RLS declarations.`);
