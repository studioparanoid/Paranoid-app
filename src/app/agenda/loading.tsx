import { EventCardSkeleton } from "@/components/LoadingSkeleton";

export default function AgendaLoading() {
  return (
    <main className="min-h-screen bg-background px-5 py-8 pb-28 text-foreground lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <EventCardSkeleton rows={5} />
      </section>
    </main>
  );
}
