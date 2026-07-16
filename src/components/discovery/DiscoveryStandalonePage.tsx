"use client";

import { DiscoveryFeed } from "@/components/discovery/DiscoveryFeed";

export function DiscoveryStandalonePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 pb-28 text-[var(--foreground)] sm:px-6 lg:px-10 lg:py-10">
      <section className="mx-auto max-w-[52rem]">
        <header className="mb-8 sm:mb-10">
          <p className="text-xs font-black uppercase text-red-600">Paranoid</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Para ti</h1>
          <p className="mt-2 text-sm text-[var(--foreground-muted)]">O que podes fazer a seguir.</p>
        </header>
        <DiscoveryFeed history={[]} standalone />
      </section>
    </main>
  );
}
