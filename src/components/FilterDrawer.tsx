"use client";

import { useEffect } from "react";
import { AppIcon } from "@/components/AppIcon";

export function FilterDrawer({ open, title = "Filtros", onClose, children, footer }: { open: boolean; title?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;
  return <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside role="dialog" aria-modal="true" aria-label={title} className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-lg border-t border-zinc-800 bg-[#0b0b0b] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-[#f2f1ec] sm:inset-y-0 sm:left-auto sm:w-full sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0 sm:p-7">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-[#0b0b0b] pb-5"><h2 className="text-xl font-black">{title}</h2><button type="button" onClick={onClose} aria-label="Fechar filtros" className="grid h-11 w-11 place-items-center rounded-full border border-zinc-800"><AppIcon name="close" /></button></div>
      <div className="space-y-5">{children}</div>
      {footer && <div className="sticky bottom-0 mt-6 border-t border-zinc-900 bg-[#0b0b0b] pt-4">{footer}</div>}
    </aside>
  </div>;
}
