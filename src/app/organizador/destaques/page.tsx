import { OrganizerFrequencyClient } from "@/components/billing/OrganizerFrequencyClient";

export default function OrganizerHighlightsPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-8 pb-28 text-foreground lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-6xl">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-danger">
          Organizador
        </p>
        <h1 className="mb-7 text-5xl font-black leading-none tracking-tight lg:text-7xl">
          Destaques.
        </h1>

        <OrganizerFrequencyClient />
      </section>
    </main>
  );
}
