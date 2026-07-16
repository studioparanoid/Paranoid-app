export type ProgramDraft = {
  localId: string;
  id?: string;
  day: string;
  zone: string;
  startTime: string;
  endTime: string;
  title: string;
  programType: string;
  status: string;
};

function addMinutes(time: string, minutes: number) {
  const [hours, currentMinutes] = time.split(":").map(Number);
  const total = hours * 60 + currentMinutes + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function makeDraft(input: Omit<ProgramDraft, "localId">): ProgramDraft {
  return { ...input, localId: crypto.randomUUID() };
}

export function parseQuickProgram(text: string, defaultDay: string) {
  const items: ProgramDraft[] = [];
  const errors: string[] = [];
  let zone = "Palco principal";
  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;
    const match = line.match(/^(\d{1,2}:\d{2})(?:\s*[-–]\s*(\d{1,2}:\d{2}))?\s+(.+)$/);
    if (!match) {
      if (/^\d{1,2}(?::|\s)/.test(line)) errors.push(`Linha ${index + 1}: formato não reconhecido.`);
      else zone = line.replace(/:$/, "").trim();
      return;
    }
    const startTime = match[1].padStart(5, "0");
    const endTime = match[2]?.padStart(5, "0") || addMinutes(startTime, 60);
    if (startTime >= "24:00" || endTime >= "24:00") {
      errors.push(`Linha ${index + 1}: hora inválida.`);
      return;
    }
    items.push(makeDraft({ day: defaultDay, zone, startTime, endTime, title: match[3].trim(), programType: "concert", status: "scheduled" }));
  });
  return { items, errors };
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { value += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(value.trim()); value = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; value = ""; continue;
    }
    value += char;
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return { rows, quoted };
}

export function parseProgramCsv(text: string, defaultDay: string) {
  const { rows, quoted } = parseCsvRows(text);
  const errors: string[] = quoted ? ["Existe uma aspa sem fecho no CSV."] : [];
  if (!rows.length) return { items: [] as ProgramDraft[], errors: ["O CSV está vazio."] };
  const headers = rows[0].map((header) => header.toLowerCase().replace(/\s+/g, "_"));
  const required = ["zone", "start_time", "title"];
  required.forEach((header) => { if (!headers.includes(header)) errors.push(`Falta a coluna ${header}.`); });
  if (errors.length) return { items: [] as ProgramDraft[], errors };
  const indexOf = (name: string) => headers.indexOf(name);
  const items = rows.slice(1).flatMap((row, rowIndex) => {
    const rawStartTime = row[indexOf("start_time")]?.trim();
    const title = row[indexOf("title")]?.trim();
    const zone = row[indexOf("zone")]?.trim();
    const day = (indexOf("day") >= 0 ? row[indexOf("day")] : "") || defaultDay;
    const startTime = rawStartTime?.padStart(5, "0");
    if (!day || !zone || !startTime || !title || !/^\d{2}:\d{2}$/.test(startTime)) {
      errors.push(`Linha ${rowIndex + 2}: dia, palco, hora ou título inválido.`);
      return [];
    }
    const rawEndTime = indexOf("end_time") >= 0 ? row[indexOf("end_time")]?.trim() : "";
    const endTime = rawEndTime ? rawEndTime.padStart(5, "0") : addMinutes(startTime, 60);
    if (!/^\d{2}:\d{2}$/.test(endTime) || startTime >= "24:00" || endTime >= "24:00") {
      errors.push(`Linha ${rowIndex + 2}: hora de fim inválida.`);
      return [];
    }
    return [makeDraft({ day, zone, startTime, endTime, title, programType: (indexOf("type") >= 0 ? row[indexOf("type")] : "") || "other", status: (indexOf("status") >= 0 ? row[indexOf("status")] : "") || "scheduled" })];
  });
  return { items, errors };
}

export function zonedDateTimeToIso(day: string, time: string, timeZone = "Europe/Lisbon") {
  const [year, month, date] = day.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  let timestamp = Date.UTC(year, month - 1, date, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    timestamp -= represented - Date.UTC(year, month - 1, date, hour, minute);
  }
  return new Date(timestamp).toISOString();
}
