import { getActiveSponsorshipCampaigns } from "@/lib/billing/sponsorships";

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
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-6xl">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-red-700">
          Parceiros
        </p>
        <h1 className="text-5xl font-black leading-none tracking-tight lg:text-8xl">
          Quem amplifica a Paranoid.
        </h1>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {campaigns.length === 0 && (
            <p className="rounded-[2rem] border border-zinc-900 bg-zinc-950 p-6 text-zinc-500">
              Ainda não há parceiros ativos.
            </p>
          )}

          {campaigns.map((campaign) => (
            <article
              key={campaign.id}
              className="rounded-[2rem] border border-zinc-900 bg-zinc-950 p-6"
            >
              <p className="text-xs font-black uppercase tracking-[0.35em] text-red-500">
                {productLabel(campaign.product_code)}
              </p>
              <h2 className="mt-4 text-3xl font-black">
                Parceiro Paranoid
              </h2>
              {campaign.founding_partner_number && (
                <p className="mt-4 inline-flex rounded-full bg-[#f2f1ec] px-3 py-1 text-xs font-black text-black">
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
