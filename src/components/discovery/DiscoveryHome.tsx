"use client";

import { useState } from "react";
import { DiscoveryFeed } from "@/components/discovery/DiscoveryFeed";
import { SmartHub } from "@/components/home/SmartHub";
import type { HubHistoryItem } from "@/lib/hub/types";

export function DiscoveryHome() {
  const [history, setHistory] = useState<HubHistoryItem[]>([]);

  return (
    <SmartHub
      discoveryMode
      onHistoryChange={setHistory}
      discoveryFeed={<DiscoveryFeed history={history} />}
    />
  );
}
