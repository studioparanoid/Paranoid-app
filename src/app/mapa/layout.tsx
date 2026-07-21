import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mapa",
  description: "Encontra eventos e espaços de cultura alternativa perto de ti.",
};

export default function MapaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
