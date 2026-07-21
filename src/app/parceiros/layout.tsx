import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parceiros",
  description: "Planos de parceria para organizadores e espaços culturais na Paranoid.",
};

export default function ParceirosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
