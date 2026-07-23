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
  return <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
    {items.map((item) => {
      const content = <>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded bg-[var(--surface-secondary)] ${item.tone === "danger" ? "text-danger" : "text-[var(--foreground-muted)]"}`}><AppIcon name={item.icon} className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><span className={`block text-sm font-bold ${item.tone === "danger" ? "text-danger" : "text-[var(--foreground)]"}`}>{item.label}</span>{item.description && <span className="mt-0.5 block text-xs text-[var(--foreground-muted)]">{item.description}</span>}</span>
        <AppIcon name="chevron" className="interactive h-4 w-4 shrink-0 text-[var(--border-strong)] group-hover:translate-x-0.5 group-hover:text-[var(--foreground-muted)]" />
      </>;
      const className = "group interactive pressable focus-ring flex min-h-16 w-full items-center gap-3 rounded py-3 text-left hover:bg-[var(--surface-hover)]";
      if (item.href) return <Link key={`${item.label}-${item.href}`} href={item.href} className={className}>{content}</Link>;
      return <button key={item.label} type="button" onClick={item.onClick} className={className}>{content}</button>;
    })}
  </div>;
}
