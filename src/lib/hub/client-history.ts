import type { HubHistoryItem } from "@/lib/hub/types";

export const HUB_HISTORY_KEY = "paranoid.hub-history";
export const HUB_HISTORY_CHANGE_EVENT = "paranoid:hub-history-change";
export const HUB_HISTORY_LIMIT = 32;

function isHistoryItem(item: unknown): item is HubHistoryItem {
  if (!item || typeof item !== "object") return false;
  const value = item as Partial<HubHistoryItem>;
  return Boolean(
    typeof value.id === "string" &&
    typeof value.query === "string" &&
    value.response &&
    typeof value.response.title === "string" &&
    Array.isArray(value.response.results) &&
    Array.isArray(value.response.actions),
  );
}

export function readHubHistory() {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.sessionStorage.getItem(HUB_HISTORY_KEY) || "[]") as unknown;
    return Array.isArray(value) ? value.filter(isHistoryItem).slice(-HUB_HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

export function writeHubHistory(history: HubHistoryItem[]) {
  const next = history.slice(-HUB_HISTORY_LIMIT);
  try {
    window.sessionStorage.setItem(HUB_HISTORY_KEY, JSON.stringify(next));
  } catch (storageError) {
    if (process.env.NODE_ENV === "development") console.warn("[hub] Não foi possível guardar a conversa na sessão.", storageError);
  }
  window.dispatchEvent(new CustomEvent(HUB_HISTORY_CHANGE_EVENT, { detail: next }));
  return next;
}

export function clearHubHistory() {
  try {
    window.sessionStorage.removeItem(HUB_HISTORY_KEY);
  } catch (storageError) {
    if (process.env.NODE_ENV === "development") console.warn("[hub] Não foi possível limpar a conversa guardada.", storageError);
  }
  window.dispatchEvent(new CustomEvent(HUB_HISTORY_CHANGE_EVENT, { detail: [] }));
}
