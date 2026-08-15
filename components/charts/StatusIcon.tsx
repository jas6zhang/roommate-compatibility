import { BandTone } from '@/lib/scoring';

export const TONE_COLOR: Record<BandTone, string> = {
  good: 'var(--status-good)',
  warning: 'var(--status-warning)',
  serious: 'var(--status-serious)',
  critical: 'var(--status-critical)',
};

/**
 * Status colour never carries meaning on its own — every use of a status hue in
 * this app is paired with this glyph and a text label.
 */
export function StatusIcon({ tone, size = 18 }: { tone: BandTone; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: TONE_COLOR[tone],
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  };

  if (tone === 'good') {
    return (
      <svg {...common}>
        <circle cx="10" cy="10" r="8" />
        <path d="M6.5 10.3l2.4 2.4 4.6-5" />
      </svg>
    );
  }

  if (tone === 'warning') {
    return (
      <svg {...common}>
        <circle cx="10" cy="10" r="8" />
        <path d="M10 6v5" />
        <path d="M10 14h.01" />
      </svg>
    );
  }

  if (tone === 'serious') {
    return (
      <svg {...common}>
        <path d="M10 2.8l7.2 12.5H2.8L10 2.8z" />
        <path d="M10 8v3.2" />
        <path d="M10 13.6h.01" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="10" cy="10" r="8" />
      <path d="M7 7l6 6" />
      <path d="M13 7l-6 6" />
    </svg>
  );
}
