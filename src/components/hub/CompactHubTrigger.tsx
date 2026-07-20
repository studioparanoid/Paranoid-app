"use client";

import { useHubOverlay } from "@/components/hub/HubOverlayProvider";
import { ParanoidMark } from "@/components/navigation/ParanoidIconSystem";

export function CompactHubTrigger({ className = "" }: { className?: string }) {
  const { isHubOpen, openHub } = useHubOverlay();

  return (
    <button
      type="button"
      onClick={openHub}
      aria-label="Pergunta à Paranoid"
      aria-expanded={isHubOpen}
      className={`focus-ring pressable group flex min-h-11 w-full items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface)] py-2 pl-2 pr-4 text-left ${className}`}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--surface-secondary)] text-[var(--foreground)]">
        <ParanoidMark className="h-4 w-4" active={isHubOpen} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--foreground-muted)] transition-colors group-hover:text-[var(--foreground-secondary)]">
        Pergunta à Paranoid…
      </span>
    </button>
  );
}
