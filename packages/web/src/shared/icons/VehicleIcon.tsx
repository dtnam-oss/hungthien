import type { SVGProps } from 'react';

export function VehicleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M3 7h10v9H3z" />
      <path d="M13 10h4l3 3v3h-7v-6z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
      <path d="M5 16h-2v-9" />
      <path d="M9 16h4" />
      <path d="M15 16h0" />
    </svg>
  );
}
