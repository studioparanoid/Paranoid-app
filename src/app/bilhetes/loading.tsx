import { TicketSkeleton } from "@/components/LoadingSkeleton";

export default function TicketsLoading() {
  return <main className="min-h-screen bg-[#0b0b0b] px-4 py-6 text-[#f2f1ec] lg:px-10 lg:py-10"><section className="mx-auto max-w-5xl"><TicketSkeleton /></section></main>;
}
