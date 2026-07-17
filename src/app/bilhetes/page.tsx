import { PageHeader } from "@/components/PageHeader";
import { UserTicketsClient } from "@/components/UserTicketsClient";

export default function UserTicketsPage() {
  return <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-10 lg:py-10"><section className="mx-auto max-w-5xl"><PageHeader eyebrow="Carteira" title="Bilhetes" /><div className="mt-6"><UserTicketsClient /></div></section></main>;
}
