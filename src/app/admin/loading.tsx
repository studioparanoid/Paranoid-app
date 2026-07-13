import { AdminListSkeleton } from "@/components/LoadingSkeleton";

export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <AdminListSkeleton />
      </section>
    </main>
  );
}
