import type { SVGProps } from 'react';

export function EmployeeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <circle cx="12" cy="10" r="3" />
      <path d="M8 17c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5" />
      <path d="M10 3v2h4V3" />
    </svg>
  );
}
