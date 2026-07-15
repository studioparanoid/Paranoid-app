import type { ReactNode } from "react";
import { requireAuthenticated } from "@/lib/auth/server-guards";

export default async function OrganizerLayout({ children }: { children: ReactNode }) {
  await requireAuthenticated("/organizador");
  return children;
}
