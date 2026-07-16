const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function requireUuid(value: string, field = "id") {
  if (!uuidPattern.test(value)) throw new Error(`${field} inválido.`);
  return value;
}

export function requireUuidOrSlug(value: string) {
  const clean = value.trim();
  if (!uuidPattern.test(clean) && !slugPattern.test(clean)) throw new Error("Evento inválido.");
  return clean;
}

export function cleanSearchTerm(value: string, maxLength = 80) {
  const clean = value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s'’-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
  if (clean.length < 2) throw new Error("Pesquisa demasiado curta.");
  return clean;
}

export function boundedLimit(value: number | undefined, fallback = 8, maximum = 25) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 1) throw new Error("Limite inválido.");
  return Math.min(value, maximum);
}

export function requireCoordinate(value: number, kind: "latitude" | "longitude") {
  const limit = kind === "latitude" ? 90 : 180;
  if (!Number.isFinite(value) || value < -limit || value > limit) throw new Error(`${kind} inválida.`);
  return value;
}

export function requireIsoDate(value: string, field = "data") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${field} inválida.`);
  return date.toISOString();
}
