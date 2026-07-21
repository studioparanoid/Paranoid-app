import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Descobrir",
  description: "Artistas, espaços e organizadores da cultura alternativa portuguesa.",
};

export default function DescobrirLayout({ children }: { children: React.ReactNode }) {
  return children;
}
