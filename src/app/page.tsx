import { AccountCommunityCard } from "@/components/home/AccountCommunityCard";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeNavigationCard } from "@/components/home/HomeNavigationCard";
import { MinimalFooter } from "@/components/home/MinimalFooter";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#080808] px-4 pb-24 text-[#f2f1ec] sm:px-6 lg:px-10 lg:pb-0">
      <div className="mx-auto max-w-7xl">
        <HomeHero />

        <section aria-label="Explorar a Paranoid" className="grid gap-4 md:grid-cols-2 lg:gap-6">
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
