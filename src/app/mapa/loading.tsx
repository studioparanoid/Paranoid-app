import { MapLoadingState } from "@/components/LoadingSkeleton";

export default function MapLoading() {
  return (
    <main className="min-h-[calc(100vh-5rem)] bg-black pb-24 text-[#f5f5f2] lg:min-h-screen lg:pb-0">
      <MapLoadingState />
    </main>
  );
}
