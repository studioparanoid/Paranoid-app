import { getActiveSponsorshipCampaigns } from "@/lib/billing/sponsorships";

export const dynamic = "force-dynamic";

function productLabel(code: string) {
  if (code === "paranoid_signal") {
    return "Paranoid Signal";
  }

  if (code === "paranoid_noise") {
    return "Paranoid Noise";
  }

  if (code === "paranoid_headliner") {
    return "Paranoid Headliner";
  }

  return "Parceiro";
}

export default async function PartnersPage() {
  const campaigns = await getActiveSponsorshipCampaigns();

  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-md lg:max-w-6xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
          Parceiros
        </p>
        <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
          Quem amplifica a Paranoid.
        </h1>

        <section className="mt-7 grid gap-4 lg:grid-cols-3">
          {campaigns.length === 0 && (
            <p className="rounded-2xl border border-border bg-surface p-6 text-foreground-muted">
              Ainda não há parceiros ativos.
            </p>
          )}

          {campaigns.map((campaign) => (
            <article
              key={campaign.id}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
                {productLabel(campaign.product_code)}
              </p>
              <h2 className="mt-3 text-xl font-black">
                Parceiro Paranoid
              </h2>
              {campaign.founding_partner_number && (
                <p className="mt-4 inline-flex rounded-full bg-foreground px-3 py-1 text-xs font-black text-background">
                  Parceiro Fundador #{campaign.founding_partner_number}
                </p>
              )}
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
