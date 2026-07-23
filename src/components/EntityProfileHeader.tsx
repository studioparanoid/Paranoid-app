"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { AppIcon } from "@/components/AppIcon";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";

export type EntityStat = { value: number; label: string };
export type EntityLink = { label: string; href: string; external?: boolean };

type EntityProfileHeaderProps = {
  kindLabel: string;
  name: string;
  imageUrl: string | null;
  city: string | null;
  tags?: string[];
  verified?: boolean;
  bio?: string | null;
  stats: EntityStat[];
  isFollowing: boolean;
  followLoading: boolean;
  onToggleFollow: () => void;
  links?: EntityLink[];
  message?: string | null;
  backHref?: string;
  backLabel?: string;
};

export function EntityProfileHeader({
  kindLabel,
  name,
  imageUrl,
  city,
  tags = [],
  verified = false,
  bio,
  stats,
  isFollowing,
  followLoading,
  onToggleFollow,
  links = [],
  message,
  backHref = "/descobrir",
  backLabel = "Rede Cultural",
}: EntityProfileHeaderProps) {
  return (
    <header className="pb-2">
      <Link href={backHref} className="pressable focus-ring mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-foreground-muted hover:text-foreground">
        <AppIcon name="chevron" className="h-3.5 w-3.5 rotate-180" />
        {backLabel}
      </Link>

      <div className="flex items-center gap-6 sm:gap-10">
        <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-accent/30 bg-accent/12 text-2xl font-black text-accent sm:h-28 sm:w-28 sm:text-3xl">
          {imageUrl ? <img src={imageUrl} alt={`Foto de ${name}`} className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-1 justify-around sm:justify-start sm:gap-10">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <span className="text-lg font-black sm:text-xl">{stat.value}</span>
              <span className="text-xs text-foreground-muted">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="truncate text-3xl font-bold tracking-tight sm:text-4xl">{name}</h1>
          {verified && <StatusBadge label="Verificado" tone="success" />}
        </div>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">{kindLabel}{city ? ` · ${city}` : ""}</p>
        {bio && <p className="mt-3 max-w-xl whitespace-pre-line text-sm leading-6 text-foreground-secondary">{bio}</p>}
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full border border-border px-3 py-1 text-xs font-bold text-foreground-secondary">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={onToggleFollow} disabled={followLoading} variant={isFollowing ? "secondary" : "primary"} className="min-w-32 flex-1 sm:flex-none">
          {followLoading ? "A guardar..." : isFollowing ? "A seguir" : "Seguir"}
        </Button>
        {links.map((link) => link.external ? (
          <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="pressable focus-ring rounded-full border border-border px-4 py-2 text-xs font-bold text-foreground-secondary hover:border-border-strong hover:text-foreground">{link.label}</a>
        ) : (
          <Link key={link.label} href={link.href} className="pressable focus-ring rounded-full border border-border px-4 py-2 text-xs font-bold text-foreground-secondary hover:border-border-strong hover:text-foreground">{link.label}</Link>
        ))}
      </div>

      {message && <p className="mt-4 rounded-xl border border-border bg-background-subtle p-3 text-sm text-foreground-secondary">{message}</p>}
    </header>
  );
}
