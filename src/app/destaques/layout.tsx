import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Destaques",
  description: "Dá mais visibilidade aos teus eventos com destaques pagos na Paranoid.",
};

export default function DestaquesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
