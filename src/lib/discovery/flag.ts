import { isMobileSimplificationEnabled } from "@/lib/mobile-simplification/flag";

export function isDiscoveryFeedEnabled() {
  return process.env.NEXT_PUBLIC_DISCOVERY_FEED_ENABLED === "true";
}

export function isDiscoveryApiEnabled() {
  return isDiscoveryFeedEnabled() || isMobileSimplificationEnabled();
}
