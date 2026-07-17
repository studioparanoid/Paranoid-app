export function isDiscoveryFeedEnabled() {
  return process.env.NEXT_PUBLIC_DISCOVERY_FEED_ENABLED === "true";
}

export function isDiscoveryApiEnabled() {
  return isDiscoveryFeedEnabled() || process.env.NEXT_PUBLIC_MOBILE_SIMPLIFICATION_ENABLED === "true";
}
