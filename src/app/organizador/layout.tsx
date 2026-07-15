import type { ReactNode } from "react";
import { requireAal2 } from "@/lib/auth/server-guards";

export default async function OrganizerLayout({ children }: { children: ReactNode }) {
  await requireAal2("/organizador");
  return children;
}
