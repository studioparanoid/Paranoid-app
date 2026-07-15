import type { ReactNode } from "react";
import { requireAuthenticated } from "@/lib/auth/server-guards";

export default async function SubmitLayout({ children }: { children: ReactNode }) {
  await requireAuthenticated("/submeter");
  return children;
}
