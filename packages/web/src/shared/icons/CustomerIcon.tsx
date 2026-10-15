import type { SVGProps } from 'react';

export function CustomerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="6" width="12" height="15" rx="1.5" />
      <path d="M7 10h4M7 14h4" />
      <path d="M18 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 12c-2.5 0-4 1.5-4 3v2h8v-2c0-1.5-1.5-3-4-3z" />
    </svg>
  );
}
