export function isDiscoveryFeedEnabled() {
  return process.env.NEXT_PUBLIC_DISCOVERY_FEED_ENABLED === "true";
}
