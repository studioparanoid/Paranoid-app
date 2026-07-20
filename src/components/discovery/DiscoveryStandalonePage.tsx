"use client";

import { DiscoveryFeed } from "@/components/discovery/DiscoveryFeed";

export function DiscoveryStandalonePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-4 pb-28 text-[var(--foreground)] sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-[52rem]">
        <DiscoveryFeed history={[]} standalone />
      </section>
    </main>
  );
}
