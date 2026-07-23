"use client";

export default function ForYouError({ reset }: { reset: () => void }) {
  return <main className="grid min-h-[60vh] place-items-center bg-background px-5 text-center text-foreground"><div><h1 className="text-3xl font-bold tracking-tight">Não foi possível preparar o teu feed.</h1><button type="button" onClick={reset} className="pressable focus-ring mt-5 rounded-xl bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--background)]">Tentar novamente</button></div></main>;
}
