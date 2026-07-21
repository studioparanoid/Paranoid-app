"use client";

import { useRef, type ReactNode } from "react";
import { AppIcon } from "@/components/AppIcon";
import { Button, IconButton, LoadingButton } from "@/components/ui/Button";
import { useDialogBehavior } from "@/hooks/useDialogBehavior";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  useDialogBehavior({ open, onClose, containerRef: dialogRef });

  if (!open) return null;
  return (
    <div className="ui-overlay fixed inset-0 z-[110] grid items-end p-3 sm:place-items-center" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby={description ? "modal-description" : undefined} className="ui-sheet shadow-modal flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col rounded-lg border border-[var(--border)] bg-[var(--modal-background)] text-[var(--foreground)]">
        <div className="min-h-0 overflow-y-auto overscroll-contain p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="modal-title" className="text-xl font-black">{title}</h2>
              {description && <p id="modal-description" className="mt-2 text-sm text-[var(--foreground-muted)]">{description}</p>}
            </div>
            <IconButton label="Fechar" onClick={onClose}><AppIcon name="close" /></IconButton>
          </div>
          <div className="mt-6">{children}</div>
        </div>
      </section>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Voltar",
  loading = false,
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
        <LoadingButton loading={loading} loadingText="A confirmar..." variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</LoadingButton>
      </div>
    </Modal>
  );
}
