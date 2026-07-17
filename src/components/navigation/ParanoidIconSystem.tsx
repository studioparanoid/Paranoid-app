import type { ReactNode } from "react";

export type ParanoidIconProps = {
  active?: boolean;
  className?: string;
};

type ParanoidIconFrameProps = ParanoidIconProps & {
  children: ReactNode;
  viewBox?: string;
};

export function ParanoidIcon({ active = false, className = "h-6 w-6", children, viewBox = "0 0 32 32" }: ParanoidIconFrameProps) {
  return (
    <svg viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className} data-active={active || undefined}>
      {children}
    </svg>
  );
}

export function ParanoidMark({ active = false, className = "h-7 w-6" }: ParanoidIconProps) {
  return (
    <ParanoidIcon active={active} className={className} viewBox="0 0 28 32">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M3 3h11.1C20.3 3 24 6.2 24 11.4c0 5.4-3.8 8.7-10 8.7h-3.6v7.1l2.4 1.8H3l2.6-1.8V6L3 3Zm7.4 4.3v8.5h3.2c3.2 0 4.8-1.4 4.8-4.3 0-2.9-1.6-4.2-4.8-4.2h-3.2Z"
        opacity={active ? 1 : 0.8}
      />
    </ParanoidIcon>
  );
}

export function ParanoidHomeIcon({ active = false, className }: ParanoidIconProps) {
  return (
    <ParanoidIcon active={active} className={className}>
      {active && <path d="M7 9h18v17h-4V13H11v13H7V9Z" fill="currentColor" opacity="0.18" />}
      <path d="M6 27V8h20v19M11 27V13h10v14M4 27h24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" />
    </ParanoidIcon>
  );
}

export function ParanoidMapIcon({ active = false, className }: ParanoidIconProps) {
  return (
    <ParanoidIcon active={active} className={className}>
      {active && <path d="m13 6 7 3v16l-7-2.5V6Z" fill="currentColor" opacity="0.18" />}
      <path d="M6 9 13 6l7 3 6-3v18l-6 3-7-3-7 3V9Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" />
      <path d="M13 6v18M20 9v18" stroke="currentColor" strokeWidth="1.6" />
      {active && <path d="m16.5 13.5 2.5 2.3-2.5 2.7-2.5-2.7 2.5-2.3Z" fill="currentColor" />}
    </ParanoidIcon>
  );
}

export function ParanoidTicketIcon({ active = false, className }: ParanoidIconProps) {
  return (
    <ParanoidIcon active={active} className={className}>
      {active && <path d="M6 10h20v3.5c-2 0-3 1-3 2.5s1 2.5 3 2.5V22H6v-3.5c2 0 3-1 3-2.5s-1-2.5-3-2.5V10Z" fill="currentColor" opacity="0.18" />}
      <path d="M5 9h22v5c-2 0-3 0.8-3 2s1 2 3 2v5H5v-5c2 0 3-0.8 3-2s-1-2-3-2V9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="miter" />
      <path d="M16 11v3M16 16v1M16 19v2" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="square" />
    </ParanoidIcon>
  );
}

export function ParanoidProfileIcon({ active = false, className }: ParanoidIconProps) {
  return (
    <ParanoidIcon active={active} className={className}>
      <path d="m16 5 5 3v7l-5 3-5-3V8l5-3Z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="miter" />
      {active && <path d="M8 27v-3.5c0-3.5 3.2-5.5 8-5.5s8 2 8 5.5V27H8Z" fill="currentColor" opacity="0.18" />}
      <path d="M7 27v-3.5c0-3.7 3.6-5.7 9-5.7s9 2 9 5.7V27M5 27h22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
    </ParanoidIcon>
  );
}

export function ParanoidBackIcon({ className }: ParanoidIconProps) {
  return <ParanoidIcon className={className}><path d="M25 16H7M13 9l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" /></ParanoidIcon>;
}

export function ParanoidCloseIcon({ className }: ParanoidIconProps) {
  return <ParanoidIcon className={className}><path d="M8 8l16 16M24 8 8 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" /></ParanoidIcon>;
}

export function ParanoidBookmarkIcon({ active = false, className }: ParanoidIconProps) {
  return <ParanoidIcon active={active} className={className}><path d="M9 5h14v22l-7-4-7 4V5Z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="miter" /></ParanoidIcon>;
}
