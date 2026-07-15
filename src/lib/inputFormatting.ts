export function postalCodeDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 7);
}

export function formatPortuguesePostalCode(value: string) {
  const digits = postalCodeDigits(value);
  return digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
}

export function normalizePortuguesePostalCode(value: string) {
  const formatted = formatPortuguesePostalCode(value);
  return /^\d{4}-\d{3}$/.test(formatted) ? formatted : "";
}

export function isValidPortuguesePostalCode(value: string) {
  return normalizePortuguesePostalCode(value).length === 8;
}

export function sanitizeDecimalInput(value: string) {
  const clean = value.replace(/[^\d,.]/g, "").replace(/\./g, ",");
  const [whole = "", ...decimalParts] = clean.split(",");
  const decimals = decimalParts.join("").slice(0, 2);
  return decimalParts.length > 0 ? `${whole.slice(0, 8)},${decimals}` : whole.slice(0, 8);
}

export function normalizeDecimalValue(value: string) {
  const clean = sanitizeDecimalInput(value).replace(",", ".");
  if (!clean || clean === ".") return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : null;
}

export function formatDecimalInput(value: string) {
  const parsed = normalizeDecimalValue(value);
  if (parsed === null) return "";
  return parsed.toLocaleString("pt-PT", { minimumFractionDigits: parsed % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
}
