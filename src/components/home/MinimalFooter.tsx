export function MinimalFooter() {
  return (
    <footer className="flex flex-col gap-4 border-t border-border py-8 text-xs font-bold text-foreground-muted sm:flex-row sm:items-center sm:justify-between">
      <p>Paranoid Studio · Cultura independente</p>
      <a href="mailto:info@paranoid.pt" className="focus-ring w-fit rounded hover:text-white">Contacto</a>
    </footer>
  );
}
