"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppIcon } from "@/components/AppIcon";
import { IconButton } from "@/components/ui/Button";

type ToastTone = "neutral" | "success" | "error";
type ToastInput = {
  message: string;
  tone?: ToastTone;
  duration?: number;
  action?: { label: string; onClick: () => void };
};
type ToastItem = ToastInput & { id: string };
type ToastContextValue = {
  toast: (input: string | ToastInput) => string;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((input: string | ToastInput) => {
    counterRef.current += 1;
    const item = typeof input === "string" ? { message: input } : input;
    const id = `toast-${Date.now()}-${counterRef.current}`;
    setToasts((current) => [...current.slice(-2), { ...item, id }]);
    return id;
  }, []);

  const value = useMemo(() => ({ toast, dismissToast }), [dismissToast, toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 bottom-[calc(5.4rem+env(safe-area-inset-bottom))] z-[130] mx-auto flex max-w-md flex-col gap-2 lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0 lg:w-[min(24rem,calc(100vw-3rem))]"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(item.id), item.duration ?? 3600);
    return () => window.clearTimeout(timer);
  }, [item.duration, item.id, onDismiss]);

  const tone = item.tone === "error"
    ? "border-[var(--danger)]/40 text-[var(--foreground)]"
    : item.tone === "success"
      ? "border-[var(--success)]/40 text-[var(--foreground)]"
      : "border-[var(--border-strong)] text-[var(--foreground)]";

  return (
    <div className={`ui-toast pointer-events-auto flex min-h-14 items-center gap-3 rounded-lg border bg-[var(--toast-background)] px-4 py-3 shadow-xl shadow-black/25 ${tone}`} role={item.tone === "error" ? "alert" : "status"}>
      <p className="min-w-0 flex-1 text-sm font-bold">{item.message}</p>
      {item.action && (
        <button
          type="button"
          className="pressable focus-ring shrink-0 rounded-full px-2 py-1 text-xs font-black text-[var(--accent)] hover:text-[var(--accent-hover)]"
          onClick={() => {
            item.action?.onClick();
            onDismiss(item.id);
          }}
        >
          {item.action.label}
        </button>
      )}
      <IconButton label="Fechar mensagem" className="h-9 w-9 border-0" onClick={() => onDismiss(item.id)}>
        <AppIcon name="close" className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast tem de ser usado dentro de ToastProvider");
  return context;
}
