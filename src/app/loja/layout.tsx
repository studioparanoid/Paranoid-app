import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loja",
  description: "Merch, edições e produtos de artistas e projetos independentes.",
};

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
