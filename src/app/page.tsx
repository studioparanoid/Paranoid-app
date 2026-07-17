import { DiscoveryHome } from "@/components/discovery/DiscoveryHome";
import { SmartHub } from "@/components/home/SmartHub";
import { isDiscoveryFeedEnabled } from "@/lib/discovery/flag";
import { isMobileSimplificationEnabled } from "@/lib/mobile-simplification/flag";

export default function HomePage() {
  const mobileSimplificationEnabled = isMobileSimplificationEnabled();
  const discoveryFeedEnabled = isDiscoveryFeedEnabled();

  return (
    <main className={`hub-home-screen bg-[var(--background)] text-[var(--foreground)] ${mobileSimplificationEnabled ? "px-0 lg:px-10" : "px-4 sm:px-6 lg:px-10"}`}>
      {discoveryFeedEnabled || mobileSimplificationEnabled ? (
        <DiscoveryHome mobileSimplified={mobileSimplificationEnabled} desktopDiscoveryEnabled={discoveryFeedEnabled} />
      ) : (
        <SmartHub />
      )}
    </main>
  );
}
