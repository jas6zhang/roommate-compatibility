'use client';

import { setTheme, useTheme } from '@/lib/browser';

/**
 * Dark mode is a selected palette, not an inverted one — the toggle only flips
 * which set of validated tokens is active.
 */
export function ThemeToggle() {
  const theme = useTheme();
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={label}
      title={label}
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        {theme === 'dark' ? (
          <path
            d="M16 11.5A6.5 6.5 0 018.5 4a6.5 6.5 0 107.5 7.5z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        ) : (
          <>
            <circle cx="10" cy="10" r="3.6" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M15.7 4.3l-1.4 1.4M5.7 14.3l-1.4 1.4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </button>
  );
}
