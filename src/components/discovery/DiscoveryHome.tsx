"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { DiscoveryFeed } from "@/components/discovery/DiscoveryFeed";
import { CompactHubTrigger } from "@/components/hub/CompactHubTrigger";
import { SmartHub } from "@/components/home/SmartHub";
import { HUB_HISTORY_CHANGE_EVENT, readHubHistory } from "@/lib/hub/client-history";
import type { HubHistoryItem } from "@/lib/hub/types";

const desktopMediaQuery = "(min-width: 1024px)";

function subscribeToDesktopViewport(callback: () => void) {
  const mediaQuery = window.matchMedia(desktopMediaQuery);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getDesktopViewportSnapshot() {
  return window.matchMedia(desktopMediaQuery).matches;
}

function getDesktopViewportServerSnapshot() {
  return false;
}

export function DiscoveryHome({
  desktopDiscoveryEnabled = true,
  mobileSimplified = false,
}: {
  desktopDiscoveryEnabled?: boolean;
  mobileSimplified?: boolean;
}) {
  const [history, setHistory] = useState<HubHistoryItem[]>([]);
  const isDesktop = useSyncExternalStore(subscribeToDesktopViewport, getDesktopViewportSnapshot, getDesktopViewportServerSnapshot);

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

  if (!mobileSimplified || isDesktop) {
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
    <div className="min-h-[calc(100dvh-4.25rem-env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 bg-[color:var(--background)]/94 px-4 py-2 backdrop-blur-md">
        <CompactHubTrigger />
      </div>
      <DiscoveryFeed history={history} variant="immersive" />
    </div>
  );
}
