import type { SVGProps } from 'react';

export function ReportPnlIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="7" rx="0.5" />
      <rect x="12" y="8" width="3" height="11" rx="0.5" />
      <rect x="17" y="5" width="3" height="14" rx="0.5" />
    </svg>
  );
}
