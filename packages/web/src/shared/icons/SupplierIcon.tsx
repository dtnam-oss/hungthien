import type { SVGProps } from 'react';

export function SupplierIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M3 21V8l9-5 9 5v13" />
      <path d="M3 21h18" />
      <rect x="7" y="11" width="4" height="4" rx="0.5" />
      <rect x="13" y="11" width="4" height="4" rx="0.5" />
      <rect x="7" y="16" width="4" height="5" rx="0.5" />
      <rect x="13" y="16" width="4" height="5" rx="0.5" />
    </svg>
  );
}
