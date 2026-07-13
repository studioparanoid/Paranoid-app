"use client";

export default function ForYouError({ reset }: { reset: () => void }) {
  return <main className="grid min-h-[60vh] place-items-center bg-[#0b0b0b] px-5 text-center text-[#f2f1ec]"><div><h1 className="text-3xl font-black">Não foi possível preparar o teu feed.</h1><button type="button" onClick={reset} className="mt-5 rounded-full bg-[#f2f1ec] px-5 py-3 text-sm font-black text-black">Tentar novamente</button></div></main>;
}
