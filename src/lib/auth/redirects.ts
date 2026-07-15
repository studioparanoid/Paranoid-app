const FALLBACK_PATH = "/perfil";

export function safeInternalPath(value: string | null | undefined, fallback = FALLBACK_PATH) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;

  try {
    const url = new URL(value, "https://paranoid.local");
    if (url.origin !== "https://paranoid.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function loginPath(nextPath: string) {
  return `/login?next=${encodeURIComponent(safeInternalPath(nextPath))}`;
}
