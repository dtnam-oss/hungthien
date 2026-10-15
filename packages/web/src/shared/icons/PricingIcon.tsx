import type { SVGProps } from 'react';

export function PricingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 2 L21 7 V13 L12 22 L3 13 V7 Z" />
      <circle cx="12" cy="9" r="2" />
      <path d="M10 14h4M11 17h2" />
    </svg>
  );
}
