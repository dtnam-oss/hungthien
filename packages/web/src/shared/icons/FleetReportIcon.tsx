import type { SVGProps } from 'react';

export function FleetReportIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z" />
      <path d="M12 12l4-6" />
      <circle cx="12" cy="12" r="1.5" />
      <path d="M6 18h12" />
    </svg>
  );
}
