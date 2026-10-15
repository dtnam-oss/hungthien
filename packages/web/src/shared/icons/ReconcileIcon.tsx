import type { SVGProps } from 'react';

export function ReconcileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 3v18" />
      <path d="M5 7l7-4 7 4" />
      <path d="M3 13l4-6 4 6H3z" />
      <path d="M13 13l4-6 4 6h-8z" />
      <path d="M8 21h8" />
    </svg>
  );
}
