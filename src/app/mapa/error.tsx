"use client";

export default function MapError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-[calc(100vh-5rem)] place-items-center bg-black px-5 pb-24 text-[#f5f5f2] lg:min-h-screen lg:pb-0">
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-5">
        <p className="text-sm font-semibold text-[#f5f5f2]">
          Não consegui carregar o mapa.
        </p>
        <button
          type="button"
          onClick={reset}
          className="pressable focus-ring mt-4 rounded-xl bg-[#f5f5f2] px-5 py-3 text-sm font-semibold text-[#070707]"
        >
          Tentar outra vez
        </button>
      </div>
    </main>
  );
}
