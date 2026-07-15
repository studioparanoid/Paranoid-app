import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/server-guards";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return children;
}
