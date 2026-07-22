"use client";

import { useEffect, useRef, type RefObject } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function useDialogBehavior({
  open,
  onClose,
  containerRef,
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  const onCloseRef = useRef(onClose);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    // Pinning body with `position: fixed` to lock background scroll breaks
    // touch interaction (scroll and even focusing inputs) inside the dialog
    // itself once the on-screen keyboard opens on iOS Safari. Plain
    // `overflow: hidden` on the root element avoids that, at the minor cost
    // of not being bulletproof against background bounce on very old iOS.
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    const previousOverscroll = html.style.overscrollBehavior;
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    const frame = window.requestAnimationFrame(() => {
      const firstFocusable = containerRef.current?.querySelector<HTMLElement>(focusableSelector);
      (initialFocusRef?.current || firstFocusable || containerRef.current)?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !containerRef.current) return;
      const focusable = Array.from(containerRef.current.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
      if (focusable.length === 0) {
        event.preventDefault();
        containerRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      html.style.overflow = previousOverflow;
      html.style.overscrollBehavior = previousOverscroll;
      window.removeEventListener("keydown", handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [containerRef, initialFocusRef, open]);
}
