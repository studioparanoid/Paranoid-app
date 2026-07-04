import { PersonalizedFeedClient } from "@/components/PersonalizedFeedClient";
import { getEvents } from "@/lib/events";

export default async function PersonalizedFeedPage() {
  const events = await getEvents();

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Para ti
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          O feed deixa de ser neutro.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Quanto mais segues, guardas e escolhes, mais a agenda começa a bater
          contigo.
        </p>

        <PersonalizedFeedClient events={events || []} />
      </section>
    </main>
  );
}