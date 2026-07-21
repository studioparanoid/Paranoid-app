import { AlbumDetailClient } from "@/components/AlbumDetailClient";

export default async function AlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-3xl"><AlbumDetailClient albumId={id} /></section>
    </main>
  );
}
