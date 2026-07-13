import Link from "next/link";
import { AppIcon } from "@/components/AppIcon";
import type { NavigationIcon } from "@/config/navigation";

export type SettingsListItem = {
  label: string;
  description?: string;
  icon: NavigationIcon;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "danger";
};

export function SettingsList({ items }: { items: SettingsListItem[] }) {
  return <div className="divide-y divide-zinc-900 border-y border-zinc-900">
    {items.map((item) => {
      const content = <>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded bg-zinc-950 ${item.tone === "danger" ? "text-red-500" : "text-zinc-500"}`}><AppIcon name={item.icon} className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><span className={`block text-sm font-bold ${item.tone === "danger" ? "text-red-400" : "text-zinc-200"}`}>{item.label}</span>{item.description && <span className="mt-0.5 block text-xs text-zinc-600">{item.description}</span>}</span>
        <AppIcon name="chevron" className="interactive h-4 w-4 shrink-0 text-zinc-800 group-hover:translate-x-0.5 group-hover:text-zinc-500" />
      </>;
      const className = "group interactive pressable focus-ring flex min-h-16 w-full items-center gap-3 rounded py-3 text-left hover:bg-zinc-950/70";
      if (item.href) return <Link key={`${item.label}-${item.href}`} href={item.href} className={className}>{content}</Link>;
      return <button key={item.label} type="button" onClick={item.onClick} className={className}>{content}</button>;
    })}
  </div>;
}
