import type { ReactNode } from "react";
import { requireAal2 } from "@/lib/auth/server-guards";

export default async function SubmitLayout({ children }: { children: ReactNode }) {
  await requireAal2("/submeter");
  return children;
}
