"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AppIcon } from "@/components/AppIcon";

const GlobalSearch = dynamic(() => import("@/components/GlobalSearch"), { ssr: false });

export function SearchButton() {
  const [open, setOpen] = useState(false);

  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="Abrir pesquisa" className="grid h-11 w-11 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">
      <AppIcon name="search" />
    </button>
    {open && <GlobalSearch onClose={() => setOpen(false)} />}
  </>;
}
