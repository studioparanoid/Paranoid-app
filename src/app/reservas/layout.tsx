import type { ReactNode } from "react";
import { requireAuthenticated } from "@/lib/auth/server-guards";

export default async function ReservasLayout({ children }: { children: ReactNode }) {
  await requireAuthenticated("/reservas");
  return children;
}
