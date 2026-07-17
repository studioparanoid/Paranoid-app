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
    <ParanoidIcon active={active} className={className} viewBox="0 0 32 38">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M4 3h16.2C26.6 3 30 6.7 30 12.3c0 5.8-4.1 9.7-10.7 9.7H14v9.3l3.2 3.7H4l4-3.7V6.7L4 3Zm10 4.7v9.7h4.4c3.5 0 5.4-1.8 5.4-4.9 0-3.2-1.9-4.8-5.5-4.8H14Z"
        opacity={active ? 1 : 0.78}
      />
      <path d="M4 3h20" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 35h12" stroke="currentColor" strokeWidth="1.4" />
      {active && <path d="M21 25.5 27 34" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />}
    </ParanoidIcon>
  );
}

export function ParanoidHomeIcon({ active = false, className }: ParanoidIconProps) {
  return (
    <ParanoidIcon active={active} className={className}>
      {active && <path d="M10 27V15c0-4.4 2.3-7 6-7s6 2.6 6 7v12H10Z" fill="currentColor" opacity="0.16" />}
      <path d="M6 27V14C6 7.8 10.2 4 16 4s10 3.8 10 10v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
      <path d="M10 27V15c0-4.4 2.3-7 6-7s6 2.6 6 7v12M4 27h24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
      {active && <path d="M13 27v-6h6v6" fill="currentColor" />}
    </ParanoidIcon>
  );
}

export function ParanoidMapIcon({ active = false, className }: ParanoidIconProps) {
  return (
    <ParanoidIcon active={active} className={className}>
      <path d="M13 4.5A12 12 0 0 0 4.5 13M19 4.5A12 12 0 0 1 27.5 13M27.5 19A12 12 0 0 1 19 27.5M13 27.5A12 12 0 0 1 4.5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
      <path d="M16 2v6M16 24v6M2 16h6M24 16h6" stroke="currentColor" strokeWidth="1.6" />
      <path d="m16 11 5 5-5 5-5-5 5-5Z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
    </ParanoidIcon>
  );
}

export function ParanoidTicketIcon({ active = false, className }: ParanoidIconProps) {
  return (
    <ParanoidIcon active={active} className={className}>
      {active && <path d="M8 7h16v5l-3 4 3 4v5H8v-5l3-4-3-4V7Z" fill="currentColor" opacity="0.16" />}
      <path d="M8 7h16v5l-3 4 3 4v5H8v-5l3-4-3-4V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="miter" />
      <path d="M16 9v4M16 15v2M16 19v4" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="square" />
      {active && <path d="M11 10h2v12h-2z" fill="currentColor" />}
    </ParanoidIcon>
  );
}

export function ParanoidProfileIcon({ active = false, className }: ParanoidIconProps) {
  return (
    <ParanoidIcon active={active} className={className}>
      <path d="m16 5 5 3v6l-5 3-5-3V8l5-3Z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      {active && <path d="m8 27 2-6 6-2 6 2 2 6H8Z" fill="currentColor" opacity="0.18" />}
      <path d="M5 27h22l-2.4-7-5.1-2M12.5 18 7.4 20 5 27" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
      <path d="M7 8V5h4M21 5h4v3M25 24v3h-4M11 27H7v-3" stroke="currentColor" strokeWidth="1.4" />
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
