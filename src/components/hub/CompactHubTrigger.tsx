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
      className={`focus-ring pressable group flex min-h-12 w-full items-center gap-3 border-y border-[var(--border)] py-2.5 text-left ${className}`}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center text-[var(--foreground)]">
        <ParanoidMark className="h-7 w-7" active={isHubOpen} />
      </span>
      <span className="min-w-0 flex-1 text-sm font-semibold text-[var(--foreground-secondary)] transition-colors group-hover:text-[var(--foreground)]">
        Pergunta à Paranoid…
      </span>
      <span aria-hidden="true" className="h-px w-5 bg-[var(--foreground-muted)] transition-[width] duration-150 group-hover:w-7" />
    </button>
  );
}
