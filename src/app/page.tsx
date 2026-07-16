import { DiscoveryHome } from "@/components/discovery/DiscoveryHome";
import { SmartHub } from "@/components/home/SmartHub";
import { isDiscoveryFeedEnabled } from "@/lib/discovery/flag";

export default function HomePage() {
  return (
    <main className="hub-home-screen bg-[var(--background)] px-4 text-[var(--foreground)] sm:px-6 lg:px-10">
      {isDiscoveryFeedEnabled() ? <DiscoveryHome /> : <SmartHub />}
    </main>
  );
}
