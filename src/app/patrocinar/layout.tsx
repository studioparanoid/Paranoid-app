import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patrocinar",
  description: "Patrocina a agenda cultural alternativa portuguesa.",
};

export default function PatrocinarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
