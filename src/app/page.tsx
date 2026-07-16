import { AccountCommunityCard } from "@/components/home/AccountCommunityCard";
import { HomeNavigationCard } from "@/components/home/HomeNavigationCard";
import { MinimalFooter } from "@/components/home/MinimalFooter";
import { SmartHub } from "@/components/home/SmartHub";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 pb-24 text-[var(--foreground)] sm:px-6 lg:px-10 lg:pb-0">
      <div className="mx-auto max-w-7xl">
        <SmartHub />

        <section aria-label="Explorar a Paranoid" className="brand-surface grid gap-4 border-t border-[var(--border)] pt-8 md:grid-cols-2 lg:gap-6">
          <HomeNavigationCard
            href="/agenda"
            image="/images/home-agenda.webp"
            eyebrow="Acontece agora"
            title="Agenda"
            description="Vê o que está a acontecer."
            imageAlt="Concerto independente numa sala alternativa"
            eager
          />
          <HomeNavigationCard
            href="/loja"
            image="/images/home-shop.webp"
            eyebrow="Edições independentes"
            title="Loja"
            description="Merch, edições e cenas independentes."
            imageAlt="Merch e edições independentes numa oficina de serigrafia"
          />
        </section>

        <AccountCommunityCard />
        <MinimalFooter />
      </div>
    </main>
  );
}
