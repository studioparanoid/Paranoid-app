"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { IconButton } from "@/components/ui/Button";

const GlobalSearch = dynamic(() => import("@/components/GlobalSearch"), { ssr: false });

export function SearchButton() {
  const [open, setOpen] = useState(false);

  return <>
    <IconButton label="Abrir pesquisa" onClick={() => setOpen(true)}>
      <AppIcon name="search" />
    </IconButton>
    {open && <GlobalSearch onClose={() => setOpen(false)} />}
  </>;
}
