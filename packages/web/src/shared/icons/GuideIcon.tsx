import type { SVGProps } from 'react';

export function GuideIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 4h6a2 2 0 0 1 2 2v14a1 1 0 0 0-1-1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M20 4h-6a2 2 0 0 0-2 2v14a1 1 0 0 1 1-1h7a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z" />
    </svg>
  );
}
