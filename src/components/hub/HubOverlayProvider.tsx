"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { SmartHub } from "@/components/home/SmartHub";
import { ParanoidCloseIcon } from "@/components/navigation/ParanoidIconSystem";
import { useToast } from "@/components/ui/Toast";
import type { HubResponse } from "@/lib/hub/types";

type HubOverlayContextValue = {
  closeHub: () => void;
  isHubOpen: boolean;
  openHub: () => void;
};

const HubOverlayContext = createContext<HubOverlayContextValue | null>(null);

export function HubOverlayProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { toast } = useToast();
  const [isHubOpen, setHubOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const openHub = useCallback(() => setHubOpen(true), []);
  const closeHub = useCallback(() => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    setHubOpen(false);
  }, []);
  const handleResponse = useCallback((response: HubResponse) => {
    const awaitingFollowUp = Boolean(response.context?.pendingQuestion);
    if (pathname === "/" && !awaitingFollowUp) {
      toast({ message: "A ajustar o Feed ao teu pedido.", tone: "success" });
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = window.setTimeout(() => setHubOpen(false), 520);
      return;
    }
    if (awaitingFollowUp) toast({ message: "A Paranoid precisa de mais um detalhe.", tone: "success" });
  }, [pathname, toast]);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  return (
    <HubOverlayContext.Provider value={{ closeHub, isHubOpen, openHub }}>
      {children}
      {isHubOpen && <HubOverlay onClose={closeHub} onResponse={handleResponse} />}
    </HubOverlayContext.Provider>
  );
}

export function useHubOverlay() {
  const context = useContext(HubOverlayContext);
  if (!context) throw new Error("useHubOverlay tem de ser usado dentro de HubOverlayProvider");
  return context;
}

function HubOverlay({ onClose, onResponse }: { onClose: () => void; onResponse: (response: HubResponse) => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const dragStartRef = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Plain overflow:hidden on <html>, not position:fixed on <body> — the
    // fixed-body lock breaks touch/keyboard focus inside the overlay itself
    // once the on-screen keyboard opens on iOS Safari (see useDialogBehavior.ts).
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    const previousOverscroll = html.style.overscrollBehavior;
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus({ preventScroll: true }), 80);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute("hidden"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      html.style.overflow = previousOverflow;
      html.style.overscrollBehavior = previousOverscroll;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [onClose]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    dragStartRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStartRef.current === null) return;
    setDragOffset(Math.max(0, event.clientY - dragStartRef.current));
  }

  function handlePointerEnd() {
    dragStartRef.current = null;
    if (dragOffset > 84) onClose();
    else setDragOffset(0);
  }

  return (
    <div className="fixed inset-0 z-[90]" role="presentation">
      <button
        type="button"
        aria-label="Fechar Paranoid Hub"
        className="hub-overlay-backdrop absolute inset-0 cursor-default bg-[var(--brand-surface)]"
        onClick={onClose}
      />
      <section
        ref={dialogRef}
        id="paranoid-hub-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Paranoid Hub"
        className="hub-overlay-sheet brand-surface absolute inset-0 flex h-full w-full flex-col bg-[var(--brand-surface)] px-4 pb-[env(safe-area-inset-bottom)] sm:px-6"
        style={{ transform: dragOffset ? `translateY(${dragOffset}px)` : undefined }}
      >
        <div
          className="touch-none py-2 lg:hidden"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          aria-hidden="true"
        >
          <span className="mx-auto block h-1 w-9 rounded-full bg-[var(--foreground-muted)] opacity-45" />
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Fechar Paranoid Hub"
          className="focus-ring pressable absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center text-[var(--foreground-muted)] hover:text-[var(--foreground)] sm:right-5 sm:top-4"
        >
          <ParanoidCloseIcon className="h-5 w-5" />
        </button>
        <div className="min-h-0 flex-1 overflow-hidden pr-12 lg:pr-10">
          <SmartHub instanceId="overlay" overlayMode onResponse={onResponse} onBeforeNavigate={onClose} />
        </div>
      </section>
    </div>
  );
}
