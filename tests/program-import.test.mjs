import assert from "node:assert/strict";
import test from "node:test";
import { parseProgramCsv, parseQuickProgram, zonedDateTimeToIso } from "../src/lib/program-import.ts";

test("quick import supports multiple stages and overlapping schedules", () => {
  const parsed = parseQuickProgram("Palco 1\n18:00 Banda A\nPalco 2\n18:00 Banda B", "2026-08-01");
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.items.length, 2);
  assert.deepEqual(parsed.items.map((item) => item.zone), ["Palco 1", "Palco 2"]);
  assert.deepEqual(parsed.items.map((item) => item.startTime), ["18:00", "18:00"]);
});

test("CSV import validates required fields before calculating duration", () => {
  const parsed = parseProgramCsv("zone,start_time,title\nPalco 1,,Banda A", "2026-08-01");
  assert.equal(parsed.items.length, 0);
  assert.match(parsed.errors[0], /inválido/);
});

test("CSV import accepts quoted commas and explicit status", () => {
  const parsed = parseProgramCsv('day,zone,start_time,end_time,title,type,status\n2026-08-02,Palco 1,19:00,20:30,"Banda A, Convidado",concert,confirmed', "2026-08-01");
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.items[0].title, "Banda A, Convidado");
  assert.equal(parsed.items[0].status, "confirmed");
});

test("timezone conversion preserves a Lisbon summer local time", () => {
  assert.equal(zonedDateTimeToIso("2026-08-01", "18:00", "Europe/Lisbon"), "2026-08-01T17:00:00.000Z");
});
