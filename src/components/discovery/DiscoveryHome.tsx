"use client";

import { useEffect, useState } from "react";
import { DiscoveryFeed } from "@/components/discovery/DiscoveryFeed";
import { CompactHubTrigger } from "@/components/hub/CompactHubTrigger";
import { SmartHub } from "@/components/home/SmartHub";
import { HUB_HISTORY_CHANGE_EVENT, readHubHistory } from "@/lib/hub/client-history";
import type { HubHistoryItem } from "@/lib/hub/types";

export function DiscoveryHome({
  desktopDiscoveryEnabled = true,
  mobileSimplified = false,
}: {
  desktopDiscoveryEnabled?: boolean;
  mobileSimplified?: boolean;
}) {
  const [history, setHistory] = useState<HubHistoryItem[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setHistory(readHubHistory()), 0);
    const handleHistoryChange = (event: Event) => {
      const detail = (event as CustomEvent<HubHistoryItem[]>).detail;
      setHistory(Array.isArray(detail) ? detail : readHubHistory());
    };
    window.addEventListener(HUB_HISTORY_CHANGE_EVENT, handleHistoryChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(HUB_HISTORY_CHANGE_EVENT, handleHistoryChange);
    };
  }, []);

  if (!mobileSimplified) {
    if (!desktopDiscoveryEnabled) return <SmartHub />;
    return (
      <SmartHub
        discoveryMode
        onHistoryChange={setHistory}
        discoveryFeed={<DiscoveryFeed history={history} />}
      />
    );
  }

  return (
    <div className="mx-auto min-h-[calc(100dvh-4.25rem-env(safe-area-inset-bottom))] w-full max-w-2xl">
      <div className="sticky top-0 z-20 bg-[color:var(--background)]/94 px-4 py-2 backdrop-blur-md lg:top-16">
        <CompactHubTrigger />
      </div>
      <DiscoveryFeed history={history} variant="immersive" />
    </div>
  );
}
