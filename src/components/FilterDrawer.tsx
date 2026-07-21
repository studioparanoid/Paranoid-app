"use client";

import { useRef } from "react";
import { AppIcon } from "@/components/AppIcon";
import { IconButton } from "@/components/ui/Button";
import { useDialogBehavior } from "@/hooks/useDialogBehavior";

export function FilterDrawer({ open, title = "Filtros", onClose, children, footer }: { open: boolean; title?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null);
  useDialogBehavior({ open, onClose, containerRef: dialogRef });

  if (!open) return null;
  return <div className="ui-overlay fixed inset-0 z-[90]" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="ui-sheet absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-lg border-t border-border bg-background text-foreground sm:inset-y-0 sm:left-auto sm:w-full sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0">
      <div className="min-h-0 overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-7">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-background pb-5"><h2 className="text-xl font-black">{title}</h2><IconButton label="Fechar filtros" variant="secondary" onClick={onClose}><AppIcon name="close" /></IconButton></div>
        <div className="space-y-5">{children}</div>
        {footer && <div className="sticky bottom-0 mt-6 border-t border-border bg-background pt-4">{footer}</div>}
      </div>
    </aside>
  </div>;
}
