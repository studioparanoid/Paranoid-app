export const siteUrl = "https://paranoid.pt";
export const siteName = "Paranoid";

export function truncateDescription(value: string | null | undefined, fallback: string, max = 160) {
  const text = (value || "").trim();
  if (!text) return fallback;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function absoluteImageUrl(url: string | null | undefined) {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${siteUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}
