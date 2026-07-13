export function MinimalFooter() {
  return (
    <footer className="flex flex-col gap-4 border-t border-zinc-900 py-8 text-xs font-bold text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
      <p>Paranoid Studio · Cultura independente</p>
      <a href="mailto:info@paranoid.pt" className="focus-ring w-fit rounded hover:text-white">Contacto</a>
    </footer>
  );
}
