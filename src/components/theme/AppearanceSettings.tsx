"use client";

import { Modal } from "@/components/ui/Modal";
import { ThemeSelector } from "@/components/theme/ThemeSelector";

export function AppearanceSettings({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Escolher tema">
      <ThemeSelector />
    </Modal>
  );
}
