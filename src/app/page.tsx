import { AccountCommunityCard } from "@/components/home/AccountCommunityCard";
import { SmartHub } from "@/components/home/SmartHub";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 pb-8 text-[var(--foreground)] sm:px-6 lg:px-10 lg:pb-12">
      <div className="mx-auto max-w-5xl">
        <SmartHub />
        <AccountCommunityCard />
      </div>
    </main>
  );
}
