import type { SVGProps } from 'react';

export function FuelPumpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="4" y="4" width="10" height="16" rx="1.5" />
      <rect x="6" y="7" width="6" height="4" rx="1" />
      <path d="M14 10h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V9l-2-2" />
    </svg>
  );
}
