import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agenda",
  description: "Todos os eventos de cultura alternativa em Portugal, atualizados todos os dias.",
};

export default function AgendaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
