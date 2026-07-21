"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { useAuth } from "@/components/auth/AuthProvider";
import { listFollowedShopEntities, type FollowedShopEntity } from "@/lib/shop";

export function FollowedShopsStrip() {
  const { user } = useAuth();
  const [entities, setEntities] = useState<FollowedShopEntity[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) {
        if (active) { setEntities([]); setLoaded(true); }
        return;
      }
      const result = await listFollowedShopEntities(user.id);
      if (active) { setEntities(result); setLoaded(true); }
    }
    void load();
    return () => {
      active = false;
    };
  }, [user]);

  if (!loaded) return <div className="h-16" aria-hidden="true" />;

  if (entities.length === 0) {
    return (
      <Link
        href="/loja"
        className="interactive focus-ring flex min-h-11 w-full items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface)] py-2 pl-2 pr-4 text-left"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--surface-secondary)] text-[var(--foreground)]">
          <AppIcon name="store" className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--foreground-muted)]">
          Loja Paranoid — merch de artistas e organizadores
        </span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-1">
      {entities.map((entity) => (
        <Link
          key={`${entity.type}:${entity.id}`}
          href={`/loja?vendedor=${encodeURIComponent(entity.vendorName)}`}
          title={entity.name}
          className="focus-ring group flex shrink-0 flex-col items-center gap-1"
        >
          <span className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] text-sm font-black text-[var(--accent)] transition-transform group-active:scale-95">
            {entity.imageUrl ? <img src={entity.imageUrl} alt="" className="h-full w-full object-cover" /> : entity.name.charAt(0).toUpperCase()}
          </span>
          <span className="max-w-14 truncate text-[10px] font-bold text-[var(--foreground-muted)]">{entity.name}</span>
        </Link>
      ))}
      <Link
        href="/loja"
        title="Ver loja"
        className="focus-ring group flex shrink-0 flex-col items-center gap-1"
      >
        <span className="grid h-12 w-12 place-items-center rounded-full border border-[var(--accent)] text-[var(--accent)] transition-transform group-active:scale-95">
          <AppIcon name="store" className="h-5 w-5" />
        </span>
        <span className="max-w-14 truncate text-[10px] font-bold text-[var(--foreground-muted)]">Loja</span>
      </Link>
    </div>
  );
}
