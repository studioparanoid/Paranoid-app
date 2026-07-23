import { EventCardSkeleton } from "@/components/LoadingSkeleton";

export default function ForYouLoading() {
  return <main className="min-h-screen bg-background px-4 py-6 text-foreground lg:px-10 lg:py-10"><section className="mx-auto max-w-6xl"><EventCardSkeleton rows={5} /></section></main>;
}
